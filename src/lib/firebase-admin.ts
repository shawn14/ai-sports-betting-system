import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const rawCredentials = process.env.FIREBASE_ADMIN_CREDENTIALS;

if (!rawCredentials) {
  throw new Error('FIREBASE_ADMIN_CREDENTIALS is not set.');
}

const credentialsJson = rawCredentials.trim().startsWith('{')
  ? rawCredentials
  : Buffer.from(rawCredentials, 'base64').toString('utf8');

const serviceAccount = JSON.parse(credentialsJson);

const adminApp = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0];

export const adminDb = getFirestore(adminApp);
