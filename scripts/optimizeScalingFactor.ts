/**
 * Optimize TSR Scaling Factor with Proper Validation
 *
 * This script uses proper train/validation/test splits to find the optimal
 * scaling factor for converting TSR differential to point spreads.
 *
 * Split:
 * - Train: Weeks 1-10 (70%)
 * - Validation: Weeks 11-12 (15%) - tune scaling factor here
 * - Test: Weeks 13-14 (15%) - final evaluation ONCE
 */

import { StandingsCacheService } from '@/lib/firebase/standingsCache';
import { getPreset } from '@/lib/models/matrixPresets';
import type { NFLStandingsData } from '@/lib/scrapers/nflStandingsScraper';
import * as fs from 'fs';
import * as path from 'path';

interface GameResult {
  gameId: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  actualSpread: number; // homeScore - awayScore
}

interface PredictionResult {
  game: GameResult;
  predictedSpread: number;
  spreadError: number;
  scalingFactor: number;
}

interface ValidationResults {
  scalingFactor: number;
  avgSpreadError: number;
  predictions: PredictionResult[];
}

// Calculate league averages from standings
function calculateLeagueAverages(standings: NFLStandingsData[]): any {
  let totalPF = 0;
  let totalPA = 0;
  let totalGames = 0;

  standings.forEach(team => {
    const gp = team.wins + team.losses + team.ties;
    totalPF += team.pointsFor;
    totalPA += team.pointsAgainst;
    totalGames += gp;
  });

  const avgPFpg = totalGames > 0 ? totalPF / totalGames : 0;
  const avgPApg = totalGames > 0 ? totalPA / totalGames : 0;

  return {
    avgPFpg,
    avgPApg,
    avgNetPG: avgPFpg - avgPApg
  };
}

// Map abbreviations to full team names
const TEAM_ABBR_MAP: Record<string, string> = {
  'ARI': 'Arizona Cardinals',
  'ATL': 'Atlanta Falcons',
  'BAL': 'Baltimore Ravens',
  'BUF': 'Buffalo Bills',
  'CAR': 'Carolina Panthers',
  'CHI': 'Chicago Bears',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'DAL': 'Dallas Cowboys',
  'DEN': 'Denver Broncos',
  'DET': 'Detroit Lions',
  'GB': 'Green Bay Packers',
  'HOU': 'Houston Texans',
  'IND': 'Indianapolis Colts',
  'JAX': 'Jacksonville Jaguars',
  'KC': 'Kansas City Chiefs',
  'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams',
  'LV': 'Las Vegas Raiders',
  'MIA': 'Miami Dolphins',
  'MIN': 'Minnesota Vikings',
  'NE': 'New England Patriots',
  'NO': 'New Orleans Saints',
  'NYG': 'New York Giants',
  'NYJ': 'New York Jets',
  'PHI': 'Philadelphia Eagles',
  'PIT': 'Pittsburgh Steelers',
  'SEA': 'Seattle Seahawks',
  'SF': 'San Francisco 49ers',
  'TB': 'Tampa Bay Buccaneers',
  'TEN': 'Tennessee Titans',
  'WSH': 'Washington Commanders'
};

// Calculate TSR for a team
function calculateTSR(
  standings: NFLStandingsData,
  isHome: boolean,
  leagueAvg: any,
  config: any
): number {
  const gp = standings.wins + standings.losses + standings.ties;
  if (gp === 0) return 0;

  const pfpg = standings.pointsFor / gp;
  const papg = standings.pointsAgainst / gp;
  const netPG = pfpg - papg;
  const winPct = standings.wins / gp;

  const netPoints = config.w_net * (netPG - leagueAvg.avgNetPG);

  const last5GP = standings.last5Wins + standings.last5Losses;
  const last5Pct = last5GP > 0 ? standings.last5Wins / last5GP : winPct;
  const momentum = config.w_momentum * (last5Pct - winPct);

  const confGP = standings.confWins + standings.confLosses;
  const confPct = confGP > 0 ? standings.confWins / confGP : 0.50;
  const conference = config.w_conf * (confPct - 0.50);

  let homeAdvantage = 0;
  const homeGP = standings.homeWins + standings.homeLosses;
  const roadGP = standings.roadWins + standings.roadLosses;
  if (homeGP > 0 && roadGP > 0) {
    const homePct = standings.homeWins / homeGP;
    const roadPct = standings.roadWins / roadGP;
    const homeEdgeRaw = homePct - roadPct;
    homeAdvantage = config.w_home * homeEdgeRaw;
  }

  const offensive = config.w_off * (pfpg - leagueAvg.avgPFpg);
  const defensive = config.w_def * (leagueAvg.avgPApg - papg);

  const tsr = netPoints + momentum + conference + homeAdvantage + offensive + defensive;
  return tsr;
}

