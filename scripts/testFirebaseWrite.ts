import { db } from '../lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';

async function test() {
  try {
    const testData = {
      season: 2025,
      week: 14,
      test: 'simple test'
    };

    console.log('Testing simple write to Firebase...');
    const cacheRef = doc(db, 'standingsCache', '2025w14');
    await setDoc(cacheRef, testData);
    console.log('✅ Write successful!');
  } catch (error: any) {
    console.error('❌ Write failed:');
    console.error(error.message);
  }
}

test();
