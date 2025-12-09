/**
 * FRESH FIREBASE CONFIGURATION
 * Simple, clean setup for both Next.js app and standalone scripts
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Load environment variables for standalone scripts
// (Next.js automatically loads .env.local, but tsx scripts don't)
if (typeof window === 'undefined') {
  // Server-side: check if env vars are loaded
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn('⚠️  Firebase env vars not loaded, attempting to load from .env.local...');
    try {
      const { loadEnvFile } = require('./loadEnv');
      loadEnvFile();
    } catch (error) {
      console.error('❌ Failed to load .env.local:', error);
    }
  }
}

// Firebase configuration from environment variables
// Trim whitespace and newlines to prevent malformed URLs
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
};

// Validate required fields
const requiredFields = ['projectId', 'apiKey', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

if (missingFields.length > 0) {
  console.error('❌ Missing required Firebase config fields:', missingFields);
  console.error('Current config:', {
    projectId: firebaseConfig.projectId ? '✓' : '✗',
    apiKey: firebaseConfig.apiKey ? '✓' : '✗',
    appId: firebaseConfig.appId ? '✓' : '✗',
  });
  throw new Error(`Missing Firebase config: ${missingFields.join(', ')}`);
}

// Initialize Firebase app (singleton pattern)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized:', firebaseConfig.projectId);
} else {
  app = getApp();
}

// Initialize Firestore
export const db: Firestore = getFirestore(app);

// Export app as default
export default app;
