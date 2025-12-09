import { getAdminDb } from '../lib/firebase/adminConfig';

async function main() {
  const adminDb = getAdminDb();

  console.log('\n=== FIRESTORE CONTENTS ===\n');

  // List all collections
  const collections = await adminDb.listCollections();
  console.log('📁 Collections in Firestore:');
  for (const collection of collections) {
    const snapshot = await collection.listDocuments();
    console.log(`   - ${collection.id} (${snapshot.length} documents)`);
  }

  console.log('\n=== STANDINGS CACHE ===\n');
  const standingsSnapshot = await adminDb.collection('standingsCache').listDocuments();
  for (const docRef of standingsSnapshot) {
    const doc = await docRef.get();
    const data = doc.data();
    console.log(`📄 Document: ${docRef.id}`);
    console.log(`   Season: ${data?.season}, Week: ${data?.week}`);
    console.log(`   Teams: ${data?.standings?.length || 0}`);
    console.log(`   Scraped: ${data?.scrapedAt}`);
  }

  console.log('\n=== TEAM RANKINGS ===\n');
  const rankingsSnapshot = await adminDb.collection('team_rankings').listDocuments();
  for (const docRef of rankingsSnapshot) {
    const doc = await docRef.get();
    const data = doc.data();
    console.log(`📄 Document: ${docRef.id}`);
    console.log(`   Season: ${data?.season}, Week: ${data?.week}`);
    console.log(`   Teams: ${data?.teams?.length || 0}`);
    console.log(`   Calculated: ${data?.calculatedAt}`);
    if (data?.teams && data.teams.length > 0) {
      console.log(`\n   Top 5 Teams:`);
      data.teams.slice(0, 5).forEach((team: any) => {
        console.log(`      ${team.rank}. ${team.team} - TSR: ${team.tsr.toFixed(2)}`);
      });
    }
  }

  console.log('\n=== Firebase Console Links ===\n');
  console.log('🔗 View standingsCache collection:');
  console.log('   https://console.firebase.google.com/u/0/project/betanalytics-f095a/firestore/databases/-default-/data/~2FstandingsCache');
  console.log('\n🔗 View team_rankings collection:');
  console.log('   https://console.firebase.google.com/u/0/project/betanalytics-f095a/firestore/databases/-default-/data/~2Fteam_rankings');
}

main().catch(console.error);
