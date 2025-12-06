# Get Your Firebase Configuration

Your Firebase project is: **betanalytics-f095a**

## Quick Steps to Get Config:

1. **Go to Project Settings:**
   https://console.firebase.google.com/u/0/project/betanalytics-f095a/settings/general

2. **Scroll down to "Your apps"**

3. **If you see a web app already:**
   - Click on it to see the config
   - Copy the `firebaseConfig` object

4. **If NO web app exists yet:**
   - Click the `</>` (web) icon
   - Register app name: `NFL Betting Web`
   - Click "Register app"
   - Copy the config shown

## The Config Will Look Like This:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "betanalytics-f095a.firebaseapp.com",
  projectId: "betanalytics-f095a",
  storageBucket: "betanalytics-f095a.firebasestorage.app",
  messagingSenderId: "...",
  appId: "1:...:web:..."
};
```

## Add to .env.local:

Once you have the config, update your `.env.local` file with:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=betanalytics-f095a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=betanalytics-f095a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=betanalytics-f095a.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...
```

## Or Just Give Me the Config:

If you can see the config in Firebase Console, just paste it here and I'll add it to your .env.local file!
