import { NFLAPI } from '../lib/api/nfl';

async function checkAllWeeksAvailable() {
  console.log('\n=== Checking Available Week Data from ESPN ===\n');

  const season = 2025;

  for (let week = 1; week <= 18; week++) {
    try {
      const games = await NFLAPI.getWeekGames(season, week);

      const completed = games.filter(g => g.status === 'completed').length;
      const scheduled = games.filter(g => g.status !== 'completed').length;
      const total = games.length;

      const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      if (total > 0) {
        console.log(
          `Week ${week.toString().padStart(2)}: ${completed}/${total} completed (${completedPercent}%) | ${scheduled} scheduled/in-progress`
        );
      }
    } catch (error) {
      console.log(`Week ${week.toString().padStart(2)}: No data available`);
    }
  }

  console.log('\n=== Summary ===\n');
  console.log('This shows what weeks have data available from ESPN API.');
  console.log('Completed games can be used to generate predictions and results.');
}

checkAllWeeksAvailable().catch(console.error);
