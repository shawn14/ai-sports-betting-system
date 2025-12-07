import { getAuth, signOut as firebaseSignOut } from 'firebase/auth';
import app from './config';

// Initialize Firebase Auth
export const auth = getAuth(app);

// Sign out function
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
    // Clear any local storage or session storage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser;
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}
