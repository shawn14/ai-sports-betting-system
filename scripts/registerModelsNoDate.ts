import { db } from '../lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Test model registration WITHOUT any date fields
 */

async function testModelNoDate() {
  console.log('\n🧪 Testing model WITHOUT createdAt...\n');

  try {
    const testData = {
      modelId: 'matrix-balanced',
      version: '1.0.0',
      type: 'matrix',
      preset: 'balanced',
      isActive: true
    };

    console.log('Attempting to write:', JSON.stringify(testData, null, 2));

    const modelRef = doc(db, 'models', 'matrix-balanced');
    await setDoc(modelRef, testData);

    console.log('✅ SUCCESS! Model registered to Firestore');
    console.log('Check Firebase Console now!');
  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
    console.error('Code:', error.code);
  }
}

testModelNoDate();
