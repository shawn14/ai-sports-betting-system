import { getAdminDb } from '../lib/firebase/adminConfig';

async function test() {
  const adminDb = getAdminDb();
  const cacheId = '2025_w14';

  console.log('Checking team_rankings collection...');
  const rankingsDoc = await adminDb.collection('team_rankings').doc(cacheId).get();

  if (rankingsDoc.exists) {
    const data = rankingsDoc.data();
    console.log('✅ Found rankings!');
    console.log(`Teams count: ${data?.teams?.length}`);
    console.log(`Calculated at: ${data?.calculatedAt}`);
    console.log(`Expires at: ${data?.expiresAt}`);
    if (data?.teams?.[0]) {
      console.log(`First team: ${data.teams[0].team} - TSR: ${data.teams[0].tsr}`);
    }
  } else {
    console.log('❌ No rankings found');
  }
}

test();