// Predict game spread with given scaling factor
async function predictGameSpread(
  game: GameResult,
  season: number,
  scalingFactor: number,
  regressionFactor: number,
  config: any
): Promise<number> {
  // Convert abbreviations to full team names
  const homeTeamName = TEAM_ABBR_MAP[game.homeTeam] || game.homeTeam;
  const awayTeamName = TEAM_ABBR_MAP[game.awayTeam] || game.awayTeam;

  // Get standings for the week before the game using the service
  const homeStandings = await StandingsCacheService.getTeamStandings(season, game.week, homeTeamName);
  const awayStandings = await StandingsCacheService.getTeamStandings(season, game.week, awayTeamName);

  if (!homeStandings) {
    throw new Error(`Could not find standings for ${homeTeamName} (${game.homeTeam}) in ${season} week ${game.week}`);
  }
  if (!awayStandings) {
    throw new Error(`Could not find standings for ${awayTeamName} (${game.awayTeam}) in ${season} week ${game.week}`);
  }

  // Get all standings to calculate league averages
  const allStandings = await StandingsCacheService.getStandings(season, game.week);
  if (!allStandings || allStandings.length === 0) {
    throw new Error(`No standings data for ${season} week ${game.week}`);
  }

  // Calculate league averages
  const leagueAvg = calculateLeagueAverages(allStandings);

  // Calculate TSR
  const homeTSR = calculateTSR(homeStandings, true, leagueAvg, config);
  const awayTSR = calculateTSR(awayStandings, false, leagueAvg, config);

  // Convert TSR differential to point spread
  const tsrDiff = homeTSR - awayTSR;
  const rawSpread = tsrDiff * scalingFactor;
  const predictedSpread = rawSpread * regressionFactor;

  return predictedSpread;
}

// Load game results from backtest file
function loadGameResults(): GameResult[] {
  const filePath = path.join(process.cwd(), 'public', 'training', 'backtest_results_2025.json');

  if (!fs.existsSync(filePath)) {
    throw new Error('Backtest results file not found. Run backtestAllWeeks.ts first.');
  }

  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(fileContents);

  const games: GameResult[] = [];

  for (const game of data.allResults) {
    games.push({
      gameId: game.gameId,
      week: game.week,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: game.actualHome,
      awayScore: game.actualAway,
      actualSpread: game.actualSpread
    });
  }

  return games;
}

// Split games into train/validation/test sets
function splitData(games: GameResult[]): {
  train: GameResult[];
  validation: GameResult[];
  test: GameResult[];
} {
  const train = games.filter(g => g.week <= 10);
  const validation = games.filter(g => g.week === 11 || g.week === 12);
  const test = games.filter(g => g.week === 13 || g.week === 14);

  console.log(`\n📊 Data Split:`);
  console.log(`   Train: ${train.length} games (weeks 1-10)`);
  console.log(`   Validation: ${validation.length} games (weeks 11-12)`);
  console.log(`   Test: ${test.length} games (weeks 13-14)`);

  return { train, validation, test };
}

// Evaluate scaling factor on a set of games
async function evaluateScalingFactor(
  games: GameResult[],
  season: number,
  scalingFactor: number,
  regressionFactor: number,
  config: any
): Promise<ValidationResults> {
  const predictions: PredictionResult[] = [];
  let totalSpreadError = 0;

  for (const game of games) {
    try {
      const predictedSpread = await predictGameSpread(game, season, scalingFactor, regressionFactor, config);
      const spreadError = Math.abs(predictedSpread - game.actualSpread);

      predictions.push({
        game,
        predictedSpread,
        spreadError,
        scalingFactor
      });

      totalSpreadError += spreadError;
    } catch (error: any) {
      console.warn(`⚠️  Skipping game ${game.gameId}: ${error.message}`);
    }
  }

  const avgSpreadError = predictions.length > 0 ? totalSpreadError / predictions.length : Infinity;

  return {
    scalingFactor,
    avgSpreadError,
    predictions
  };
}

