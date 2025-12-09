import { getAdminDb } from '../lib/firebase/adminConfig';

/**
 * Check which Firestore database we're connected to
 */

async function checkDatabase() {
  try {
    const db = getAdminDb();

    console.log('\n🔍 Firebase Database Info:\n');
    console.log('Database ID:', db.databaseId || '(default)');
    console.log('Project ID:', db.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    // Try to get the database path
    const testDoc = db.collection('models').doc('test');
    console.log('Database path:', testDoc.path);
    console.log('Full database:', testDoc.parent.parent?.path || 'N/A');

    console.log('\n');
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
