import { db } from '../lib/firebase/config';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Test using EXACT same pattern as uploadStandingsClient.ts (which works)
 */

async function testExactPattern() {
  console.log('\n🧪 Testing EXACT pattern from uploadStandingsClient.ts...\n');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // EXACT same structure as standings upload
  const testData = {
    modelId: 'matrix-balanced',
    version: '1.0.0',
    type: 'matrix',
    preset: 'balanced',
    isActive: true,
    createdAt: Timestamp.fromDate(now),  // Use fromDate() like standings
    expiresAt: Timestamp.fromDate(expiresAt)
  };

  console.log('Attempting to write with Timestamp.fromDate()...');
  console.log('Data:', JSON.stringify({
    ...testData,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  }, null, 2));

  try {
    const modelRef = doc(db, 'models', 'test-exact');
    await setDoc(modelRef, testData);
    console.log('\n✅ SUCCESS! Pattern from standings upload works!');
    console.log('Check Firebase Console: models collection, document: test-exact\n');
  } catch (error: any) {
    console.error('\n❌ FAILED even with exact pattern:');
    console.error(`Code: ${error?.code}`);
    console.error(`Message: ${error?.message}\n`);
  }
}

testExactPattern();
