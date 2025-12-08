import { NextResponse } from 'next/server';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    // Read the backtest results JSON file
    const filePath = path.join(process.cwd(), 'public', 'training', 'backtest_results_2025.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    console.log(`Syncing ${data.allResults.length} predictions to Firebase...`);

    // Use batched writes for better performance (max 500 per batch)
    const batchSize = 500;
    let processed = 0;

    for (let i = 0; i < data.allResults.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchResults = data.allResults.slice(i, i + batchSize);

      for (const result of batchResults) {
        const predictedWinner = result.predictedHome > result.predictedAway ? result.homeTeam : result.awayTeam;
        const actualWinner = result.actualHome > result.actualAway ? result.homeTeam : result.awayTeam;

        const predictionData = {
          week: result.week,
          gameId: result.gameId,
          homeTeam: result.homeTeam,
          awayTeam: result.awayTeam,
          predictedHomeScore: result.predictedHome,
          predictedAwayScore: result.predictedAway,
          actualHomeScore: result.actualHome,
          actualAwayScore: result.actualAway,
          predictedWinner,
          actualWinner,
          correct: result.winnerCorrect,
          predictedSpread: result.predictedSpread,
          actualSpread: result.actualSpread,
          spreadError: result.spreadError,
          predictedTotal: result.predictedTotal,
          actualTotal: result.actualTotal,
          totalError: result.totalError,
          confidence: result.confidence,
          recommendation: result.recommendation,
          season: 2025,
          syncedAt: new Date().toISOString()
        };

        // Use gameId as document ID to prevent duplicates
        const docRef = doc(db, 'backtest_predictions', result.gameId);
        batch.set(docRef, predictionData);
      }

      await batch.commit();
      processed += batchResults.length;
      console.log(`Synced ${processed}/${data.allResults.length} predictions...`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${data.allResults.length} predictions to Firebase`,
      count: data.allResults.length
    });
  } catch (error: any) {
    console.error('Error syncing predictions:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
