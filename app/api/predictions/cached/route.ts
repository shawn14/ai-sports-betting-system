import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function GET() {
  try {
    // Get all predictions from Firebase
    const predictionsRef = collection(db, 'backtest_predictions');
    const snapshot = await getDocs(predictionsRef);

    if (snapshot.empty) {
      return NextResponse.json({ predictions: [] });
    }

    const predictions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Retrieved ${predictions.length} predictions from Firebase`);

    return NextResponse.json({
      predictions,
      count: predictions.length,
      cached: true
    });
  } catch (error: any) {
    console.error('Error fetching cached predictions:', error);
    return NextResponse.json(
      { error: error.message, predictions: [] },
      { status: 500 }
    );
  }
}