// Main optimization function
async function optimizeScalingFactor() {
  console.log('🔧 TSR Scaling Factor Optimization with Proper Validation\n');
  console.log('=' .repeat(70));

  // Load game results
  console.log('\n📂 Loading game results...');
  const allGames = loadGameResults();
  console.log(`   ✅ Loaded ${allGames.length} games`);

  // Split data
  const { train, validation, test } = splitData(allGames);

  // Get configuration
  const config = getPreset('balanced');
  const regressionFactor = config.regression_factor;

  console.log(`\n⚙️  Configuration:`);
  console.log(`   TSR Preset: balanced`);
  console.log(`   Regression Factor: ${regressionFactor}`);

  // Grid search on validation set
  // Expanded range to test lower values as suggested by user
  const scalingFactors = [0.10, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.20];

  console.log(`\n🔍 Grid Search on Validation Set (Weeks 11-12):`);
  console.log('=' .repeat(70));

  const validationResults: ValidationResults[] = [];

  for (const factor of scalingFactors) {
    console.log(`\n   Testing scaling factor: ${factor}`);
    const results = await evaluateScalingFactor(validation, 2025, factor, regressionFactor, config);
    validationResults.push(results);
    console.log(`   ✅ Avg Spread Error: ±${results.avgSpreadError.toFixed(2)} points`);
  }

  // Find best scaling factor
  const bestValidation = validationResults.reduce((best, current) =>
    current.avgSpreadError < best.avgSpreadError ? current : best
  );

  console.log(`\n🏆 Best Scaling Factor on Validation Set:`);
  console.log('=' .repeat(70));
  console.log(`   Scaling Factor: ${bestValidation.scalingFactor}`);
  console.log(`   Validation Error: ±${bestValidation.avgSpreadError.toFixed(2)} points`);

  // Test on held-out test set (ONLY ONCE)
  console.log(`\n🧪 Final Test on Held-Out Test Set (Weeks 13-14):`);
  console.log('=' .repeat(70));

  const testResults = await evaluateScalingFactor(test, 2025, bestValidation.scalingFactor, regressionFactor, config);

  console.log(`\n📊 Final Test Results:`);
  console.log('=' .repeat(70));
  console.log(`   Scaling Factor: ${testResults.scalingFactor}`);
  console.log(`   Test Error: ±${testResults.avgSpreadError.toFixed(2)} points`);
  console.log(`   Games Evaluated: ${testResults.predictions.length}`);

  // Compare to current baseline (0.20 factor)
  const baselineResults = await evaluateScalingFactor(test, 2025, 0.20, regressionFactor, config);

  console.log(`\n📈 Improvement vs Baseline (0.20 factor):`);
  console.log('=' .repeat(70));
  console.log(`   Baseline Test Error: ±${baselineResults.avgSpreadError.toFixed(2)} points`);
  console.log(`   Optimized Test Error: ±${testResults.avgSpreadError.toFixed(2)} points`);
  console.log(`   Improvement: ${(baselineResults.avgSpreadError - testResults.avgSpreadError).toFixed(2)} points (${((1 - testResults.avgSpreadError / baselineResults.avgSpreadError) * 100).toFixed(1)}%)`);

  // Save results
  const outputPath = path.join(process.cwd(), 'public', 'training', 'scaling_optimization_results.json');
  const outputData = {
    metadata: {
      optimizedAt: new Date().toISOString(),
      preset: 'balanced',
      regressionFactor,
      totalGames: allGames.length,
      trainGames: train.length,
      validationGames: validation.length,
      testGames: test.length
    },
    gridSearch: {
      scalingFactorsTested: scalingFactors,
      validationResults: validationResults.map(r => ({
        scalingFactor: r.scalingFactor,
        avgSpreadError: r.avgSpreadError
      }))
    },
    bestScalingFactor: bestValidation.scalingFactor,
    validationError: bestValidation.avgSpreadError,
    testError: testResults.avgSpreadError,
    baselineError: baselineResults.avgSpreadError,
    improvement: baselineResults.avgSpreadError - testResults.avgSpreadError,
    improvementPercent: ((1 - testResults.avgSpreadError / baselineResults.avgSpreadError) * 100)
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);

  console.log(`\n✅ Optimization Complete!`);
  console.log(`\n💡 Next Steps:`);
  console.log(`   1. Update backtestAllWeeks.ts to use scaling factor: ${testResults.scalingFactor}`);
  console.log(`   2. Update MatrixPredictor if needed (currently uses 0.85 regression only)`);
  console.log(`   3. Consider testing other presets (offensive, defensive, momentum)`);
}

// Run optimization
optimizeScalingFactor().catch(console.error);
