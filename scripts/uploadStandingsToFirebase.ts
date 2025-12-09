import { getAdminDb } from '../lib/firebase/adminConfig';
import { NFLStandingsData } from '../lib/scrapers/nflStandingsScraper';
import * as fs from 'fs';
import * as path from 'path';

async function uploadStandings(season: number, week: number) {
  const filePath = path.join(process.cwd(), 'public', 'training', `standings_${season}_w${week}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  console.log(`📂 Reading ${filePath}...`);
  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const standings: NFLStandingsData[] = JSON.parse(fileContents);

  console.log(`✅ Loaded ${standings.length} teams`);
  console.log(`📤 Uploading to Firebase using Admin SDK...`);

  const adminDb = getAdminDb();
  const cacheId = `${season}-w${week}`;

  // Clean data - remove any invalid properties and ensure all values are valid
  const cleanedStandings = standings.map(team => {
    const cleaned: any = {};
    cleaned.team = String(team.team || 'Unknown');
    cleaned.conference = String(team.conference || 'Unknown');
    cleaned.division = String(team.division || 'Unknown');

    const numFields = [
      'wins', 'losses', 'ties',
      'pointsFor', 'pointsAgainst',
      'homeWins', 'homeLosses',
      'roadWins', 'roadLosses',
      'confWins', 'confLosses',
      'last5Wins', 'last5Losses'
    ];

    for (const field of numFields) {
      const value = (team as any)[field];
      cleaned[field] = (typeof value === 'number' && Number.isFinite(value)) ? value : 0;
    }

    return cleaned;
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const data = {
    season,
    week,
    standings: cleanedStandings,
    scrapedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  await adminDb.collection('standings_cache').doc(cacheId).set(data);

  console.log(`✅ Successfully uploaded standings for ${season} week ${week}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Upload 2025 weeks 14 and 15 by default
    console.log('Uploading default weeks: 2025 w14 and w15...\n');
    await uploadStandings(2025, 14);
    console.log('');
    await uploadStandings(2025, 15);
  } else if (args.length === 2) {
    const season = parseInt(args[0]);
    const week = parseInt(args[1]);
    await uploadStandings(season, week);
  } else {
    console.log('Usage: npm run upload-standings [season week]');
    console.log('Example: npm run upload-standings 2025 14');
    console.log('Or run without args to upload 2025 w14 and w15');
  }
}

main().catch(console.error);
