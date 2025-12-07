#!/usr/bin/env node

// Cleanup script to remove duplicate predictions from Firebase
// Keeps only the most recent prediction for each game

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function cleanupDuplicates() {
  console.log('🧹 Starting duplicate prediction cleanup...');
  console.log('Project:', firebaseConfig.projectId);

  try {
    // Get all predictions for Season 2025, Week 14
    const q = query(
      collection(db, 'predictions'),
      where('season', '==', 2025),
      where('week', '==', 14)
    );

    const querySnapshot = await getDocs(q);
    console.log(`\n📊 Found ${querySnapshot.size} total predictions`);

    // Group by gameId
    const byGameId = new Map();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!byGameId.has(data.gameId)) {
        byGameId.set(data.gameId, []);
      }
      byGameId.get(data.gameId).push({
        id: doc.id,
        data: data,
        timestamp: data.timestamp?.toDate() || new Date(0)
      });
    });

    console.log(`📊 Found ${byGameId.size} unique games\n`);

    let deletedCount = 0;
    let keptCount = 0;

    // For each game, keep only the most recent prediction
    for (const [gameId, predictions] of byGameId) {
      // Sort by timestamp (newest first)
      predictions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const mostRecent = predictions[0];
      const duplicates = predictions.slice(1);

      console.log(`Game ${gameId}:`);
      console.log(`  ✅ KEEPING: ${mostRecent.id} (${mostRecent.data.confidence}% confidence, ${mostRecent.timestamp.toISOString()})`);

      // Delete duplicates
      for (const dup of duplicates) {
        console.log(`  ❌ DELETING: ${dup.id} (${dup.timestamp.toISOString()})`);
        await deleteDoc(doc(db, 'predictions', dup.id));
        deletedCount++;
      }

      keptCount++;
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Kept: ${keptCount} predictions`);
    console.log(`   Deleted: ${deletedCount} duplicates`);
    console.log(`   Total before: ${querySnapshot.size}`);
    console.log(`   Total after: ${keptCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

cleanupDuplicates();
