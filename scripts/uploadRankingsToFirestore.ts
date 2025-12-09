import { db } from '../lib/firebase/config';
import { doc, setDoc, collection } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function uploadRankings() {
  try {
    // Read standings data
    const standingsPath = path.join(process.cwd(), 'public', 'training', 'standings_2025_w14.json');
    const standingsData = JSON.parse(fs.readFileSync(standingsPath, 'utf-8'));

    console.log(`\n✅ Loaded ${standingsData.length} teams from standings file\n`);

    // Calculate TSR rankings (simplified version)
    const rankings = standingsData.map((team: any, index: number) => {
      const gp = team.wins + team.losses + team.ties;
      const pfpg = team.pointsFor / gp;
      const papg = team.pointsAgainst / gp;
      const netPG = pfpg - papg;

      // Simple TSR calculation
      const tsr = netPG * 10 + (team.wins / gp) * 50;

      return {
        team: team.team,
        conference: team.conference,
        division: team.division,
        record: `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''}`,
        tsr: tsr,
        netPoints: netPG,
        momentum: 0,
        conference: 0,
        homeAdvantage: 0,
        offensive: pfpg - 20, // Relative to league average ~20ppg
        defensive: 20 - papg, // Inverted
        rank: 0,
        trend: 'same' as const
      };
    });

    // Sort by TSR
    rankings.sort((a, b) => b.tsr - a.tsr);
    rankings.forEach((team, index) => {
      team.rank = index + 1;
    });

    console.log('📊 Top 5 Teams:');
    rankings.slice(0, 5).forEach(team => {
      console.log(`   ${team.rank}. ${team.team} - TSR: ${team.tsr.toFixed(2)}`);
    });

    // Upload to Firestore using CLIENT SDK
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const rankingsData = {
      season: 2025,
      week: 14,
      teams: rankings,
      calculatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    console.log('\n📤 Uploading to Firestore (client SDK)...');

    const docRef = doc(db, 'team_rankings', '2025_w14');
    await setDoc(docRef, rankingsData);

    console.log('✅ Successfully uploaded rankings to Firestore!');
    console.log('🔗 View in console: https://console.firebase.google.com/u/0/project/betanalytics-f095a/firestore/databases/-default-/data/~2Fteam_rankings~2F2025_w14');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('   Code:', error.code);
  }
}

uploadRankings();
