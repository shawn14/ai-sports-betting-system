import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

interface BacktestResult {
  gameId: string;
  gameTime: string;
  week?: number;
  homeTeam: string;
  awayTeam: string;
  predictedSpread: number;
  predictedTotal: number;
  actualHomeScore: number;
  actualAwayScore: number;
  actualSpread: number;
  actualTotal: number;
  vegasSpread?: number;
  vegasTotal?: number;
  spreadPick: 'home' | 'away';
  atsResult?: 'win' | 'loss' | 'push';
  ouResult?: 'win' | 'loss' | 'push';
}

interface SimulationParams {
  // Spread adjustments
  spreadRegression: number;    // Shrink our spread toward Vegas (0-1)
  spreadOffset: number;        // Add/subtract points from our spread

  // Filters
  minEdge: number;             // Only bet when |ourSpread - vegasSpread| >= this
  maxSpread: number;           // Only bet when |vegasSpread| <= this
  minSpread: number;           // Only bet when |vegasSpread| >= this

  // O/U adjustments
  totalRegression: number;     // Shrink our total toward Vegas
  minTotalEdge: number;        // Only bet O/U when edge >= this
}

interface SimulationResult {
  params: SimulationParams;
  ats: { wins: number; losses: number; pushes: number; winPct: number; bets: number; roi: number };
  ou: { wins: number; losses: number; pushes: number; winPct: number; bets: number; roi: number };
  combinedRoi: number;
}

