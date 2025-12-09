import { db } from '../lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Test writing to different collection names to see if "models" is the problem
 */

async function testDifferentCollections() {
  console.log('\n🧪 Testing writes to different collections...\n');

  const testData = {
    modelId: 'matrix-balanced',
    version: '1.0.0',
    type: 'matrix',
    preset: 'balanced',
    isActive: true
  };

  // Test 1: Try "model_registry" instead of "models"
  try {
    console.log('Test 1: Writing to "model_registry" collection...');
    const ref1 = doc(db, 'model_registry', 'test-1');
    await setDoc(ref1, testData);
    console.log('✅ SUCCESS: model_registry collection');
  } catch (error: any) {
    console.error('❌ FAILED: model_registry -', error.message);
  }

  // Test 2: Try "ml_models"
  try {
    console.log('\nTest 2: Writing to "ml_models" collection...');
    const ref2 = doc(db, 'ml_models', 'test-2');
    await setDoc(ref2, testData);
    console.log('✅ SUCCESS: ml_models collection');
  } catch (error: any) {
    console.error('❌ FAILED: ml_models -', error.message);
  }

  // Test 3: Try "prediction_models"
  try {
    console.log('\nTest 3: Writing to "prediction_models" collection...');
    const ref3 = doc(db, 'prediction_models', 'test-3');
    await setDoc(ref3, testData);
    console.log('✅ SUCCESS: prediction_models collection');
  } catch (error: any) {
    console.error('❌ FAILED: prediction_models -', error.message);
  }

  // Test 4: Try known working collection (team_rankings)
  try {
    console.log('\nTest 4: Writing to "team_rankings" (known working)...');
    const ref4 = doc(db, 'team_rankings', 'test-4');
    await setDoc(ref4, testData);
    console.log('✅ SUCCESS: team_rankings collection');
  } catch (error: any) {
    console.error('❌ FAILED: team_rankings -', error.message);
  }

  // Test 5: Try "models" again for comparison
  try {
    console.log('\nTest 5: Writing to "models" collection...');
    const ref5 = doc(db, 'models', 'test-5');
    await setDoc(ref5, testData);
    console.log('✅ SUCCESS: models collection');
  } catch (error: any) {
    console.error('❌ FAILED: models -', error.message);
  }

  console.log('\n📊 Test complete. Check which collections succeeded.\n');
}

testDifferentCollections();
