import { db } from '../lib/firebase/config';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
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
  const standings = JSON.parse(fileContents);

  console.log(`✅ Loaded ${standings.length} teams`);
  console.log(`📤 Uploading to Firebase using CLIENT SDK...`);

  const cacheId = `${season}-w${week}`;

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
    scrapedAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt)
  };

  try {
    const cacheRef = doc(db, 'standings_cache', cacheId);
    console.log(`Writing to collection: standings_cache, doc ID: ${cacheId}`);

    // Log the data being written
    console.log(`Data summary:`);
    console.log(`  - season: ${data.season}`);
    console.log(`  - week: ${data.week}`);
    console.log(`  - teams: ${data.standings.length}`);
    console.log(`  - scrapedAt: ${data.scrapedAt}`);
    console.log(`  - expiresAt: ${data.expiresAt}`);

    await setDoc(cacheRef, data);

    console.log(`✅ Successfully uploaded standings for ${season} week ${week}`);
    console.log(`   Document ID: ${cacheId}`);
    console.log(`   Collection: standings_cache`);
  } catch (error: any) {
    console.error(`❌ Failed to write to Firestore:`);
    console.error(`Error code: ${error?.code}`);
    console.error(`Error message: ${error?.message}`);
    console.error(`Error stack:`, error?.stack);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Upload 2025 week 15 by default
    console.log('Uploading default: 2025 w15...\n');
    await uploadStandings(2025, 15);
  } else if (args.length === 2) {
    const season = parseInt(args[0]);
    const week = parseInt(args[1]);
    await uploadStandings(season, week);
  } else {
    console.log('Usage: tsx scripts/uploadStandingsClient.ts [season week]');
    console.log('Example: tsx scripts/uploadStandingsClient.ts 2025 15');
  }
}

main().catch(console.error);
