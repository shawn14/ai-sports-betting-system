// Script to manually trigger rankings generation for a specific week
// This is useful for populating rankings cache with trend data

const season = process.argv[2] ? parseInt(process.argv[2]) : 2025;
const week = process.argv[3] ? parseInt(process.argv[3]) : 13;

console.log(`\n🔄 Generating rankings for ${season} Week ${week}...`);

fetch(`http://localhost:3001/api/rankings?season=${season}&week=${week}`)
  .then(async res => {
    if (!res.ok) {
      const error = await res.text();
      console.error(`❌ Failed: ${error}`);
      process.exit(1);
    }
    return res.json();
  })
  .then(data => {
    console.log(`✅ Generated rankings for ${data.teams.length} teams`);
    console.log(`   Source: ${data.source}`);
    console.log(`\nTop 5 teams:`);
    data.teams.slice(0, 5).forEach((team: any, idx: number) => {
      console.log(`   ${idx + 1}. ${team.team} (TSR: ${team.tsr.toFixed(1)}, Trend: ${team.trend})`);
    });
  })
  .catch(err => {
    console.error(`❌ Error:`, err.message);
    process.exit(1);
  });
