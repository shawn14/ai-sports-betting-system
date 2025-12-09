import { RankingsService } from '../lib/services/rankingsService';

async function main() {
  try {
    console.log('Calculating rankings for 2025 week 14...');
    const rankings = await RankingsService.calculateAndCacheRankings(2025, 14);
    console.log(`\n✅ Successfully calculated and cached ${rankings.length} team rankings`);
    console.log('\nTop 5 teams:');
    rankings.slice(0, 5).forEach(team => {
      console.log(`${team.rank}. ${team.team} - TSR: ${team.tsr.toFixed(2)}, Offense: ${team.offensive.toFixed(2)}, Defense: ${team.defensive.toFixed(2)}`);
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

main();
