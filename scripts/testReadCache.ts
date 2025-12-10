import { db } from '../lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

async function testReadCache() {
  try {
    const cacheId = '2025-w15';
    console.log(`\n🔍 Attempting to read: standings_cache/${cacheId}`);

    const cacheRef = doc(db, 'standings_cache', cacheId);
    const cacheDoc = await getDoc(cacheRef);

    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      console.log('\n✅ Document exists!');
      console.log(`   Season: ${data.season}`);
      console.log(`   Week: ${data.week}`);
      console.log(`   Teams: ${data.standings?.length || 0}`);
      console.log(`   ScrapedAt: ${data.scrapedAt?.toDate()}`);
      console.log(`   ExpiresAt: ${data.expiresAt?.toDate()}`);
      console.log(`   Now: ${new Date()}`);
      console.log(`   Is expired? ${new Date() > data.expiresAt?.toDate()}`);

      if (data.standings && data.standings.length > 0) {
        console.log(`\n📋 First 3 teams:`);
        data.standings.slice(0, 3).forEach((team: any) => {
          console.log(`   - ${team.team} (${team.wins}-${team.losses})`);
        });
      }
    } else {
      console.log('\n❌ Document does NOT exist!');
      console.log('   This means the upload failed or went to wrong collection/document');
    }
  } catch (error: any) {
    console.error('\n❌ Error reading from Firestore:');
    console.error(`   Code: ${error?.code}`);
    console.error(`   Message: ${error?.message}`);
  }
}

testReadCache().catch(console.error);
