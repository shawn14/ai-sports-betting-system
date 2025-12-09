// Load environment variables FIRST
import { loadEnvFile } from '../lib/firebase/loadEnv';
loadEnvFile();

// Then import Firebase
import { db } from '../lib/firebase/config';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

async function test() {
  console.log('\n🧪 Testing Firebase write WITH environment variables loaded...\n');

  // Log what we're connecting to (without exposing full keys)
  console.log('Firebase Config Check:');
  console.log(`  projectId: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`  apiKey: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10)}...`);
  console.log('');

  const now = new Date();

  const testData = {
    test: 'hello',
    timestamp: Timestamp.fromDate(now),
    number: 123,
    boolean: true
  };

  console.log('Attempting write to team_rankings collection...');

  try {
    const testRef = doc(db, 'team_rankings', 'env-test');
    await setDoc(testRef, testData);
    console.log('\n✅ SUCCESS! Firebase write completed.');
    console.log('Check Firebase Console: team_rankings/env-test\n');
  } catch (error: any) {
    console.error('\n❌ FAILED:');
    console.error(`Code: ${error?.code}`);
    console.error(`Message: ${error?.message}`);
    console.error(`Stack:`, error?.stack);
    console.log('');
  }
}

test();
