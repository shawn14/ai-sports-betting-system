import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

async function checkPredictions() {
  console.log('\n=== Checking Firestore Collections ===\n');

  // Check predictions
  const predictionsQuery = query(collection(db, 'predictions'), limit(5));
  const predictionsSnapshot = await getDocs(predictionsQuery);
  console.log(`Predictions collection: ${predictionsSnapshot.size} sample documents`);

  if (predictionsSnapshot.size > 0) {
    const sample = predictionsSnapshot.docs[0].data();
    console.log('\nSample prediction:', JSON.stringify(sample, null, 2));
  }

  // Check games
  const gamesQuery = query(collection(db, 'games'), limit(5));
  const gamesSnapshot = await getDocs(gamesQuery);
  console.log(`\nGames collection: ${gamesSnapshot.size} sample documents`);

  if (gamesSnapshot.size > 0) {
    const sample = gamesSnapshot.docs[0].data();
    console.log('\nSample game:', JSON.stringify(sample, null, 2));
  }

  // Check results
  const resultsQuery = query(collection(db, 'results'), limit(5));
  const resultsSnapshot = await getDocs(resultsQuery);
  console.log(`\nResults collection: ${resultsSnapshot.size} documents`);
}

checkPredictions().catch(console.error);
