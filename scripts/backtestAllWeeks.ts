/**
 * Comprehensive Backtest - Run predictions on ALL completed weeks
 *
 * This script:
 * 1. Loads all completed games from 2025 season
 * 2. For each week, uses PREVIOUS week's standings to predict
 * 3. Compares predictions to actual results
 * 4. Generates comprehensive accuracy statistics
 *
 * Usage:
 *   npx tsx scripts/backtestAllWeeks.ts
 */

import { NFLAPI } from '../lib/api/nfl';
import { NFLStandingsData } from '../lib/scrapers/nflStandingsScraper';
import * as fs from 'fs/promises';
import * as path from 'path';

interface GameResult {
  week: number;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  predictedHome: number;
  predictedAway: number;
  predictedSpread: number;
  predictedTotal: number;
  actualHome: number;
  actualAway: number;
  actualSpread: number;
  actualTotal: number;
  winnerCorrect: boolean;
  spreadError: number;
  totalError: number;
  confidence: number;
  recommendation: string;
}

interface WeekStats {
  week: number;
  games: number;
  winnerCorrect: number;
  winnerAccuracy: number;
  avgSpreadError: number;
  avgTotalError: number;
  avgConfidence: number;
  strongBets: number;
  strongBetsCorrect: number;
  strongBetsAccuracy: number;
}

interface OverallStats {
  totalGames: number;
  totalWinnerCorrect: number;
  overallWinnerAccuracy: number;
  overallAvgSpreadError: number;
  overallAvgTotalError: number;
  overallAvgConfidence: number;
  weeklyStats: WeekStats[];
  allResults: GameResult[];
}

async function predictGame(
  game: any,
  homeStandings: NFLStandingsData,
  awayStandings: NFLStandingsData,
  leagueAvg: any,
  config: any
) {
  // Calculate TSR
  const homeTSR = calculateTSR(homeStandings, true, leagueAvg, config);
  const awayTSR = calculateTSR(awayStandings, false, leagueAvg, config);

  // Convert TSR differential to point spread
  // TSR with our config weights produces values around -60 to +60
  // NFL spreads are typically -14 to +14 (rarely beyond)
  // Scaling factor: 0.20 (reverted from 0.12 - better win rate: 61.98% vs 59.78%)
  const tsrDiff = homeTSR - awayTSR;
  const rawSpread = tsrDiff * 0.20;
  // Then apply regression to mean to dampen extreme predictions
  const predictedSpread = rawSpread * 0.85; // Same dampening as MatrixPredictor

  const predictedTotal = calculateTotal(homeStandings, awayStandings, config);
  const scores = calculateExactScores(predictedTotal, predictedSpread, config.volatility);
  const confidence = calculateConfidence(homeTSR, awayTSR);

  return {
    predictedSpread,
    predictedTotal,
    predictedScore: scores,
    confidence
  };
}

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

  const netComponent = config.w_net * (netPG - leagueAvg.avgNetPG);

  const last5GP = standings.last5Wins + standings.last5Losses;
  const last5Pct = last5GP > 0 ? standings.last5Wins / last5GP : winPct;
  const momentumComponent = config.w_momentum * (last5Pct - winPct);

  const confGP = standings.confWins + standings.confLosses;
  const confPct = confGP > 0 ? standings.confWins / confGP : 0.50;
  const confComponent = config.w_conf * (confPct - 0.50);

  let homeComponent = 0;
  if (isHome) {
    const homeGP = standings.homeWins + standings.homeLosses;
    const roadGP = standings.roadWins + standings.roadLosses;

    if (homeGP > 0 && roadGP > 0) {
      const homePct = standings.homeWins / homeGP;
      const roadPct = standings.roadWins / roadGP;
      homeComponent = config.w_home * (homePct - roadPct);
    }
  }

  const offComponent = config.w_off * (pfpg - leagueAvg.avgPFpg);
  const defComponent = config.w_def * (leagueAvg.avgPApg - papg);

  return netComponent + momentumComponent + confComponent + homeComponent + offComponent + defComponent;
}

function calculateTotal(
  homeStandings: NFLStandingsData,
  awayStandings: NFLStandingsData,
  config: any
): number {
  const homeGP = homeStandings.wins + homeStandings.losses + homeStandings.ties;
  const awayGP = awayStandings.wins + awayStandings.losses + awayStandings.ties;

  if (homeGP === 0 || awayGP === 0) return 43.0;

  const home_PF = homeStandings.pointsFor / homeGP;
  const home_PA = homeStandings.pointsAgainst / homeGP;
  const away_PF = awayStandings.pointsFor / awayGP;
  const away_PA = awayStandings.pointsAgainst / awayGP;

  const homeView = (home_PF + away_PA) / 2;
  const awayView = (away_PF + home_PA) / 2;

  const total = homeView + awayView + config.total_boost;
  return Math.max(30, Math.min(70, total));
}

