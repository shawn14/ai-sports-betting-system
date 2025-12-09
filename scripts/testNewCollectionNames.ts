import { db } from '../lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';

async function test() {
  try {
    console.log('Test 1: Writing to nfl_rankings collection...');
    await setDoc(doc(db, 'nfl_rankings', 'test1'), { test: "hello" });
    console.log('✅ SUCCESS on nfl_rankings!\n');

    console.log('Test 2: Writing to rankings_data collection...');
    await setDoc(doc(db, 'rankings_data', 'test1'), { test: "world" });
    console.log('✅ SUCCESS on rankings_data!\n');

    console.log('Test 3: Writing to team_ratings collection...');
    await setDoc(doc(db, 'team_ratings', 'test1'), { test: "foo" });
    console.log('✅ SUCCESS on team_ratings!\n');

    console.log('Test 4: Writing to team_strength collection...');
    await setDoc(doc(db, 'team_strength', 'test1'), { test: "bar" });
    console.log('✅ SUCCESS on team_strength!\n');

  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
    console.error('Code:', error.code);
  }
}

test();
