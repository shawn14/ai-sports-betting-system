import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminDb: Firestore;

/**
 * Initialize Firebase Admin SDK for server-side operations (scripts)
 * This uses the regular Firebase config since we don't have a service account key
 */
export function getAdminDb(): Firestore {
  if (adminDb) return adminDb;

  // Check if already initialized
  const apps = getApps();
  if (apps.length > 0) {
    adminApp = apps[0];
  } else {
    // Initialize with application default credentials
    // In production, you'd use a service account key file
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  adminDb = getFirestore(adminApp);
  return adminDb;
}

export { adminDb };
