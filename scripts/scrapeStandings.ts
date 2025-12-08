import { NFLStandingsScraper } from '../lib/scrapers/nflStandingsScraper';
import { StandingsCacheService } from '../lib/firebase/standingsCache';

async function main() {
  const season = parseInt(process.argv[2] || '2025');
  const week = parseInt(process.argv[3] || '15');

  console.log(`\n🏈 NFL Standings Scraper`);
  console.log(`========================`);
  console.log(`Season: ${season}`);
  console.log(`Week: ${week}\n`);

  try {
    // Scrape standings
    console.log(`Scraping NFL.com standings for ${season} season...`);
    const standings = await NFLStandingsScraper.scrapeStandings(season);

    if (standings.length === 0) {
      console.error('❌ No standings data found!');
      process.exit(1);
    }

    console.log(`\n✅ Found ${standings.length} teams\n`);

    // Show sample data
    console.log('Sample team data:');
    const sampleTeam = standings[0];
    console.log(JSON.stringify(sampleTeam, null, 2));

    // Check for data issues before saving
    const hasNaN = standings.some(team =>
      isNaN(team.wins) || isNaN(team.losses) || isNaN(team.pointsFor) || isNaN(team.pointsAgainst)
    );
    if (hasNaN) {
      console.warn('⚠️  Warning: Some teams have NaN values!');
    }

    // Calculate league averages
    console.log('\nCalculating league averages...');
    const leagueAvg = NFLStandingsScraper.calculateLeagueAverages(standings);
    console.log('League Averages:');
    console.log(`  PF/game: ${leagueAvg.avgPFpg.toFixed(2)}`);
    console.log(`  PA/game: ${leagueAvg.avgPApg.toFixed(2)}`);
    console.log(`  Net/game: ${leagueAvg.avgNetPG.toFixed(2)}`);

    // Save to JSON file first (for debugging)
    const fs = await import('fs/promises');
    const jsonPath = `./public/training/standings_${season}_w${week}.json`;
    await fs.writeFile(jsonPath, JSON.stringify(standings, null, 2));
    console.log(`\n✅ Saved to JSON: ${jsonPath}`);

    // Save to Firebase
    console.log(`\nSaving to Firebase...`);
    try {
      await StandingsCacheService.saveStandings(season, week, standings);
      console.log(`\n✅ SUCCESS! Standings saved to Firebase.`);
      console.log(`Cache ID: standings_cache/${season}_w${week}`);
      console.log(`Expires: 7 days from now\n`);
    } catch (firebaseError) {
      console.error('\n⚠️  Firebase save failed, but JSON file was saved successfully.');
      console.error('You can use the JSON file for testing the Matrix predictor.');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
