'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { auth } from '@/lib/firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

export interface UserPreferences {
  showTicker: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  showTicker: false, // Hide ticker by default
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
      if (!user) {
        // User logged out, reset to defaults
        setPreferences(DEFAULT_PREFERENCES);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load preferences from Firestore when user changes
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const prefDoc = await getDoc(doc(db, 'user_preferences', userId));
        if (prefDoc.exists()) {
          setPreferences(prefDoc.data() as UserPreferences);
        } else {
          // No preferences saved yet, use defaults
          setPreferences(DEFAULT_PREFERENCES);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
        setPreferences(DEFAULT_PREFERENCES);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [userId]);

  // Update preference in Firestore
  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!userId) {
      console.warn('Cannot update preferences: user not logged in');
      return;
    }

    try {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);

      // Save to Firestore
      await setDoc(doc(db, 'user_preferences', userId), newPreferences, { merge: true });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      // Revert on error
      setPreferences(preferences);
    }
  };

  return {
    preferences,
    loading,
    updatePreference,
    isLoggedIn: !!userId,
  };
}
