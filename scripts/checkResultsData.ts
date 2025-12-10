import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

async function checkResults() {
  console.log('\n=== Checking Firestore Results Collection ===\n');

  // Check total results count
  const allResultsQuery = query(collection(db, 'results'));
  const allSnapshot = await getDocs(allResultsQuery);
  console.log(`Total results documents: ${allSnapshot.size}`);

  // Check 2025 results
  const results2025Query = query(
    collection(db, 'results'),
    where('season', '==', 2025)
  );
  const snapshot2025 = await getDocs(results2025Query);
  console.log(`Results for 2025 season: ${snapshot2025.size}`);

  // Sample a few documents
  if (snapshot2025.size > 0) {
    console.log('\n=== Sample Documents ===\n');
    let count = 0;
    snapshot2025.docs.slice(0, 3).forEach((doc) => {
      count++;
      const data = doc.data();
      console.log(`\nDocument ${count}:`);
      console.log(`  gameId: ${data.gameId}`);
      console.log(`  season: ${data.season}`);
      console.log(`  week: ${data.week}`);
      console.log(`  spreadCovered: ${data.spreadCovered}`);
      console.log(`  totalOver: ${data.totalOver}`);
      console.log(`  winnerCorrect: ${data.winnerCorrect}`);
      console.log(`  game.homeTeam: ${data.game?.homeTeam?.name || 'MISSING'}`);
      console.log(`  game.awayTeam: ${data.game?.awayTeam?.name || 'MISSING'}`);
    });
  } else {
    console.log('\nNo results found for 2025 season.');
    console.log('\nChecking if any results exist for other seasons...');

    const anyResultsQuery = query(collection(db, 'results'), limit(3));
    const anySnapshot = await getDocs(anyResultsQuery);

    if (anySnapshot.size > 0) {
      console.log(`\nFound ${anySnapshot.size} results in other seasons:`);
      anySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  Season ${data.season}, Week ${data.week}`);
      });
    }
  }
}

checkResults().catch(console.error);
