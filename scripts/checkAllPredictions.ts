import { db } from '../lib/firebase/config';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

async function checkPredictions() {
  console.log('Checking all predictions...\n');

  const predictionsRef = collection(db, 'predictions');
  const q = query(predictionsRef, orderBy('timestamp', 'desc'), limit(5));

  const snapshot = await getDocs(q);

  console.log(`Total predictions found: ${snapshot.size}\n`);

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Game: ${data.awayTeam} @ ${data.homeTeam}`);
    console.log(`  Season: ${data.season}, Week: ${data.week}`);
    console.log(`  predictedSpread: ${data.predictedSpread}`);
    console.log(`  vegasSpread: ${data.vegasSpread}`);
    console.log(`  vegasTotal: ${data.vegasTotal}`);
    console.log(`  gameId: ${data.gameId}`);
    console.log(`  timestamp: ${data.timestamp}\n`);
  });
}

checkPredictions().catch(console.error);
