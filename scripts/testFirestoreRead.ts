import { getAdminDb } from '../lib/firebase/adminConfig';

/**
 * Test script to verify Firestore read access
 * This will read all documents from the models collection
 */

async function testFirestoreRead() {
  try {
    console.log('\n🔍 Testing Firestore connection...\n');

    const db = getAdminDb();

    // Read all models
    console.log('Reading models collection...');
    const modelsSnapshot = await db.collection('models').get();

    console.log(`Found ${modelsSnapshot.size} documents in models collection:\n`);

    modelsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📄 ${doc.id}`);
      console.log(`   Version: ${data.version}`);
      console.log(`   Type: ${data.type}`);
      console.log(`   Preset: ${data.preset}`);
      console.log(`   Active: ${data.isActive}`);
      console.log(`   Performance: ${data.performance?.ats_accuracy}% ATS`);
      console.log('');
    });

    // Read standings_cache to verify Phase 1
    console.log('Reading standings_cache collection...');
    const standingsSnapshot = await db.collection('standings_cache').limit(5).get();
    console.log(`Found ${standingsSnapshot.size} documents in standings_cache\n`);

    standingsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📄 ${doc.id}`);
      console.log(`   Season: ${data.season}, Week: ${data.week}`);
      console.log(`   Teams: ${data.standings?.length || 0}`);
      console.log('');
    });

    console.log('✅ Firestore connection test complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Firestore test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testFirestoreRead();
