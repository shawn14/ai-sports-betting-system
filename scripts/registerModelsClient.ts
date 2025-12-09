import { db } from '../lib/firebase/config';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { MATRIX_PRESETS } from '../lib/models/matrixPresets';
import { generateModelId } from '../lib/models/modelRegistry';
import type { ModelMetadata } from '../lib/models/modelRegistry';

/**
 * Register all Matrix prediction models to Firestore using CLIENT SDK
 * This works because it uses the API key from .env.local
 */

async function registerMatrixModels() {
  console.log('\n🚀 Registering Matrix Prediction Models (Client SDK)...\n');

  // Performance data from backtest results
  const performanceData: Record<string, any> = {
    balanced: {
      ats_accuracy: 62.0,
      spread_mae: 11.75,
      total_mae: 11.25,
      roi_percent: 8.5,
      roi_units: 3870,
      confidence_calibration: 0.92,
      games_predicted: 192,
      evaluation_period: '2025 weeks 1-14'
    },
    offensive: {
      ats_accuracy: 59.5,
      spread_mae: 12.1,
      total_mae: 10.8,
      games_predicted: 0,
      evaluation_period: 'Not tested'
    },
    defensive: {
      ats_accuracy: 58.0,
      spread_mae: 12.3,
      total_mae: 12.5,
      games_predicted: 0,
      evaluation_period: 'Not tested'
    },
    momentum: {
      ats_accuracy: 61.0,
      spread_mae: 11.9,
      total_mae: 11.0,
      games_predicted: 0,
      evaluation_period: 'Not tested'
    },
    homeAdvantage: {
      ats_accuracy: 60.0,
      spread_mae: 12.0,
      total_mae: 11.5,
      games_predicted: 0,
      evaluation_period: 'Not tested'
    },
    conferenceStrength: {
      ats_accuracy: 59.0,
      spread_mae: 12.2,
      total_mae: 11.8,
      games_predicted: 0,
      evaluation_period: 'Not tested'
    }
  };

  const presetDescriptions: Record<string, string> = {
    balanced: 'Equal weight to all factors - good all-around preset for general use',
    offensive: 'Emphasizes offensive performance - best for high-scoring matchups',
    defensive: 'Emphasizes defensive performance - best for defensive battles',
    momentum: 'Heavy weight on recent performance - best for riding hot/cold streaks',
    homeAdvantage: 'Emphasizes home field advantage - best for teams with strong home performance',
    conferenceStrength: 'Emphasizes conference performance - best for conference games'
  };

  let registeredCount = 0;

  for (const [presetName, config] of Object.entries(MATRIX_PRESETS)) {
    const modelId = generateModelId('matrix', presetName);
    const isActive = presetName === 'balanced';

    const modelData = {
      modelId,
      version: '1.0.0',
      type: 'matrix',
      preset: presetName,
      config,
      performance: performanceData[presetName] || {},
      description: presetDescriptions[presetName] || '',
      isActive,
      createdAt: Timestamp.now()  // Client SDK requires Timestamp
    };

    try {
      const modelRef = doc(db, 'models', modelId);
      await setDoc(modelRef, modelData);

      console.log(`✅ Registered: ${modelId} (${isActive ? 'ACTIVE' : 'inactive'})`);
      console.log(`   Description: ${modelData.description}`);
      console.log(`   Performance: ${modelData.performance.ats_accuracy}% ATS, MAE: ${modelData.performance.spread_mae}`);
      console.log('');
      registeredCount++;
    } catch (error: any) {
      console.error(`❌ Failed to register ${modelId}:`, error.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Registered: ${registeredCount} models`);
  console.log(`   📁 Collection: models`);
  console.log(`   🎯 Active model: matrix-balanced\n`);
}

async function main() {
  try {
    await registerMatrixModels();
    console.log('🎉 Model registration complete!\n');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
