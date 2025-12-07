#!/usr/bin/env node

// Quick script to check predictions in Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDSwC5gnZ72sni6eOPmlsZa1Xtp4_MCQDE",
  authDomain: "betanalytics-f095a.firebaseapp.com",
  projectId: "betanalytics-f095a",
  storageBucket: "betanalytics-f095a.firebasestorage.app",
  messagingSenderId: "977699965910",
  appId: "1:977699965910:web:abf2c790ee75ac4129b277",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPredictions() {
  console.log('🔍 Checking Firebase for predictions...');
  console.log('Project:', firebaseConfig.projectId);

  try {
    // Check predictions for 2025, Week 14
    const q = query(
      collection(db, 'predictions'),
      where('season', '==', 2025),
      where('week', '==', 14)
    );

    const querySnapshot = await getDocs(q);
    console.log(`\n📊 Found ${querySnapshot.size} predictions for Season 2025, Week 14`);

    if (querySnapshot.size > 0) {
      console.log('\n✅ All predictions:');

      // Group by gameId to see duplicates
      const byGameId = new Map();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!byGameId.has(data.gameId)) {
          byGameId.set(data.gameId, []);
        }
        byGameId.get(data.gameId).push({
          id: doc.id,
          predictedWinner: data.predictedWinner,
          confidence: data.confidence,
          timestamp: data.timestamp?.toDate()
        });
      });

      console.log(`\n📊 UNIQUE GAMES: ${byGameId.size}`);
      console.log(`📊 TOTAL PREDICTIONS: ${querySnapshot.size}`);
      console.log(`📊 DUPLICATES PER GAME: ${(querySnapshot.size / byGameId.size).toFixed(1)}x\n`);

      // Show first 5 games with their predictions
      let count = 0;
      for (const [gameId, preds] of byGameId) {
        if (count++ >= 5) break;
        console.log(`Game ${gameId} (${preds.length} predictions):`);
        preds.forEach(p => {
          console.log(`  - ${p.predictedWinner} (${p.confidence}%) [Doc ID: ${p.id}]`);
        });
      }

      // Count high confidence
      const highConfidence = querySnapshot.docs.filter(doc => doc.data().confidence >= 75);
      console.log(`\n🔥 High confidence predictions (≥75%): ${highConfidence.length}`);

      // Show unique high confidence games
      const highConfGames = new Set();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.confidence >= 75) {
          highConfGames.add(`${data.gameId} (${data.confidence}%)`);
        }
      });
      console.log(`\n🎯 UNIQUE high confidence games: ${highConfGames.size}`);
      highConfGames.forEach(g => console.log(`  - ${g}`));
    } else {
      console.log('\n⚠️  No predictions found for Week 14!');

      // Check what weeks DO have predictions
      const allPredictions = query(collection(db, 'predictions'));
      const allSnapshot = await getDocs(allPredictions);
      const weeks = new Set();
      allSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.season === 2025) {
          weeks.add(data.week);
        }
      });
      console.log(`Available weeks in 2025: ${Array.from(weeks).sort((a, b) => a - b).join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkPredictions();
