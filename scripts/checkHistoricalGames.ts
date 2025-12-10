import { db } from '../lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

async function checkHistoricalGames() {
  console.log('\n=== Checking Historical Games Data ===\n');

  // Get all games
  const gamesSnapshot = await getDocs(collection(db, 'games'));
  console.log(`Total games in database: ${gamesSnapshot.size}`);

  // Group by week
  const weekCounts = new Map<number, { total: number; completed: number; scheduled: number }>();

  gamesSnapshot.forEach(doc => {
    const game = doc.data();
    const week = game.week;

    if (!weekCounts.has(week)) {
      weekCounts.set(week, { total: 0, completed: 0, scheduled: 0 });
    }

    const counts = weekCounts.get(week)!;
    counts.total++;

    if (game.status === 'completed') {
      counts.completed++;
    } else {
      counts.scheduled++;
    }
  });

  console.log('\n=== Games by Week ===\n');
  Array.from(weekCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([week, counts]) => {
      const completedPercent = counts.total > 0
        ? Math.round((counts.completed / counts.total) * 100)
        : 0;
      console.log(
        `Week ${week.toString().padStart(2)}: ${counts.completed}/${counts.total} completed (${completedPercent}%) | ${counts.scheduled} scheduled`
      );
    });

  // Get all predictions
  const predictionsSnapshot = await getDocs(collection(db, 'predictions'));
  console.log(`\n=== Predictions Data ===\n`);
  console.log(`Total predictions: ${predictionsSnapshot.size}`);

  const predictionsByWeek = new Map<number, number>();
  predictionsSnapshot.forEach(doc => {
    const pred = doc.data();
    const week = pred.week;
    predictionsByWeek.set(week, (predictionsByWeek.get(week) || 0) + 1);
  });

  console.log('\n=== Predictions by Week ===\n');
  Array.from(predictionsByWeek.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([week, count]) => {
      console.log(`Week ${week.toString().padStart(2)}: ${count} predictions`);
    });

  // Summary
  console.log('\n=== Summary ===\n');
  const totalCompleted = Array.from(weekCounts.values()).reduce((sum, w) => sum + w.completed, 0);
  const weeksWithPredictions = Array.from(predictionsByWeek.keys()).length;
  const weeksWithCompletedGames = Array.from(weekCounts.entries()).filter(([, c]) => c.completed > 0).length;

  console.log(`Weeks with completed games: ${weeksWithCompletedGames}`);
  console.log(`Total completed games: ${totalCompleted}`);
  console.log(`Weeks with predictions: ${weeksWithPredictions}`);
  console.log(`Total predictions: ${predictionsSnapshot.size}`);

  // Recommendations
  console.log('\n=== Next Steps ===\n');

  if (totalCompleted > 14 && predictionsSnapshot.size === 14) {
    console.log('✅ You have MORE completed games than predictions!');
    console.log('   → You can generate predictions for past weeks to backfill data');
    console.log('   → Or just run generateResults.ts to process existing predictions');
  } else if (totalCompleted === predictionsSnapshot.size) {
    console.log('✅ Completed games match predictions (1:1 ratio)');
    console.log('   → Just run: npx tsx scripts/generateResults.ts');
    console.log('   → This will populate the results collection');
  } else if (predictionsSnapshot.size > totalCompleted) {
    console.log('⚠️  You have predictions for future games');
    console.log('   → Run generateResults.ts now to process completed games');
    console.log('   → Re-run after more games complete');
  }
}

checkHistoricalGames().catch(console.error);
