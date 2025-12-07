import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';
import { NFLAPI } from '@/lib/api/nfl';

/**
 * Test endpoint to debug cached predictions
 */
export async function GET() {
  try {
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();

    console.log(`Testing cache for Season ${season}, Week ${week}`);

    const result = await FirestoreService.getCachedPredictions(season, week);

    return NextResponse.json({
      season,
      week,
      predictions: result.predictions.length,
      games: result.games.length,
      lastUpdate: result.lastUpdate,
      data: {
        predictions: result.predictions,
        games: result.games
      }
    });
  } catch (error) {
    console.error('Error testing cache:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
