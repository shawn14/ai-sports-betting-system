import { db } from '../lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';

async function test() {
  try {
    console.log('Test 1: Writing {test: "hello"}...');
    await setDoc(doc(db, 'team_rankings', 'test1'), { test: "hello" });
    console.log('✅ SUCCESS!\n');
  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
    console.error('Code:', error.code);
  }
}

test();
