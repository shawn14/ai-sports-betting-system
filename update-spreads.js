// Quick script to manually add spreads to predictions
const admin = require('firebase-admin');

// Initialize Firebase Admin (reuse existing initialization if possible)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'betanalytics-f095a'
  });
}

const db = admin.firestore();

async function updateSpreads() {
  // Seattle @ Atlanta - Atlanta was favored by 3 (ATL -3)
  // So home team (ATL) spread = -3
  await db.collection('predictions').doc('401772900').update({
    vegasSpread: -3
  });
  console.log('✅ Updated Seattle @ Atlanta spread: ATL -3');

  // New Orleans @ Tampa Bay - Tampa Bay was favored by 3.5 (TB -3.5)
  // So home team (TB) spread = -3.5
  await db.collection('predictions').doc('401772792').update({
    vegasSpread: -3.5
  });
  console.log('✅ Updated New Orleans @ Tampa Bay spread: TB -3.5');

  process.exit(0);
}

updateSpreads().catch(console.error);
