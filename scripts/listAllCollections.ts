import { getAdminDb } from '../lib/firebase/adminConfig';

/**
 * List all Firestore collections
 */

async function listCollections() {
  try {
    console.log('\n📋 Listing all Firestore collections...\n');

    const db = getAdminDb();

    // Get project info
    console.log(`Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}\n`);

    // List all collections
    const collections = await db.listCollections();

    console.log(`Found ${collections.length} collections:\n`);

    for (const collection of collections) {
      const snapshot = await collection.limit(1).get();
      console.log(`📁 ${collection.id} (${snapshot.size > 0 ? 'has data' : 'empty'})`);
    }

    console.log('\n✅ Complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listCollections();
