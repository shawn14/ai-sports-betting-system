/**
 * Generate Predictions for Completed Games
 * Called by cron job to automatically create predictions and results
 */

import { NextRequest, NextResponse } from 'next/server';
import { upsertDocument } from '@/lib/firebase/restClient';
import { NFLAPI } from '@/lib/api/nfl';
import { NFLStandingsData } from '@/lib/scrapers/nflStandingsScraper';
import { MatrixConfig, LeagueAverages } from '@/lib/models/matrixPredictor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for processing

const DEFAULT_CONFIG: MatrixConfig = {
  w_net: 5.0,
  w_momentum: 3.0,
  w_conf: 2.0,
  w_home: 2.5,
  w_off: 4.0,
  w_def: 4.0,
  w_recency_total: 0.3,
  total_boost: 0,
  volatility: 1.0,
  regression_factor: 0.85
};

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  console.log('🎯 Generate predictions cron job triggered');

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();
    console.log(`📅 Processing: ${season} Week ${week}`);

    // Load standings data from JSON file
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'training', `standings_${season}_w${week}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: `Standings file not found: standings_${season}_w${week}.json`,
        message: 'Please create the standings file first before running predictions'
      }, { status: 404 });
    }

    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const standings: NFLStandingsData[] = JSON.parse(fileContents);
    console.log(`✅ Loaded standings: ${standings.length} teams`);

    // Calculate league averages
    const leagueAvg = calculateLeagueAverages(standings);

    // Fetch all games (both upcoming and completed)
    const games = await NFLAPI.getWeekGames(season, week);
    console.log(`✅ Found ${games.length} total games`);

    let predictionsCreated = 0;
    let resultsCreated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Fetch Vegas odds from ESPN for all games
    console.log('📊 Fetching Vegas odds from ESPN...');
    let vegasOddsMap = new Map<string, { spread: number; total: number }>();
    try {
      const oddsResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/odds`);
      if (oddsResponse.ok) {
        const oddsData = await oddsResponse.json();
        oddsData.forEach((game: any) => {
          if (game.gameId) {
            const spread = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads')
              ?.outcomes?.find((o: any) => o.name === game.home_team)?.point;
            const total = game.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'totals')
              ?.outcomes?.[0]?.point;

            if (spread !== undefined && total !== undefined) {
              vegasOddsMap.set(game.gameId, { spread, total });
            }
          }
        });
        console.log(`✅ Loaded Vegas odds for ${vegasOddsMap.size} games`);
      }
    } catch (error: any) {
      console.warn('⚠️  Could not fetch Vegas odds from ESPN:', error.message);
    }

    // Process each game (both upcoming and completed)
    for (const game of games) {
      try {
        // Find team standings
        const homeStandings = findTeamStandings(standings, game.homeTeam.name);
        const awayStandings = findTeamStandings(standings, game.awayTeam.name);

        if (!homeStandings || !awayStandings) {
          console.log(`⚠️  Missing standings for ${game.awayTeam.name} @ ${game.homeTeam.name}`);
          skipped++;
          continue;
        }

        // Calculate TSR
        const homeTSR = calculateTSR(homeStandings, true, leagueAvg, DEFAULT_CONFIG);
        const awayTSR = calculateTSR(awayStandings, false, leagueAvg, DEFAULT_CONFIG);

        // Calculate predictions
        const tsrDiff = homeTSR - awayTSR;
        const rawSpread = tsrDiff * 0.20;
        const predictedSpread = rawSpread * DEFAULT_CONFIG.regression_factor;
        const predictedTotal = calculateTotal(homeStandings, awayStandings, leagueAvg, DEFAULT_CONFIG);
        const scores = calculateExactScores(predictedTotal, predictedSpread, DEFAULT_CONFIG.volatility);
        const confidence = calculateConfidence(homeTSR, awayTSR);

        // Get Vegas odds for this game
        const vegasOdds = vegasOddsMap.get(game.id);

        // Save prediction to Firestore (including Vegas spreads)
        await upsertDocument('predictions', game.id, {
          gameId: game.id,
          season,
          week,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name,
          predictedScore: {
            home: scores.home,
            away: scores.away
          },
          predictedSpread,
          predictedTotal,
          predictedWinner: scores.home > scores.away ? 'home' : 'away',
          confidence,
          gameTime: game.gameTime.toISOString(),
          vegasSpread: vegasOdds?.spread || null,
          vegasTotal: vegasOdds?.total || null,
          timestamp: new Date().toISOString()
        });
        predictionsCreated++;

        // Only calculate results for completed games
        const isCompleted = game.status === 'completed' && game.homeScore !== null && game.awayScore !== null;
        if (isCompleted) {
          const actualHomeScore = game.homeScore!;
          const actualAwayScore = game.awayScore!;
          const actualSpread = actualHomeScore - actualAwayScore;
          const actualTotal = actualHomeScore + actualAwayScore;

          const actualWinner = actualHomeScore > actualAwayScore ? 'home' : 'away';
          const predictedWinner = scores.home > scores.away ? 'home' : 'away';
          const winnerCorrect = actualWinner === predictedWinner;

          const spreadError = Math.abs(predictedSpread - actualSpread);
          const spreadCovered = spreadError <= 7;

          const totalOver = actualTotal > predictedTotal;

          // Save result to Firestore
          await upsertDocument('results', game.id, {
            gameId: game.id,
            season,
            week,
            predictedHomeScore: scores.home,
            predictedAwayScore: scores.away,
            predictedSpread,
            predictedTotal,
            predictedWinner,
            actualHomeScore,
            actualAwayScore,
            actualSpread,
            actualTotal,
            actualWinner,
            winnerCorrect,
            spreadCovered,
            totalOver,
            spreadError,
            totalError: Math.abs(predictedTotal - actualTotal),
            confidence,
            game: {
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              gameTime: game.gameTime.toISOString(),
              venue: game.venue
            },
            timestamp: new Date().toISOString()
          });
          resultsCreated++;
        }

      } catch (gameError: any) {
        console.error(`❌ Error processing game ${game.id}:`, gameError.message);
        errors.push(`Game ${game.id}: ${gameError.message}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      season,
      week,
      summary: {
        totalGames: games.length,
        predictionsCreated,
        resultsCreated,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper functions (from backfillAllWeeks.ts)

function calculateLeagueAverages(standings: NFLStandingsData[]): LeagueAverages {
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

function calculateTSR(
  standings: NFLStandingsData,
  isHome: boolean,
  leagueAvg: LeagueAverages,
  config: MatrixConfig
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

  const tsr = netComponent + momentumComponent + confComponent + homeComponent + offComponent + defComponent;

  return tsr;
}

function calculateTotal(
  homeStandings: NFLStandingsData,
  awayStandings: NFLStandingsData,
  leagueAvg: LeagueAverages,
  config: MatrixConfig
): number {
  const homeGP = homeStandings.wins + homeStandings.losses + homeStandings.ties;
  const awayGP = awayStandings.wins + awayStandings.losses + awayStandings.ties;

  if (homeGP === 0 || awayGP === 0) return 45;

  const home_PF_ppg = homeStandings.pointsFor / homeGP;
  const home_PA_ppg = homeStandings.pointsAgainst / homeGP;
  const away_PF_ppg = awayStandings.pointsFor / awayGP;
  const away_PA_ppg = awayStandings.pointsAgainst / awayGP;

  const homeOffEff = home_PF_ppg / leagueAvg.avgPFpg;
  const homeDefEff = leagueAvg.avgPApg / home_PA_ppg;
  const awayOffEff = away_PF_ppg / leagueAvg.avgPFpg;
  const awayDefEff = leagueAvg.avgPApg / away_PA_ppg;

  const homeExpected = leagueAvg.avgPFpg * homeOffEff * (1 / awayDefEff);
  const awayExpected = leagueAvg.avgPFpg * awayOffEff * (1 / homeDefEff);

  const rawTotal = homeExpected + awayExpected;
  const dampenedTotal = rawTotal * 0.95;
  const finalTotal = dampenedTotal + config.total_boost;

  return Math.max(30, Math.min(70, finalTotal));
}

function calculateExactScores(
  total: number,
  margin: number,
  volatility: number
): { home: number; away: number } {
  const favoredScore = (total + Math.abs(margin)) / 2;
  const underdogScore = (total - Math.abs(margin)) / 2;

  const home = margin >= 0 ? Math.round(favoredScore) : Math.round(underdogScore);
  const away = margin >= 0 ? Math.round(underdogScore) : Math.round(favoredScore);

  return { home, away };
}

function calculateConfidence(homeTSR: number, awayTSR: number): number {
  const tsrGap = Math.abs(homeTSR - awayTSR);
  const rawConfidence = 50 + (tsrGap * 0.5);
  return Math.min(95, Math.max(50, rawConfidence));
}
