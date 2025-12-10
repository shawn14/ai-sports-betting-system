import { db } from '../lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

async function checkAllPredictionWeeks() {
  console.log('\n=== Checking All Prediction Weeks ===\n');

  const predictionsSnapshot = await getDocs(collection(db, 'predictions'));
  console.log(`Total predictions: ${predictionsSnapshot.size}`);

  const weekMap = new Map<number, number>();

  predictionsSnapshot.forEach(doc => {
    const pred = doc.data();
    const week = pred.week;
    weekMap.set(week, (weekMap.get(week) || 0) + 1);
  });

  console.log('\n=== Predictions by Week ===\n');
  Array.from(weekMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([week, count]) => {
      console.log(`Week ${week.toString().padStart(2)}: ${count} predictions`);
    });

  console.log('\n=== Summary ===\n');
  console.log(`Weeks with predictions: ${weekMap.size}`);
  console.log(`Total predictions: ${predictionsSnapshot.size}`);

  const totalWeeks = Array.from(weekMap.keys());
  if (totalWeeks.length > 0) {
    console.log(`Week range: ${Math.min(...totalWeeks)} - ${Math.max(...totalWeeks)}`);
  }
}

checkAllPredictionWeeks().catch(console.error);
