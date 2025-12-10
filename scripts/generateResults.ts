import { db } from '../lib/firebase/config';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';

async function generateResults() {
  console.log('\n=== Generating Results from Predictions + Games ===\n');

  // Get all predictions
  const predictionsSnapshot = await getDocs(collection(db, 'predictions'));
  console.log(`Found ${predictionsSnapshot.size} predictions`);

  // Get all completed games
  const gamesQuery = query(collection(db, 'games'), where('status', '==', 'completed'));
  const gamesSnapshot = await getDocs(gamesQuery);
  console.log(`Found ${gamesSnapshot.size} completed games`);

  // Create a map of games by ID
  const gamesMap = new Map();
  gamesSnapshot.forEach(doc => {
    const game = doc.data();
    gamesMap.set(game.id, game);
  });

  let created = 0;
  let skipped = 0;

  // Process each prediction
  for (const predDoc of predictionsSnapshot.docs) {
    const prediction = predDoc.data();
    const game = gamesMap.get(prediction.gameId);

    // Skip if game not completed or doesn't exist
    if (!game || game.status !== 'completed' || game.homeScore === null || game.awayScore === null) {
      skipped++;
      continue;
    }

    // Calculate results
    const actualHomeScore = game.homeScore;
    const actualAwayScore = game.awayScore;
    const actualSpread = actualHomeScore - actualAwayScore;
    const actualTotal = actualHomeScore + actualAwayScore;

    const predictedHomeScore = prediction.predictedScore?.home || 0;
    const predictedAwayScore = prediction.predictedScore?.away || 0;
    const predictedSpread = predictedHomeScore - predictedAwayScore;
    const predictedTotal = predictedHomeScore + predictedAwayScore;

    // Winner prediction
    const actualWinner = actualHomeScore > actualAwayScore ? 'home' : 'away';
    const predictedWinner = prediction.predictedWinner || (predictedHomeScore > predictedAwayScore ? 'home' : 'away');
    const winnerCorrect = actualWinner === predictedWinner;

    // Spread covered (did the prediction beat the actual spread)
    const spreadError = Math.abs(predictedSpread - actualSpread);
    const spreadCovered = spreadError <= 7; // Within 7 points is considered "covered"

    // Total over/under
    const totalError = Math.abs(predictedTotal - actualTotal);
    const totalOver = actualTotal > predictedTotal;

    // Create result document
    const result = {
      gameId: prediction.gameId,
      season: prediction.season || game.season,
      week: prediction.week || game.week,

      // Predicted values
      predictedHomeScore,
      predictedAwayScore,
      predictedSpread,
      predictedTotal,
      predictedWinner,

      // Actual values
      actualHomeScore,
      actualAwayScore,
      actualSpread,
      actualTotal,
      actualWinner,

      // Results
      winnerCorrect,
      spreadCovered,
      totalOver,
      spreadError,
      totalError,

      // Confidence
      confidence: prediction.confidence || 50,

      // Game reference for team info
      game: {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameTime: game.gameTime,
        venue: game.venue
      },

      timestamp: new Date()
    };

    // Save to Firestore
    await setDoc(doc(db, 'results', prediction.gameId), result);
    created++;

    if (created % 10 === 0) {
      console.log(`Created ${created} results...`);
    }
  }

  console.log(`\n✅ Results generation complete!`);
  console.log(`   Created: ${created} results`);
  console.log(`   Skipped: ${skipped} (games not completed or missing)`);
}

generateResults().catch(console.error);
