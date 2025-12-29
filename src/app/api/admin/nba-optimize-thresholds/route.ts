import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

const NBA_BLOB_NAME = 'nba-prediction-data.json';

interface BacktestResult {
  gameId: string;
  predictedSpread: number;
  predictedTotal: number;
  homeWinProb: number;
  vegasSpread?: number;
  vegasTotal?: number;
  atsResult?: 'win' | 'loss' | 'push';
  ouVegasResult?: 'win' | 'loss' | 'push';
  actualHomeScore: number;
  actualAwayScore: number;
}

interface ThresholdResult {
  atsThreshold: number;
  ouThreshold: number;
  mlThreshold: number;
  ats: { wins: number; losses: number; winPct: number; picks: number };
  ou: { wins: number; losses: number; winPct: number; picks: number };
  ml: { wins: number; losses: number; winPct: number; picks: number };
  combined: { wins: number; losses: number; winPct: number; picks: number };
}

function simulate(
  results: BacktestResult[],
  atsThreshold: number,
  ouThreshold: number,
  mlThreshold: number
): ThresholdResult {
  let atsWins = 0, atsLosses = 0;
  let ouWins = 0, ouLosses = 0;
  let mlWins = 0, mlLosses = 0;

  for (const r of results) {
    if (r.vegasSpread === undefined) continue;

    const spreadEdge = Math.abs(r.predictedSpread - r.vegasSpread);
    const totalEdge = Math.abs(r.predictedTotal - (r.vegasTotal || 0));
    const mlEdge = Math.abs(r.homeWinProb - 0.5) * 100;

    // ATS
    if (spreadEdge >= atsThreshold && r.atsResult) {
      if (r.atsResult === 'win') atsWins++;
      else if (r.atsResult === 'loss') atsLosses++;
    }

    // O/U
    if (totalEdge >= ouThreshold && r.ouVegasResult) {
      if (r.ouVegasResult === 'win') ouWins++;
      else if (r.ouVegasResult === 'loss') ouLosses++;
    }

    // ML
    if (mlEdge >= mlThreshold) {
      const predictWin = r.homeWinProb > 0.5;
      const homeWon = r.actualHomeScore > r.actualAwayScore;
      if ((predictWin && homeWon) || (!predictWin && !homeWon)) mlWins++;
      else mlLosses++;
    }
  }

  const atsPicks = atsWins + atsLosses;
  const ouPicks = ouWins + ouLosses;
  const mlPicks = mlWins + mlLosses;
  const combinedWins = atsWins + ouWins + mlWins;
  const combinedLosses = atsLosses + ouLosses + mlLosses;

  return {
    atsThreshold,
    ouThreshold,
    mlThreshold,
    ats: {
      wins: atsWins,
      losses: atsLosses,
      winPct: atsPicks > 0 ? Math.round((atsWins / atsPicks) * 1000) / 10 : 0,
      picks: atsPicks,
    },
    ou: {
      wins: ouWins,
      losses: ouLosses,
      winPct: ouPicks > 0 ? Math.round((ouWins / ouPicks) * 1000) / 10 : 0,
      picks: ouPicks,
    },
    ml: {
      wins: mlWins,
      losses: mlLosses,
      winPct: mlPicks > 0 ? Math.round((mlWins / mlPicks) * 1000) / 10 : 0,
      picks: mlPicks,
    },
    combined: {
      wins: combinedWins,
      losses: combinedLosses,
      winPct: (combinedWins + combinedLosses) > 0
        ? Math.round((combinedWins / (combinedWins + combinedLosses)) * 1000) / 10
        : 0,
      picks: combinedWins + combinedLosses,
    },
  };
}

export async function GET() {
  try {
    const blobInfo = await head(NBA_BLOB_NAME);
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'NBA blob not found' }, { status: 404 });
    }

    const blobRes = await fetch(blobInfo.url, { cache: 'no-store' });
    const blobData = await blobRes.json();
    const results: BacktestResult[] = blobData.backtest?.results || [];

    const withOdds = results.filter(r => r.vegasSpread !== undefined);

    // Test different thresholds
    const atsThresholds = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
    const ouThresholds = [2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0];
    const mlThresholds = [10, 12, 15, 18, 20, 22, 25];

    const allResults: ThresholdResult[] = [];

    // Grid search
    for (const ats of atsThresholds) {
      for (const ou of ouThresholds) {
        for (const ml of mlThresholds) {
          allResults.push(simulate(withOdds, ats, ou, ml));
        }
      }
    }

    // Find best for each category
    const bestATS = [...allResults]
      .filter(r => r.ats.picks >= 100) // Need minimum sample
      .sort((a, b) => b.ats.winPct - a.ats.winPct)
      .slice(0, 5);

    const bestOU = [...allResults]
      .filter(r => r.ou.picks >= 100)
      .sort((a, b) => b.ou.winPct - a.ou.winPct)
      .slice(0, 5);

    const bestML = [...allResults]
      .filter(r => r.ml.picks >= 100)
      .sort((a, b) => b.ml.winPct - a.ml.winPct)
      .slice(0, 5);

    const bestCombined = [...allResults]
      .filter(r => r.combined.picks >= 300)
      .sort((a, b) => b.combined.winPct - a.combined.winPct)
      .slice(0, 5);

    // Current thresholds
    const current = simulate(withOdds, 2.5, 5.0, 15);

    // Analyze edge distribution
    const spreadEdges = withOdds.map(r => Math.abs(r.predictedSpread - r.vegasSpread!));
    const totalEdges = withOdds.filter(r => r.vegasTotal).map(r => Math.abs(r.predictedTotal - r.vegasTotal!));
    const mlEdges = withOdds.map(r => Math.abs(r.homeWinProb - 0.5) * 100);

    spreadEdges.sort((a, b) => a - b);
    totalEdges.sort((a, b) => a - b);
    mlEdges.sort((a, b) => a - b);

    const edgeStats = {
      spread: {
        median: spreadEdges[Math.floor(spreadEdges.length / 2)],
        p75: spreadEdges[Math.floor(spreadEdges.length * 0.75)],
        p90: spreadEdges[Math.floor(spreadEdges.length * 0.90)],
      },
      total: {
        median: totalEdges[Math.floor(totalEdges.length / 2)],
        p75: totalEdges[Math.floor(totalEdges.length * 0.75)],
        p90: totalEdges[Math.floor(totalEdges.length * 0.90)],
      },
      ml: {
        median: mlEdges[Math.floor(mlEdges.length / 2)],
        p75: mlEdges[Math.floor(mlEdges.length * 0.75)],
        p90: mlEdges[Math.floor(mlEdges.length * 0.90)],
      },
    };

    return NextResponse.json({
      gamesWithOdds: withOdds.length,
      totalSimulations: allResults.length,
      current,
      bestATS,
      bestOU,
      bestML,
      bestCombined,
      edgeStats,
      recommendation: {
        atsThreshold: bestATS[0]?.atsThreshold,
        ouThreshold: bestOU[0]?.ouThreshold,
        mlThreshold: bestML[0]?.mlThreshold,
        reason: 'Thresholds that maximize win rate with 100+ pick sample size',
      },
    });

  } catch (error) {
    console.error('Optimize thresholds error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
