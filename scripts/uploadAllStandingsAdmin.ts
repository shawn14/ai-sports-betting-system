import { getAdminDb } from '../lib/firebase/adminConfig';
import * as fs from 'fs';
import * as path from 'path';

interface StandingsFile {
  season: number;
  week: number;
  filePath: string;
}

async function uploadStandings(season: number, week: number, filePath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const standings = JSON.parse(fileContents);

    // Clean data - Firebase doesn't like empty strings, NaN, Infinity, or undefined
    const cleanedStandings = standings.map((team: any) => ({
      team: team.team || 'Unknown',
      wins: Number.isFinite(team.wins) ? team.wins : 0,
      losses: Number.isFinite(team.losses) ? team.losses : 0,
      ties: Number.isFinite(team.ties) ? team.ties : 0,
      pointsFor: Number.isFinite(team.pointsFor) ? team.pointsFor : 0,
      pointsAgainst: Number.isFinite(team.pointsAgainst) ? team.pointsAgainst : 0,
      homeWins: Number.isFinite(team.homeWins) ? team.homeWins : 0,
      homeLosses: Number.isFinite(team.homeLosses) ? team.homeLosses : 0,
      roadWins: Number.isFinite(team.roadWins) ? team.roadWins : 0,
      roadLosses: Number.isFinite(team.roadLosses) ? team.roadLosses : 0,
      confWins: Number.isFinite(team.confWins) ? team.confWins : 0,
      confLosses: Number.isFinite(team.confLosses) ? team.confLosses : 0,
      last5Wins: Number.isFinite(team.last5Wins) ? team.last5Wins : 0,
      last5Losses: Number.isFinite(team.last5Losses) ? team.last5Losses : 0,
      conference: (team.conference && team.conference !== '') ? team.conference : 'Unknown',
      division: (team.division && team.division !== '') ? team.division : 'Unknown'
    }));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const data = {
      season,
      week,
      standings: cleanedStandings,
      scrapedAt: now,  // Admin SDK handles Date objects natively
      expiresAt: expiresAt
    };

    const db = getAdminDb();
    const cacheId = `${season}-w${week}`;
    await db.collection('standings_cache').doc(cacheId).set(data);

    console.log(`✅ ${season} week ${week} (${cleanedStandings.length} teams)`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${season} week ${week}: ${error?.message}`);
    return false;
  }
}

async function main() {
  const trainingDir = path.join(process.cwd(), 'public', 'training');

  // Find all standings files
  const files = fs.readdirSync(trainingDir)
    .filter(file => file.startsWith('standings_') && file.endsWith('.json'))
    .sort();

  console.log(`\n📂 Found ${files.length} standings files\n`);
  console.log(`🚀 Starting upload to Firestore using ADMIN SDK...\n`);

  const standingsFiles: StandingsFile[] = files.map(file => {
    // Parse filename: standings_2024_w1.json
    const match = file.match(/standings_(\d{4})_w(\d+)\.json/);
    if (!match) return null;

    return {
      season: parseInt(match[1]),
      week: parseInt(match[2]),
      filePath: path.join(trainingDir, file)
    };
  }).filter(f => f !== null) as StandingsFile[];

  let successCount = 0;
  let failCount = 0;

  for (const { season, week, filePath } of standingsFiles) {
    const success = await uploadStandings(season, week, filePath);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay to avoid overwhelming Firestore
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Total files: ${standingsFiles.length}`);
  console.log(`\n🎉 Migration complete!\n`);

  // Exit explicitly since Admin SDK keeps process alive
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
