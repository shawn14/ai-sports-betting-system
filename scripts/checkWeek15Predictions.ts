import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

async function checkPredictions() {
  console.log('Checking Week 15 predictions...\n');

  const predictionsRef = collection(db, 'predictions');
  const q = query(
    predictionsRef,
    where('season', '==', 2024),
    where('week', '==', 15),
    limit(3)
  );

  const snapshot = await getDocs(q);

  console.log('Week 15 Predictions Sample:');
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\nGame: ${data.awayTeam} @ ${data.homeTeam}`);
    console.log(`  predictedSpread: ${data.predictedSpread}`);
    console.log(`  vegasSpread: ${data.vegasSpread}`);
    console.log(`  vegasTotal: ${data.vegasTotal}`);
    console.log(`  gameId: ${data.gameId}`);
  });

  console.log(`\nTotal predictions found: ${snapshot.size}`);
}

checkPredictions().catch(console.error);