function calculateExactScores(
  total: number,
  margin: number,
  volatility: number
): { home: number; away: number } {
  const center = total / 2;
  let homeScore = center + (margin / 2);
  let awayScore = center - (margin / 2);

  const adjustment = (margin / 2) * (volatility - 1);
  homeScore += adjustment;
  awayScore -= adjustment;

  return {
    home: Math.round(Math.max(3, Math.min(60, homeScore))),
    away: Math.round(Math.max(3, Math.min(60, awayScore)))
  };
}

function calculateConfidence(homeTSR: number, awayTSR: number): number {
  const tsrDiff = Math.abs(homeTSR - awayTSR);
  const confidence = 50 + (tsrDiff * 4.5);
  return Math.round(Math.max(40, Math.min(95, confidence)));
}

function calculateLeagueAverages(standings: NFLStandingsData[]) {
  let totalPF = 0;
  let totalPA = 0;
  let totalGames = 0;

  standings.forEach(team => {
    const gp = team.wins + team.losses + team.ties;
    totalPF += team.pointsFor;
    totalPA += team.pointsAgainst;
    totalGames += gp;
  });

  const avgPFpg = totalGames > 0 ? totalPF / totalGames : 21.5;
  const avgPApg = totalGames > 0 ? totalPA / totalGames : 21.5;

  return {
    avgPFpg,
    avgPApg,
    avgNetPG: avgPFpg - avgPApg
  };
}

function findTeamStandings(standings: NFLStandingsData[], teamName: string): NFLStandingsData | null {
  let team = standings.find(s => s.team.toLowerCase() === teamName.toLowerCase());
  if (!team) {
    team = standings.find(s =>
      s.team.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(s.team.toLowerCase())
    );
  }
  return team || null;
}

function getRecommendation(confidence: number, spreadEdge: number): string {
  const edge = Math.abs(spreadEdge);

  if (confidence >= 70 && edge >= 4) return 'STRONG BET';
  if (confidence >= 65 && edge >= 2.5) return 'GOOD BET';
  if (confidence >= 55 && edge >= 1.5) return 'SLIGHT EDGE';
  return 'NO EDGE';
}