function runSimulation(
  games: BacktestResult[],
  params: SimulationParams
): SimulationResult {
  let atsWins = 0, atsLosses = 0, atsPushes = 0;
  let ouWins = 0, ouLosses = 0, ouPushes = 0;

  for (const game of games) {
    if (game.vegasSpread === undefined || game.vegasTotal === undefined) continue;

    const vegasSpread = game.vegasSpread;
    const vegasTotal = game.vegasTotal;
    const actualSpread = game.actualSpread;
    const actualTotal = game.actualTotal;

    // Apply spread adjustments
    // Regression toward Vegas: move our spread closer to Vegas
    let adjustedSpread = game.predictedSpread;
    if (params.spreadRegression > 0) {
      adjustedSpread = game.predictedSpread * (1 - params.spreadRegression) + vegasSpread * params.spreadRegression;
    }
    adjustedSpread += params.spreadOffset;

    // Calculate edge vs Vegas
    const spreadEdge = Math.abs(adjustedSpread - vegasSpread);

    // Apply filters for ATS
    const absVegasSpread = Math.abs(vegasSpread);
    const shouldBetAts =
      spreadEdge >= params.minEdge &&
      absVegasSpread <= params.maxSpread &&
      absVegasSpread >= params.minSpread;

    if (shouldBetAts) {
      // Determine our pick based on adjusted spread
      const spreadPick = adjustedSpread < vegasSpread ? 'home' : 'away';

      // Determine ATS result
      if (spreadPick === 'home') {
        // Bet home to cover: home needs actualSpread < vegasSpread
        if (actualSpread < vegasSpread) atsWins++;
        else if (actualSpread > vegasSpread) atsLosses++;
        else atsPushes++;
      } else {
        // Bet away to cover: away needs actualSpread > vegasSpread
        if (actualSpread > vegasSpread) atsWins++;
        else if (actualSpread < vegasSpread) atsLosses++;
        else atsPushes++;
      }
    }

    // O/U betting
    let adjustedTotal = game.predictedTotal;
    if (params.totalRegression > 0) {
      adjustedTotal = game.predictedTotal * (1 - params.totalRegression) + vegasTotal * params.totalRegression;
    }

    const totalEdge = Math.abs(adjustedTotal - vegasTotal);
    const shouldBetOu = totalEdge >= params.minTotalEdge;

    if (shouldBetOu) {
      const ouPick = adjustedTotal > vegasTotal ? 'over' : 'under';

      if (ouPick === 'over') {
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

  const atsRoi = atsTotal > 0 ? Math.round(((atsWins * 0.909 - atsLosses) / atsTotal) * 1000) / 10 : 0;
  const ouRoi = ouTotal > 0 ? Math.round(((ouWins * 0.909 - ouLosses) / ouTotal) * 1000) / 10 : 0;

  return {
    params,
    ats: {
      wins: atsWins,
      losses: atsLosses,
      pushes: atsPushes,
      winPct: atsTotal > 0 ? Math.round((atsWins / atsTotal) * 1000) / 10 : 0,
      bets: atsTotal,
      roi: atsRoi,
    },
    ou: {
      wins: ouWins,
      losses: ouLosses,
      pushes: ouPushes,
      winPct: ouTotal > 0 ? Math.round((ouWins / ouTotal) * 1000) / 10 : 0,
      bets: ouTotal,
      roi: ouRoi,
    },
    combinedRoi: atsTotal + ouTotal > 0
      ? Math.round((((atsWins + ouWins) * 0.909 - (atsLosses + ouLosses)) / (atsTotal + ouTotal)) * 1000) / 10
      : 0,
  };
}

export async function GET() {
  try {
    // Fetch blob data
    const blobInfo = await head('prediction-matrix-data.json');
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'No blob data found' }, { status: 404 });
    }
    const blobResponse = await fetch(blobInfo.url);
    const blobData = await blobResponse.json();

    const allResults: BacktestResult[] = blobData.backtest?.results || [];
    const games = allResults.filter(r => r.vegasSpread !== undefined && r.vegasTotal !== undefined);

    if (games.length === 0) {
      return NextResponse.json({ error: 'No games with Vegas odds' }, { status: 400 });
    }

    const results: SimulationResult[] = [];

    // Baseline (current behavior)
    const baseline: SimulationParams = {
      spreadRegression: 0,
      spreadOffset: 0,
      minEdge: 0,
      maxSpread: 20,
      minSpread: 0,
      totalRegression: 0,
      minTotalEdge: 0,
    };

    results.push(runSimulation(games, baseline));

    // ========== TEST SPREAD FILTERS ==========

    // Test maxSpread filter (avoid big spreads where we're 42.9%)
    for (const maxSpread of [3, 4, 5, 6, 7, 8, 10, 15, 20]) {
      results.push(runSimulation(games, { ...baseline, maxSpread }));
    }

    // Test minEdge filter (only bet when we disagree with Vegas)
    for (const minEdge of [0.5, 1, 1.5, 2, 2.5, 3, 4]) {
      results.push(runSimulation(games, { ...baseline, minEdge }));
    }

    // Test minSpread filter (avoid pickem games)
    for (const minSpread of [1, 2, 3]) {
      results.push(runSimulation(games, { ...baseline, minSpread }));
    }

    // ========== TEST SPREAD ADJUSTMENTS ==========

    // Spread regression (move our spread toward Vegas)
    for (const spreadRegression of [0.1, 0.2, 0.3, 0.4, 0.5]) {
      results.push(runSimulation(games, { ...baseline, spreadRegression }));
    }

    // Spread offset (add points to favor underdogs)
    for (const spreadOffset of [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2]) {
      results.push(runSimulation(games, { ...baseline, spreadOffset }));
    }

    // ========== TEST O/U FILTERS ==========

    for (const minTotalEdge of [1, 2, 3, 4, 5, 6]) {
      results.push(runSimulation(games, { ...baseline, minTotalEdge }));
    }

    // Total regression
    for (const totalRegression of [0.1, 0.2, 0.3]) {
      results.push(runSimulation(games, { ...baseline, totalRegression }));
    }

    // ========== COMBINED STRATEGIES ==========

    // Best ATS strategy: avoid big spreads + require edge
    for (const maxSpread of [5, 6, 7, 8]) {
      for (const minEdge of [0, 0.5, 1, 1.5]) {
        for (const spreadOffset of [0, 0.5, 1]) {
          results.push(runSimulation(games, {
            ...baseline,
            maxSpread,
            minEdge,
            spreadOffset
          }));
        }
      }
    }

    // Underdog bias strategy (based on 58.1% underdog performance)
    for (const spreadOffset of [0.5, 1, 1.5, 2]) {
      for (const maxSpread of [6, 7, 8, 10]) {
        results.push(runSimulation(games, {
          ...baseline,
          spreadOffset, // Positive offset favors underdogs
          maxSpread,
        }));
      }
    }

    // O/U optimized
    for (const minTotalEdge of [3, 4, 5]) {
      for (const totalRegression of [0, 0.1, 0.2]) {
        results.push(runSimulation(games, {
          ...baseline,
          minTotalEdge,
          totalRegression,
        }));
      }
    }

    // Sort by ATS ROI
    const atsSorted = [...results].sort((a, b) => b.ats.roi - a.ats.roi);
    const ouSorted = [...results].sort((a, b) => b.ou.roi - a.ou.roi);
    const combinedSorted = [...results].sort((a, b) => b.combinedRoi - a.combinedRoi);

    // Filter for minimum sample size
    const viableAts = atsSorted.filter(r => r.ats.bets >= 30);
    const viableOu = ouSorted.filter(r => r.ou.bets >= 30);

    // Find baseline for comparison
    const baselineResult = results[0];

    return NextResponse.json({
      gamesAnalyzed: games.length,
      baseline: baselineResult,

      bestAtsStrategies: viableAts.slice(0, 10).map(r => ({
        params: r.params,
        record: `${r.ats.wins}-${r.ats.losses}-${r.ats.pushes}`,
        winPct: r.ats.winPct,
        roi: r.ats.roi,
        bets: r.ats.bets,
      })),

      bestOuStrategies: viableOu.slice(0, 10).map(r => ({
        params: r.params,
        record: `${r.ou.wins}-${r.ou.losses}-${r.ou.pushes}`,
        winPct: r.ou.winPct,
        roi: r.ou.roi,
        bets: r.ou.bets,
      })),

      recommendations: {
        ats: viableAts[0] ? {
          strategy: viableAts[0].params,
          expected: `${viableAts[0].ats.winPct}% win rate, ${viableAts[0].ats.roi}% ROI over ${viableAts[0].ats.bets} bets`,
          improvement: `+${(viableAts[0].ats.roi - baselineResult.ats.roi).toFixed(1)}% ROI vs baseline`,
        } : null,
        ou: viableOu[0] ? {
          strategy: viableOu[0].params,
          expected: `${viableOu[0].ou.winPct}% win rate, ${viableOu[0].ou.roi}% ROI over ${viableOu[0].ou.bets} bets`,
          improvement: `+${(viableOu[0].ou.roi - baselineResult.ou.roi).toFixed(1)}% ROI vs baseline`,
        } : null,
      },

      totalSimulations: results.length,
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json({
      error: 'Simulation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
