#!/usr/bin/env tsx

/**
 * Regenerate Backtest Results
 *
 * This script regenerates backtest_results_2025.json using:
 * 1. Actual 2025 season game results
 * 2. Week-by-week standings data
 * 3. Matrix TSR prediction algorithm
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface Standing {
  team: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  homeWins: number;
  homeLosses: number;
  roadWins: number;
  roadLosses: number;
  confWins: number;
  confLosses: number;
  last5Wins: number;
  last5Losses: number;
}

interface Game {
  gameId: string;
  season: number;
  week: number;
  homeTeam: {
    name: string;
  };
  awayTeam: {
    name: string;
  };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  vegasSpread: number | null;
}

interface MatrixConfig {
  w_net: number;
  w_momentum: number;
  w_conf: number;
  w_home: number;
  w_off: number;
  w_def: number;
  w_recency_total: number;
  total_boost: number;
  volatility: number;
}

const DEFAULT_CONFIG: MatrixConfig = {
  w_net: 0.5,
  w_momentum: 0.3,
  w_conf: 0.2,
  w_home: 0.25,
  w_off: 0.4,
  w_def: 0.4,
  w_recency_total: 0.3,
  total_boost: 0,
  volatility: 1.0
};

function calculateLeagueAverages(standings: Standing[]) {
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

function calculateTSR(
  standing: Standing,
  isHome: boolean,
  leagueAvg: { avgPFpg: number; avgPApg: number; avgNetPG: number },
  config: MatrixConfig
): number {
  const gp = standing.wins + standing.losses + standing.ties;
  if (gp === 0) return 0;

  const pfpg = standing.pointsFor / gp;
  const papg = standing.pointsAgainst / gp;
  const netPG = pfpg - papg;
  const winPct = standing.wins / gp;

  // 1. Net Point Performance
  const netComponent = config.w_net * (netPG - leagueAvg.avgNetPG);

  // 2. Momentum (Last 5 vs Season)
  const last5GP = standing.last5Wins + standing.last5Losses;
  const last5Pct = last5GP > 0 ? standing.last5Wins / last5GP : winPct;
  const momentumComponent = config.w_momentum * (last5Pct - winPct);

  // 3. Conference Strength
  const confGP = standing.confWins + standing.confLosses;
  const confPct = confGP > 0 ? standing.confWins / confGP : 0.50;
  const confComponent = config.w_conf * (confPct - 0.50);

  // 4. Home Field Advantage
  let homeComponent = 0;
  if (isHome) {
    const homeGP = standing.homeWins + standing.homeLosses;
    const roadGP = standing.roadWins + standing.roadLosses;

    if (homeGP > 0 && roadGP > 0) {
      const homePct = standing.homeWins / homeGP;
      const roadPct = standing.roadWins / roadGP;
      const homeEdgeRaw = homePct - roadPct;
      homeComponent = config.w_home * homeEdgeRaw;
    }
  }

  // 5. Offensive Strength
  const offComponent = config.w_off * (pfpg - leagueAvg.avgPFpg);

  // 6. Defensive Strength
  const defComponent = config.w_def * (leagueAvg.avgPApg - papg);

  return netComponent + momentumComponent + confComponent + homeComponent + offComponent + defComponent;
}

function calculateTotal(
  homeStanding: Standing,
  awayStanding: Standing,
  config: MatrixConfig
): number {
  const homeGP = homeStanding.wins + homeStanding.losses + homeStanding.ties;
  const awayGP = awayStanding.wins + awayStanding.losses + awayStanding.ties;

  const home_PF_season = homeGP > 0 ? homeStanding.pointsFor / homeGP : 20;
  const home_PA_season = homeGP > 0 ? homeStanding.pointsAgainst / homeGP : 20;
  const away_PF_season = awayGP > 0 ? awayStanding.pointsFor / awayGP : 20;
  const away_PA_season = awayGP > 0 ? awayStanding.pointsAgainst / awayGP : 20;

  const homeView = (home_PF_season + away_PA_season) / 2;
  const awayView = (away_PF_season + home_PA_season) / 2;

  const total = homeView + awayView + config.total_boost;

  return Math.max(30, Math.min(70, total));
}

function calculateExactScores(
  total: number,
  margin: number,
  volatility: number
): { home: number; away: number } {
  // Clamp margin to realistic NFL spread range (-30 to +30)
  const clampedMargin = Math.max(-30, Math.min(30, margin));

  const center = total / 2;

  let homeScore = center + (clampedMargin / 2);
  let awayScore = center - (clampedMargin / 2);

  const adjustment = (clampedMargin / 2) * (volatility - 1);
  homeScore += adjustment;
  awayScore -= adjustment;

  return {
    home: Math.round(Math.max(3, Math.min(60, homeScore))),
    away: Math.round(Math.max(3, Math.min(60, awayScore)))
  };
}

function calculateConfidence(homeTSR: number, awayTSR: number): number {
  const tsrDiff = Math.abs(homeTSR - awayTSR);
  return Math.round(Math.max(40, Math.min(95, 50 + tsrDiff * 5)));
}

function getRecommendation(confidence: number, spreadError?: number): string {
  if (confidence >= 70) return 'STRONG BET';
  if (confidence >= 65) return 'GOOD BET';
  if (confidence >= 55) return 'SLIGHT EDGE';
  return 'AVOID';
}

function findTeam(standings: Standing[], teamName: string): Standing | null {
  // Try exact match first
  let team = standings.find(s => s.team.toLowerCase() === teamName.toLowerCase());
  if (team) return team;

  // Try partial match
  team = standings.find(s =>
    teamName.toLowerCase().includes(s.team.toLowerCase()) ||
    s.team.toLowerCase().includes(teamName.toLowerCase())
  );

  return team || null;
}

async function main() {
  console.log('🔄 Regenerating backtest results...\n');

  const publicDir = path.join(process.cwd(), 'public', 'training');

  // Load game data
  console.log('📂 Loading game data...');
  const gamesData = JSON.parse(
    await fs.readFile(path.join(publicDir, 'nfl_training_data_2025_with_vegas.json'), 'utf-8')
  );

  const allGames: Game[] = gamesData.data.map((g: any) => ({
    gameId: g.gameId,
    season: g.season,
    week: g.week,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    homeScore: g.outcome?.homeScore || null,
    awayScore: g.outcome?.awayScore || null,
    status: g.outcome?.homeScore !== null && g.outcome?.homeScore !== undefined ? 'completed' : 'scheduled',
    vegasSpread: g.lines?.spread || null
  }));

  console.log(`✅ Loaded ${allGames.length} games\n`);

  const allResults: any[] = [];
  const weeklyStats: any[] = [];

  // Process weeks 2-14
  for (let week = 2; week <= 14; week++) {
    console.log(`📊 Processing Week ${week}...`);

    const weekGames = allGames.filter(g => g.week === week && g.status === 'completed');
    if (weekGames.length === 0) {
      console.log(`  ⚠️  No completed games for week ${week}\n`);
      continue;
    }

    // Load standings from previous week
    const standingsWeek = week - 1;
    let standings: Standing[];

    try {
      standings = JSON.parse(
        await fs.readFile(
          path.join(publicDir, `standings_2025_w${standingsWeek}.json`),
          'utf-8'
        )
      );
    } catch (err) {
      console.log(`  ⚠️  No standings for week ${standingsWeek}, skipping\n`);
      continue;
    }

    const leagueAvg = calculateLeagueAverages(standings);

    let weekCorrect = 0;
    let weekAtsCorrect = 0;
    let weekAtsGames = 0;
    let weekSpreadError = 0;
    let weekTotalError = 0;
    let weekConfidence = 0;
    let weekStrongBets = 0;
    let weekStrongBetsCorrect = 0;

    for (const game of weekGames) {
      const homeStanding = findTeam(standings, game.homeTeam.name);
      const awayStanding = findTeam(standings, game.awayTeam.name);

      if (!homeStanding || !awayStanding) {
        console.log(`  ⚠️  Missing standings for ${game.awayTeam.name} @ ${game.homeTeam.name}`);
        continue;
      }

      // Calculate TSRs
      const homeTSR = calculateTSR(homeStanding, true, leagueAvg, DEFAULT_CONFIG);
      const awayTSR = calculateTSR(awayStanding, false, leagueAvg, DEFAULT_CONFIG);

      // Convert TSR differential to point spread with scaling factor
      // Scaling factor: 0.20 (reverted from 0.12 - better win rate: 61.98% vs 59.78%)
      const tsrDiff = homeTSR - awayTSR;
      const rawSpread = tsrDiff * 0.20;
      const predictedSpread = rawSpread * 0.85;
      const predictedTotal = calculateTotal(homeStanding, awayStanding, DEFAULT_CONFIG);
      const scores = calculateExactScores(predictedTotal, predictedSpread, DEFAULT_CONFIG.volatility);
      const confidence = calculateConfidence(homeTSR, awayTSR);

      const actualSpread = (game.homeScore || 0) - (game.awayScore || 0);
      const actualTotal = (game.homeScore || 0) + (game.awayScore || 0);
      const spreadError = Math.abs(predictedSpread - actualSpread);
      const totalError = Math.abs(predictedTotal - actualTotal);

      const predictedWinner = scores.home > scores.away;
      const actualWinner = (game.homeScore || 0) > (game.awayScore || 0);
      const correct = predictedWinner === actualWinner;

      // ATS calculation: Did our prediction beat the Vegas spread?
      // If Vegas says Home -7, and actual is Home -8, Vegas covers (bettors lose)
      // We win ATS if our predicted spread is closer to actual than Vegas
      let atsCorrect = false;
      if (game.vegasSpread !== null) {
        // Our predicted spread vs Vegas spread vs actual spread
        // Example: Vegas = -7, Our prediction = -5, Actual = -6
        // Vegas error = |(-7) - (-6)| = 1
        // Our error = |(-5) - (-6)| = 1
        // Tie goes to us (we matched Vegas)
        const vegasError = Math.abs(game.vegasSpread - actualSpread);
        const ourError = Math.abs(predictedSpread - actualSpread);
        atsCorrect = ourError <= vegasError;
      }

      const recommendation = getRecommendation(confidence);

      allResults.push({
        week,
        gameId: game.gameId,
        homeTeam: game.homeTeam.name.split(' ').pop(), // Get team abbreviation
        awayTeam: game.awayTeam.name.split(' ').pop(),
        predictedHome: scores.home,
        predictedAway: scores.away,
        predictedSpread,
        predictedTotal,
        actualHome: game.homeScore,
        actualAway: game.awayScore,
        actualSpread,
        actualTotal,
        winnerCorrect: correct,
        atsCorrect: game.vegasSpread !== null ? atsCorrect : null,
        vegasSpread: game.vegasSpread,
        spreadError,
        totalError,
        confidence,
        recommendation
      });

      if (correct) weekCorrect++;
      if (game.vegasSpread !== null) {
        weekAtsGames++;
        if (atsCorrect) weekAtsCorrect++;
      }
      weekSpreadError += spreadError;
      weekTotalError += totalError;
      weekConfidence += confidence;

      if (recommendation === 'STRONG BET') {
        weekStrongBets++;
        if (correct) weekStrongBetsCorrect++;
      }
    }

    const weekGamesCount = weekGames.length;
    const weekAccuracy = (weekCorrect / weekGamesCount) * 100;
    const weekAtsAccuracy = weekAtsGames > 0 ? (weekAtsCorrect / weekAtsGames) * 100 : 0;

    weeklyStats.push({
      week,
      games: weekGamesCount,
      winnerCorrect: weekCorrect,
      winnerAccuracy: weekAccuracy,
      atsCorrect: weekAtsCorrect,
      atsGames: weekAtsGames,
      atsAccuracy: weekAtsAccuracy,
      avgSpreadError: weekSpreadError / weekGamesCount,
      avgTotalError: weekTotalError / weekGamesCount,
      avgConfidence: weekConfidence / weekGamesCount,
      strongBets: weekStrongBets,
      strongBetsCorrect: weekStrongBetsCorrect,
      strongBetsAccuracy: weekStrongBets > 0 ? (weekStrongBetsCorrect / weekStrongBets) * 100 : 0
    });

    console.log(`  ✅ Week ${week}: ${weekCorrect}/${weekGamesCount} (${weekAccuracy.toFixed(1)}%) - Spread Error: ±${(weekSpreadError / weekGamesCount).toFixed(1)}\n`);
  }

  // Calculate overall stats
  const totalGames = allResults.length;
  const totalCorrect = allResults.filter(r => r.winnerCorrect).length;
  const overallAccuracy = (totalCorrect / totalGames) * 100;

  const atsResults = allResults.filter(r => r.atsCorrect !== null);
  const totalAtsGames = atsResults.length;
  const totalAtsCorrect = atsResults.filter(r => r.atsCorrect).length;
  const overallAtsAccuracy = totalAtsGames > 0 ? (totalAtsCorrect / totalAtsGames) * 100 : 0;

  const overallSpreadError = allResults.reduce((sum, r) => sum + r.spreadError, 0) / totalGames;
  const overallTotalError = allResults.reduce((sum, r) => sum + r.totalError, 0) / totalGames;
  const overallConfidence = allResults.reduce((sum, r) => sum + r.confidence, 0) / totalGames;

  const output = {
    totalGames,
    totalWinnerCorrect: totalCorrect,
    overallWinnerAccuracy: overallAccuracy,
    totalAtsGames,
    totalAtsCorrect,
    overallAtsAccuracy,
    overallAvgSpreadError: overallSpreadError,
    overallAvgTotalError: overallTotalError,
    overallAvgConfidence: overallConfidence,
    weeklyStats,
    allResults
  };

  // Write to file
  const outputPath = path.join(publicDir, 'backtest_results_2025.json');
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

  console.log('\n✅ Backtest regeneration complete!\n');
  console.log(`📊 Overall Results:`);
  console.log(`   Games: ${totalGames}`);
  console.log(`   Winner Accuracy: ${overallAccuracy.toFixed(1)}% (${totalCorrect}-${totalGames - totalCorrect})`);
  console.log(`   ATS Accuracy: ${overallAtsAccuracy.toFixed(1)}% (${totalAtsCorrect}-${totalAtsGames - totalAtsCorrect})`);
  console.log(`   Avg Spread Error: ±${overallSpreadError.toFixed(1)} pts`);
  console.log(`   Avg Total Error: ±${overallTotalError.toFixed(1)} pts`);
  console.log(`\n💾 Saved to: ${outputPath}`);
}

main().catch(console.error);
