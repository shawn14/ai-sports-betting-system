/**
 * FRESH TEST - Completely new test with refactored Firebase setup
 */

import { db } from '../lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';

async function freshTest() {
  console.log('\n🆕 FRESH FIREBASE TEST\n');

  // Simplest possible data
  const testData = {
    message: 'Hello from fresh setup',
    timestamp: new Date().toISOString(),
    number: 42
  };

  console.log('Data to write:', testData);
  console.log('Target: test_collection/fresh_doc\n');

  try {
    const testRef = doc(db, 'test_collection', 'fresh_doc');
    await setDoc(testRef, testData);

    console.log('✅ SUCCESS! Data written to Firebase');
    console.log('Check Firebase Console: test_collection/fresh_doc\n');
  } catch (error: any) {
    console.error('❌ FAILED');
    console.error('Code:', error?.code);
    console.error('Message:', error?.message);
    console.error('\nFull error:', error);
  }
}

freshTest();
