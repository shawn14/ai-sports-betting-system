/**
 * Read back the test data we just wrote
 */

import { db } from '../lib/firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

async function readTest() {
  console.log('\n🔍 READING TEST DATA BACK\n');

  try {
    // Try to read the specific document we wrote
    console.log('Attempting to read: test_collection/fresh_doc...');
    const docRef = doc(db, 'test_collection', 'fresh_doc');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log('✅ Document found!');
      console.log('Data:', JSON.stringify(docSnap.data(), null, 2));
    } else {
      console.log('❌ Document does not exist');
    }

    // List all collections
    console.log('\n📂 Listing all documents in test_collection...');
    const collectionRef = collection(db, 'test_collection');
    const snapshot = await getDocs(collectionRef);

    console.log(`Found ${snapshot.size} documents:`);
    snapshot.forEach(doc => {
      console.log(`  - ${doc.id}:`, doc.data());
    });

  } catch (error: any) {
    console.error('❌ Error reading:', error.message);
  }
}

readTest();
