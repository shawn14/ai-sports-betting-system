import { db } from '../lib/firebase/config';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Register models with MINIMAL data to test what Firebase accepts
 */

async function testSimpleModel() {
  console.log('\n🧪 Testing simple model registration...\n');

  try {
    const testData = {
      modelId: 'matrix-balanced',
      version: '1.0.0',
      type: 'matrix',
      preset: 'balanced',
      isActive: true,
      createdAt: Timestamp.now()
    };

    console.log('Attempting to write:', JSON.stringify(testData, null, 2));

    const modelRef = doc(db, 'models', 'matrix-balanced');
    await setDoc(modelRef, testData);

    console.log('✅ SUCCESS! Model registered to Firestore');
  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
    console.error('Code:', error.code);
  }
}

testSimpleModel();
