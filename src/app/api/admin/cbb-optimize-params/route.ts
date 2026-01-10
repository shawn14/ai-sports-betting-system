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
    homeCourtAdv: number;
    eloCap: number;
  };
  ats: { wins: number; losses: number; pushes: number; winPct: number };
  ou: { wins: number; losses: number; pushes: number; winPct: number };
  totalGames: number;
}

// CBB-specific constant
const LEAGUE_AVG_PPG = 71;

function predictWithParams(
  homeElo: number,
  awayElo: number,
  homePPG: number,
  homePPGAllowed: number,
  awayPPG: number,
  awayPPGAllowed: number,
  params: { eloToPoints: number; homeCourtAdv: number; eloCap: number }
) {
  const regress = (stat: number) => stat * 0.7 + LEAGUE_AVG_PPG * 0.3;
  let homeScore = (regress(homePPG) + regress(awayPPGAllowed)) / 2;
  let awayScore = (regress(awayPPG) + regress(homePPGAllowed)) / 2;

  const eloDiff = homeElo - awayElo;
  let eloAdj = (eloDiff * params.eloToPoints) / 2;
  if (params.eloCap > 0) {
    eloAdj = Math.max(-params.eloCap / 2, Math.min(params.eloCap / 2, eloAdj));
  }

  homeScore += eloAdj + params.homeCourtAdv / 2;
  awayScore -= eloAdj - params.homeCourtAdv / 2;

  return { homeScore, awayScore };
}

function calculateSpread(homeScore: number, awayScore: number, spreadRegression: number): number {
  const rawSpread = awayScore - homeScore;
  return Math.round(rawSpread * (1 - spreadRegression) * 2) / 2;
}

function runSimulation(
  games: BacktestGame[],
  params: { spreadRegression: number; eloToPoints: number; homeCourtAdv: number; eloCap: number }
): SimulationResult {
  let atsWins = 0, atsLosses = 0, atsPushes = 0;
  let ouWins = 0, ouLosses = 0, ouPushes = 0;
  let gamesWithSpread = 0, gamesWithTotal = 0;

  for (const game of games) {
    if (game.vegasSpread === undefined || game.vegasSpread === null) continue;

    // Use stored predicted scores as proxy for PPG
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
    const pickHome = predictedSpread < vegasSpread;

    if (pickHome) {
      if (actualSpread < vegasSpread) atsWins++;
      else if (actualSpread > vegasSpread) atsLosses++;
      else atsPushes++;
    } else {
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
    // Fetch CBB backtest data from blob
    const blobInfo = await head('cbb-prediction-data.json');
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'No CBB blob data found' }, { status: 404 });
    }

    const response = await fetch(blobInfo.url);
    const blobData = await response.json();
    const games: BacktestGame[] = blobData.backtest?.results || [];

    const gamesWithVegas = games.filter(g => g.vegasSpread !== undefined && g.vegasSpread !== null);

    if (gamesWithVegas.length < 10) {
      return NextResponse.json({
        error: 'Not enough games with Vegas odds for optimization',
        gamesWithVegas: gamesWithVegas.length,
        totalGames: games.length,
        message: 'Need more games with Vegas spreads for meaningful optimization',
      }, { status: 400 });
    }

    // Current CBB parameters
    const currentParams = {
      spreadRegression: 0.4,
      eloToPoints: 0.06,
      homeCourtAdv: 4.5,
      eloCap: 20,
    };

    // Grid search ranges for CBB (adjusted for lower-scoring games than NBA)
    const spreadRegressionRange = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
    const eloToPointsRange = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12];
    const homeCourtAdvRange = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
    const eloCapRange = [0, 10, 15, 20, 25, 30, 35, 40];

    const results: SimulationResult[] = [];

    // Test current params first
    const currentResult = runSimulation(gamesWithVegas, currentParams);
    results.push(currentResult);

    console.log(`Testing ${gamesWithVegas.length} games with Vegas odds...`);
    console.log(`Current performance: ATS ${currentResult.ats.winPct}%, O/U ${currentResult.ou.winPct}%`);

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

    console.log('Testing home court advantage...');
    for (const hca of homeCourtAdvRange) {
      if (hca === currentParams.homeCourtAdv) continue;
      results.push(runSimulation(gamesWithVegas, { ...currentParams, homeCourtAdv: hca }));
    }

    console.log('Testing elo cap...');
    for (const ec of eloCapRange) {
      if (ec === currentParams.eloCap) continue;
      results.push(runSimulation(gamesWithVegas, { ...currentParams, eloCap: ec }));
    }

    // Focused grid search around optimal values
    console.log('Running focused grid search...');
    const focusedSR = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55];
    const focusedETP = [0.05, 0.06, 0.07, 0.08, 0.09, 0.1];
    const focusedHCA = [3.0, 3.5, 4.0, 4.5, 5.0];
    const focusedEC = [15, 20, 25, 30];

    for (const sr of focusedSR) {
      for (const etp of focusedETP) {
        for (const hca of focusedHCA) {
          for (const ec of focusedEC) {
            results.push(runSimulation(gamesWithVegas, {
              spreadRegression: sr,
              eloToPoints: etp,
              homeCourtAdv: hca,
              eloCap: ec,
            }));
          }
        }
      }
    }

    console.log(`Completed ${results.length} simulations`);

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
      recommendation: bestATS[0]?.params || currentParams,
      message: `Tested ${results.length} parameter combinations on ${gamesWithVegas.length} games with Vegas odds`,
    });
  } catch (error) {
    console.error('CBB Optimization error:', error);
    return NextResponse.json({
      error: 'Optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
