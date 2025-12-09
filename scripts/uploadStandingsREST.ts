/**
 * Upload all standings using REST API
 */

import { setDocument } from '../lib/firebase/restClient';
import * as fs from 'fs';
import * as path from 'path';

async function uploadStandings(season: number, week: number): Promise<boolean> {
  const filePath = path.join(process.cwd(), 'public', 'training', `standings_${season}_w${week}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: standings_${season}_w${week}.json`);
    return false;
  }

  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const standings = JSON.parse(fileContents);

  // Clean data
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
    conference: team.conference || 'Unknown',
    division: team.division || 'Unknown'
  }));

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const data = {
    season,
    week,
    standings: cleanedStandings,
    scrapedAt: now,
    expiresAt: expiresAt
  };

  const cacheId = `${season}-w${week}`;

  try {
    await setDocument('standings_cache', cacheId, data);
    console.log(`✅ ${season} week ${week} (${standings.length} teams)`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${season} week ${week} - Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🚀 UPLOADING ALL STANDINGS WITH REST API\n');

  const standingsDir = path.join(process.cwd(), 'public', 'training');
  const files = fs.readdirSync(standingsDir).filter(f => f.startsWith('standings_') && f.endsWith('.json'));

  console.log(`📂 Found ${files.length} standings files\n`);

  let successCount = 0;
  let failCount = 0;

  // Parse season/week from filenames
  const uploads: Array<{season: number, week: number}> = [];
  for (const file of files) {
    const match = file.match(/standings_(\d{4})_w(\d+)\.json/);
    if (match) {
      uploads.push({ season: parseInt(match[1]), week: parseInt(match[2]) });
    }
  }

  // Sort by season and week
  uploads.sort((a, b) => a.season === b.season ? a.week - b.week : a.season - b.season);

  // Upload sequentially
  for (let i = 0; i < uploads.length; i++) {
    const { season, week } = uploads[i];
    const success = await uploadStandings(season, week);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n📊 SUMMARY:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Collection: standings_cache`);
  console.log(`   🔗 View: https://console.firebase.google.com/project/betanalytics-f095a/firestore/data/standings_cache\n`);
}

main();
