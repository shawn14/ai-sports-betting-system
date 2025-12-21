import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

interface BacktestGame {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeElo: number;
  awayElo: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number;
  actualAwayScore: number;
  vegasSpread?: number;
  vegasTotal?: number;
  atsResult?: 'win' | 'loss' | 'push';
}

interface SimulationResult {
  params: {
    spreadRegression: number;
    eloToPoints: number;
    homeFieldAdv: number;
    eloCap: number;
  };
  ats: { wins: number; losses: number; pushes: number; winPct: number };
  ou: { wins: number; losses: number; pushes: number; winPct: number };
  totalGames: number;
}

const LEAGUE_AVG_PPG = 22;

function predictWithParams(
  homeElo: number,
  awayElo: number,
  homePPG: number,
  homePPGAllowed: number,
  awayPPG: number,
  awayPPGAllowed: number,
  params: { eloToPoints: number; homeFieldAdv: number; eloCap: number }
) {
  const regress = (stat: number) => stat * 0.7 + LEAGUE_AVG_PPG * 0.3;
  let homeScore = (regress(homePPG) + regress(awayPPGAllowed)) / 2;
  let awayScore = (regress(awayPPG) + regress(homePPGAllowed)) / 2;

  const eloDiff = homeElo - awayElo;
  let eloAdj = (eloDiff * params.eloToPoints) / 2;
  if (params.eloCap > 0) {
    eloAdj = Math.max(-params.eloCap / 2, Math.min(params.eloCap / 2, eloAdj));
  }

  homeScore += eloAdj + params.homeFieldAdv / 2;
  awayScore -= eloAdj - params.homeFieldAdv / 2;

  return { homeScore, awayScore };
}

function calculateSpread(homeScore: number, awayScore: number, spreadRegression: number): number {
  const rawSpread = awayScore - homeScore;
  return Math.round(rawSpread * (1 - spreadRegression) * 2) / 2;
}

function runSimulation(
  games: BacktestGame[],
  params: { spreadRegression: number; eloToPoints: number; homeFieldAdv: number; eloCap: number }
): SimulationResult {
  let atsWins = 0, atsLosses = 0, atsPushes = 0;
  let ouWins = 0, ouLosses = 0, ouPushes = 0;
  let gamesWithSpread = 0, gamesWithTotal = 0;

  for (const game of games) {
    // Skip games without Vegas data
    if (game.vegasSpread === undefined || game.vegasSpread === null) continue;

    // Use stored PPG or estimate from scores (rough proxy)
    const homePPG = game.predictedHomeScore;
    const awayPPG = game.predictedAwayScore;
    const homePPGAllowed = LEAGUE_AVG_PPG;
    const awayPPGAllowed = LEAGUE_AVG_PPG;

    // Recalculate prediction with new params
    const { homeScore, awayScore } = predictWithParams(
      game.homeElo,
      game.awayElo,
      homePPG,
      homePPGAllowed,
      awayPPG,
      awayPPGAllowed,
      params
    );

    const predictedSpread = calculateSpread(homeScore, awayScore, params.spreadRegression);
    const predictedTotal = homeScore + awayScore;
    const actualSpread = game.actualAwayScore - game.actualHomeScore;
    const actualTotal = game.actualHomeScore + game.actualAwayScore;

    // ATS vs Vegas
    gamesWithSpread++;
    const vegasSpread = game.vegasSpread;
    // Our pick: if our spread < vegas spread, we like home more than Vegas does
    const pickHome = predictedSpread < vegasSpread;

    if (pickHome) {
      // We picked home to cover (beat the spread)
      // Home covers if actual spread < vegas spread
      if (actualSpread < vegasSpread) atsWins++;
      else if (actualSpread > vegasSpread) atsLosses++;
      else atsPushes++;
    } else {
      // We picked away to cover
      // Away covers if actual spread > vegas spread
      if (actualSpread > vegasSpread) atsWins++;
      else if (actualSpread < vegasSpread) atsLosses++;
      else atsPushes++;
    }

    // O/U vs Vegas
    if (game.vegasTotal !== undefined && game.vegasTotal !== null && game.vegasTotal > 0) {
      gamesWithTotal++;
      const vegasTotal = game.vegasTotal;
      const pickOver = predictedTotal > vegasTotal;

      if (pickOver) {
        if (actualTotal > vegasTotal) ouWins++;
        else if (actualTotal < vegasTotal) ouLosses++;
        else ouPushes++;
      } else {
        if (actualTotal < vegasTotal) ouWins++;
        else if (actualTotal > vegasTotal) ouLosses++;
        else ouPushes++;
      }
    }
  }

  const atsTotal = atsWins + atsLosses;
  const ouTotal = ouWins + ouLosses;

  return {
    params,
    ats: {
      wins: atsWins,
      losses: atsLosses,
      pushes: atsPushes,
      winPct: atsTotal > 0 ? Math.round((atsWins / atsTotal) * 1000) / 10 : 0,
    },
    ou: {
      wins: ouWins,
      losses: ouLosses,
      pushes: ouPushes,
      winPct: ouTotal > 0 ? Math.round((ouWins / ouTotal) * 1000) / 10 : 0,
    },
    totalGames: gamesWithSpread,
  };
}