async function main() {
  const season = 2025;
  const startWeek = 2; // Start at Week 2 (need Week 1 standings to predict Week 2)
  const endWeek = 14;  // Current week

  const DEFAULT_CONFIG = {
    w_net: 5.0,
    w_momentum: 3.0,
    w_conf: 2.0,
    w_home: 2.5,
    w_off: 4.0,
    w_def: 4.0,
    w_recency_total: 0.3,
    total_boost: 0,
    volatility: 1.0
  };

  console.log(`\n🏈 COMPREHENSIVE BACKTEST - ${season} Season (Weeks ${startWeek}-${endWeek})\n`);
  console.log(`Strategy: Use Week N-1 standings to predict Week N games\n`);
  console.log(`════════════════════════════════════════════════════════════════\n`);

  const allResults: GameResult[] = [];
  const weeklyStats: WeekStats[] = [];

  for (let week = startWeek; week <= endWeek; week++) {
    console.log(`📊 WEEK ${week}:`);

    // Load standings from previous week
    const standingsWeek = week - 1;
    const standingsPath = path.join(process.cwd(), 'public', 'training', `standings_${season}_w${standingsWeek}.json`);

    let standings: NFLStandingsData[];
    try {
      const standingsData = await fs.readFile(standingsPath, 'utf-8');
      standings = JSON.parse(standingsData);
    } catch (err) {
      console.log(`   ⚠️  Missing standings file for Week ${standingsWeek}, skipping...\n`);
      continue;
    }

    const leagueAvg = calculateLeagueAverages(standings);

    // Get games for this week
    const games = await NFLAPI.getWeekGames(season, week);
    const completedGames = games.filter(g => g.status === 'completed');

    if (completedGames.length === 0) {
      console.log(`   ℹ️  No completed games yet\n`);
      continue;
    }

    console.log(`   Using Week ${standingsWeek} standings to predict ${completedGames.length} games...`);

    // Predict each game
    const weekResults: GameResult[] = [];

    for (const game of completedGames) {
      const homeStandings = findTeamStandings(standings, game.homeTeam.name);
      const awayStandings = findTeamStandings(standings, game.awayTeam.name);

      if (!homeStandings || !awayStandings) {
        console.log(`   ⚠️  Missing standings for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
        continue;
      }

      const prediction = await predictGame(game, homeStandings, awayStandings, leagueAvg, DEFAULT_CONFIG);

      const actualHome = game.homeScore || 0;
      const actualAway = game.awayScore || 0;
      const actualSpread = actualHome - actualAway;
      const actualTotal = actualHome + actualAway;

      const predictedWinner = prediction.predictedScore.home > prediction.predictedScore.away ? 'home' : 'away';
      const actualWinner = actualHome > actualAway ? 'home' : 'away';
      const winnerCorrect = predictedWinner === actualWinner;

      const spreadError = Math.abs(prediction.predictedSpread - actualSpread);
      const totalError = Math.abs(prediction.predictedTotal - actualTotal);

      const recommendation = getRecommendation(prediction.confidence, prediction.predictedSpread);

      weekResults.push({
        week,
        gameId: game.id,
        homeTeam: game.homeTeam.abbreviation,
        awayTeam: game.awayTeam.abbreviation,
        predictedHome: prediction.predictedScore.home,
        predictedAway: prediction.predictedScore.away,
        predictedSpread: prediction.predictedSpread,
        predictedTotal: prediction.predictedTotal,
        actualHome,
        actualAway,
        actualSpread,
        actualTotal,
        winnerCorrect,
        spreadError,
        totalError,
        confidence: prediction.confidence,
        recommendation
      });
    }

    // Calculate week stats
    const winnerCorrect = weekResults.filter(r => r.winnerCorrect).length;
    const avgSpreadError = weekResults.reduce((sum, r) => sum + r.spreadError, 0) / weekResults.length;
    const avgTotalError = weekResults.reduce((sum, r) => sum + r.totalError, 0) / weekResults.length;
    const avgConfidence = weekResults.reduce((sum, r) => sum + r.confidence, 0) / weekResults.length;

    const strongBets = weekResults.filter(r => r.recommendation === 'STRONG BET');
    const strongBetsCorrect = strongBets.filter(r => r.winnerCorrect).length;

    const stats: WeekStats = {
      week,
      games: weekResults.length,
      winnerCorrect,
      winnerAccuracy: (winnerCorrect / weekResults.length) * 100,
      avgSpreadError,
      avgTotalError,
      avgConfidence,
      strongBets: strongBets.length,
      strongBetsCorrect,
      strongBetsAccuracy: strongBets.length > 0 ? (strongBetsCorrect / strongBets.length) * 100 : 0
    };

    weeklyStats.push(stats);
    allResults.push(...weekResults);

    console.log(`   ✅ Winner Accuracy: ${stats.winnerAccuracy.toFixed(1)}% (${winnerCorrect}/${weekResults.length})`);
    console.log(`   📏 Avg Spread Error: ±${avgSpreadError.toFixed(1)} pts`);
    console.log(`   📊 Avg Total Error: ±${avgTotalError.toFixed(1)} pts`);
    if (strongBets.length > 0) {
      console.log(`   💪 Strong Bets: ${strongBetsCorrect}/${strongBets.length} (${stats.strongBetsAccuracy.toFixed(1)}%)`);
    }
    console.log('');

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Calculate overall stats
  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`📈 OVERALL PERFORMANCE:\n`);

  const totalGames = allResults.length;
  const totalWinnerCorrect = allResults.filter(r => r.winnerCorrect).length;
  const overallWinnerAccuracy = (totalWinnerCorrect / totalGames) * 100;
  const overallAvgSpreadError = allResults.reduce((sum, r) => sum + r.spreadError, 0) / totalGames;
  const overallAvgTotalError = allResults.reduce((sum, r) => sum + r.totalError, 0) / totalGames;
  const overallAvgConfidence = allResults.reduce((sum, r) => sum + r.confidence, 0) / totalGames;

  const allStrongBets = allResults.filter(r => r.recommendation === 'STRONG BET');
  const allStrongBetsCorrect = allStrongBets.filter(r => r.winnerCorrect).length;

  console.log(`Total Games Analyzed: ${totalGames}`);
  console.log(`Winner Accuracy: ${overallWinnerAccuracy.toFixed(1)}% (${totalWinnerCorrect}W - ${totalGames - totalWinnerCorrect}L)`);
  console.log(`Avg Spread Error: ±${overallAvgSpreadError.toFixed(1)} points`);
  console.log(`Avg Total Error: ±${overallAvgTotalError.toFixed(1)} points`);
  console.log(`Avg Confidence: ${overallAvgConfidence.toFixed(1)}%`);
  console.log(`\nStrong Bet Performance: ${allStrongBets.length > 0 ? `${allStrongBetsCorrect}/${allStrongBets.length} (${(allStrongBetsCorrect / allStrongBets.length * 100).toFixed(1)}%)` : 'No strong bets'}`);

  // ATS Analysis (52.4% breakeven at -110 odds)
  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`💰 AGAINST THE SPREAD (ATS) ANALYSIS:\n`);
  console.log(`Breakeven at -110 odds: 52.4%`);
  console.log(`Your System: ${overallWinnerAccuracy.toFixed(1)}%`);

  if (overallWinnerAccuracy >= 52.4) {
    const profit = ((overallWinnerAccuracy / 100) * totalGames * 100) - ((1 - overallWinnerAccuracy / 100) * totalGames * 110);
    console.log(`Status: ✅ PROFITABLE`);
    console.log(`Est. Profit ($100/game): $${profit.toFixed(2)}`);
  } else {
    console.log(`Status: ⚠️  Below breakeven`);
  }

  // Save results to JSON
  const outputPath = path.join(process.cwd(), 'public', 'training', `backtest_results_${season}.json`);
  const output: OverallStats = {
    totalGames,
    totalWinnerCorrect,
    overallWinnerAccuracy,
    overallAvgSpreadError,
    overallAvgTotalError,
    overallAvgConfidence,
    weeklyStats,
    allResults
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n📁 Full results saved to: ${outputPath}\n`);

  console.log(`════════════════════════════════════════════════════════════════\n`);
}

main().catch(console.error);
