import { NextResponse } from 'next/server';
import { MatrixHelper } from '@/lib/models/matrixHelper';
import { Game } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { games, season, week, presetName = 'balanced', oddsData } = body;

    if (!games || !Array.isArray(games)) {
      return NextResponse.json(
        { error: 'Games array is required' },
        { status: 400 }
      );
    }

    if (!season || !week) {
      return NextResponse.json(
        { error: 'Season and week are required' },
        { status: 400 }
      );
    }

    // Generate predictions using MatrixHelper (server-side only)
    const predictions = await MatrixHelper.predictGames(
      games as Game[],
      season,
      week,
      presetName,
      oddsData
    );

    // Convert Map to object for JSON serialization
    const predictionsObj: Record<string, any> = {};
    predictions.forEach((value, key) => {
      predictionsObj[key] = value;
    });

    return NextResponse.json({
      predictions: predictionsObj,
      count: predictions.size
    });
  } catch (error: any) {
    console.error('Error generating predictions:', error);

    // Check if it's a standings data error
    if (error.message?.includes('standings data')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}