export async function GET() {
  try {
    // Fetch backtest data from blob
    const blobInfo = await head('prediction-matrix-data.json');
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'No blob data found' }, { status: 404 });
    }

    const response = await fetch(blobInfo.url);
    const blobData = await response.json();
    const games: BacktestGame[] = blobData.backtest?.results || [];

    const gamesWithVegas = games.filter(g => g.vegasSpread !== undefined && g.vegasSpread !== null);

    // Current parameters
    const currentParams = {
      spreadRegression: 0.55,
      eloToPoints: 0.0593,
      homeFieldAdv: 2.28,
      eloCap: 4,
    };

    // Grid search ranges
    const spreadRegressionRange = [0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8];
    const eloToPointsRange = [0.03, 0.04, 0.05, 0.0593, 0.07, 0.08, 0.1];
    const homeFieldAdvRange = [1.5, 2.0, 2.28, 2.5, 3.0, 3.5];
    const eloCapRange = [0, 2, 3, 4, 5, 6, 8];

    const results: SimulationResult[] = [];

    // Test current params first
    const currentResult = runSimulation(gamesWithVegas, currentParams);
    results.push(currentResult);

    // Grid search - test each parameter individually first
    console.log('Testing spread regression...');
    for (const sr of spreadRegressionRange) {
      if (sr === currentParams.spreadRegression) continue;
      results.push(runSimulation(gamesWithVegas, { ...currentParams, spreadRegression: sr }));
    }

    console.log('Testing elo to points...');
    for (const etp of eloToPointsRange) {
      if (etp === currentParams.eloToPoints) continue;
      results.push(runSimulation(gamesWithVegas, { ...currentParams, eloToPoints: etp }));
    }

    console.log('Testing home field advantage...');
    for (const hfa of homeFieldAdvRange) {
      if (hfa === currentParams.homeFieldAdv) continue;
      results.push(runSimulation(gamesWithVegas, { ...currentParams, homeFieldAdv: hfa }));
    }

    console.log('Testing elo cap...');
    for (const ec of eloCapRange) {
      if (ec === currentParams.eloCap) continue;
      results.push(runSimulation(gamesWithVegas, { ...currentParams, eloCap: ec }));
    }

    // Now do a focused grid search around the best values found
    console.log('Running focused grid search around optimal values...');
    // Best ATS: eloToPoints around 0.08-0.1
    // Best O/U: homeFieldAdv around 3.0-3.5
    const focusedSR = [0.45, 0.5, 0.55, 0.6, 0.65];
    const focusedETP = [0.07, 0.08, 0.09, 0.1, 0.11, 0.12];
    const focusedHFA = [2.5, 3.0, 3.25, 3.5, 3.75, 4.0];
    const focusedEC = [0, 2, 4, 6, 8]; // Also test no cap

    for (const sr of focusedSR) {
      for (const etp of focusedETP) {
        for (const hfa of focusedHFA) {
          for (const ec of focusedEC) {
            results.push(runSimulation(gamesWithVegas, {
              spreadRegression: sr,
              eloToPoints: etp,
              homeFieldAdv: hfa,
              eloCap: ec,
            }));
          }
        }
      }
    }

    // Sort by ATS win percentage
    results.sort((a, b) => b.ats.winPct - a.ats.winPct);

    // Get best results
    const bestATS = results.slice(0, 20);

    // Also sort by O/U
    const bestOU = [...results].sort((a, b) => b.ou.winPct - a.ou.winPct).slice(0, 10);

    // Combined score (weighted)
    const combined = [...results].sort((a, b) => {
      const scoreA = a.ats.winPct * 0.6 + a.ou.winPct * 0.4;
      const scoreB = b.ats.winPct * 0.6 + b.ou.winPct * 0.4;
      return scoreB - scoreA;
    }).slice(0, 10);

    return NextResponse.json({
      totalGames: games.length,
      gamesWithVegas: gamesWithVegas.length,
      currentParams,
      currentPerformance: currentResult,
      bestATS,
      bestOU,
      bestCombined: combined,
      totalSimulations: results.length,
    });
  } catch (error) {
    console.error('Optimization error:', error);
    return NextResponse.json({
      error: 'Optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
