import { NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';
import { getDocsMap } from '@/services/firestore-admin-store';
import { SportKey } from '@/services/firestore-types';

const NBA_BLOB_NAME = 'nba-prediction-data.json';
const sport: SportKey = 'nba';

interface HistoricalOdds {
  vegasSpread: number;
  vegasTotal: number;
}

interface BacktestResult {
  gameId: string;
  predictedSpread: number;
  predictedTotal: number;
  actualSpread: number;
  actualTotal: number;
  homeWinProb: number;
  vegasSpread?: number;
  vegasTotal?: number;
  atsResult?: 'win' | 'loss' | 'push';
  ouVegasResult?: 'win' | 'loss' | 'push';
  [key: string]: unknown;
}

export async function GET() {
  try {
    // Load historical odds from Firestore
    const historicalOdds = await getDocsMap<HistoricalOdds>(sport, 'oddsLocks');
    console.log(`Loaded ${Object.keys(historicalOdds).length} odds from Firestore`);

    // Load blob
    const blobInfo = await head(NBA_BLOB_NAME);
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'NBA blob not found' }, { status: 404 });
    }

    const blobRes = await fetch(blobInfo.url, { cache: 'no-store' });
    const blobData = await blobRes.json();
    const results: BacktestResult[] = blobData.backtest?.results || [];

    let updated = 0;
    for (const result of results) {
      const odds = historicalOdds[result.gameId];
      if (odds) {
        // Always update odds and recalculate ATS result
        result.vegasSpread = odds.vegasSpread;
        result.vegasTotal = odds.vegasTotal;

        // Calculate ATS result
        const predictedSpread = result.predictedSpread;
        const actualSpread = result.actualSpread;
        const pickHome = predictedSpread < odds.vegasSpread;

        if (pickHome) {
          result.atsResult = actualSpread < odds.vegasSpread ? 'win' :
                            actualSpread > odds.vegasSpread ? 'loss' : 'push';
        } else {
          result.atsResult = actualSpread > odds.vegasSpread ? 'win' :
                            actualSpread < odds.vegasSpread ? 'loss' : 'push';
        }

        // Calculate O/U result
        const predictedTotal = result.predictedTotal;
        const actualTotal = result.actualTotal;
        const pickOver = predictedTotal > odds.vegasTotal;

        if (pickOver) {
          result.ouVegasResult = actualTotal > odds.vegasTotal ? 'win' :
                                actualTotal < odds.vegasTotal ? 'loss' : 'push';
        } else {
          result.ouVegasResult = actualTotal < odds.vegasTotal ? 'win' :
                                actualTotal > odds.vegasTotal ? 'loss' : 'push';
        }

        updated++;
      }
    }

    // Save updated blob
    blobData.backtest.results = results;
    blobData.historicalOdds = historicalOdds;

    await put(NBA_BLOB_NAME, JSON.stringify(blobData), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Calculate stats
    const withOdds = results.filter(r => r.vegasSpread !== undefined);
    const atsWins = withOdds.filter(r => r.atsResult === 'win').length;
    const atsLosses = withOdds.filter(r => r.atsResult === 'loss').length;
    const ouWins = withOdds.filter(r => r.ouVegasResult === 'win').length;
    const ouLosses = withOdds.filter(r => r.ouVegasResult === 'loss').length;

    return NextResponse.json({
      success: true,
      oddsInFirestore: Object.keys(historicalOdds).length,
      totalResults: results.length,
      updated,
      nowWithOdds: withOdds.length,
      ats: `${atsWins}-${atsLosses} (${((atsWins / (atsWins + atsLosses)) * 100).toFixed(1)}%)`,
      ou: `${ouWins}-${ouLosses} (${((ouWins / (ouWins + ouLosses)) * 100).toFixed(1)}%)`,
    });

  } catch (error) {
    console.error('Apply odds error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
