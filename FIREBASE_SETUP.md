# Firebase Setup Guide

## Step 1: Create a Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: `nfl-betting-system` (or your preferred name)
4. Disable Google Analytics (optional for this project)
5. Click "Create project"

## Step 2: Set Up Firestore Database

1. In the Firebase Console, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in **test mode**" (we'll secure it later)
4. Select a Cloud Firestore location (choose closest to you, e.g., `us-central`)
5. Click "Enable"

## Step 3: Get Firebase Config

1. In the Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps"
4. Click the web icon `</>` to add a web app
5. Give it a nickname: `NFL Betting Web App`
6. Click "Register app"
7. Copy the `firebaseConfig` object

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## Step 4: Add Config to .env.local

Open `/Users/shawncarpenter/Desktop/nfl-betting-system/.env.local` and replace the Firebase placeholders:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

## Step 5: Set Up Firestore Security Rules (Optional but Recommended)

In the Firebase Console:
1. Go to "Firestore Database"
2. Click on the "Rules" tab
3. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for games, predictions, and results
    match /games/{gameId} {
      allow read: if true;
      allow write: if true;  // In production, add authentication
    }

    match /predictions/{predictionId} {
      allow read: if true;
      allow write: if true;  // In production, add authentication
    }

    match /betting_lines/{lineId} {
      allow read: if true;
      allow write: if true;
    }

    match /results/{resultId} {
      allow read: if true;
      allow write: if true;
    }

    match /bets/{betId} {
      allow read: if true;
      allow write: if true;  // In production, restrict to authenticated users
    }
  }
}
```

4. Click "Publish"

## Step 6: Restart Your Development Server

After adding the Firebase config to `.env.local`:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
cd ~/Desktop/nfl-betting-system
PORT=3001 npm run dev
```

## Step 7: Verify Connection

Open your browser console (F12 or Cmd+Option+I) and check for any Firebase errors. You should see successful connections when you navigate through the app.

## What Gets Stored in Firestore

The system will automatically store:

### Collections:

1. **games** - All NFL games
   - Game ID, teams, scores, status, date/time

2. **predictions** - Your model's predictions
   - Predicted winner, score, confidence, factors
   - Linked to game ID

3. **betting_lines** - Historical betting lines
   - Spread, moneyline, totals from multiple sportsbooks
   - Timestamped for line movement tracking

4. **results** - Prediction outcomes (after games complete)
   - Actual vs predicted scores
   - Win/loss, accuracy metrics
   - Profit/loss calculations

5. **bets** - User's actual bets placed
   - Bet type, stake, odds, bookmaker
   - Status (pending/won/lost/push)
   - P/L tracking

## Firestore Data Structure

```
nfl-betting-system (database)
├── games/
│   └── {gameId}
│       ├── id: string
│       ├── season: number
│       ├── week: number
│       ├── homeTeam: object
│       ├── awayTeam: object
│       ├── gameTime: timestamp
│       ├── homeScore: number
│       ├── awayScore: number
│       └── status: string
│
├── predictions/
│   └── {predictionId}
│       ├── gameId: string
│       ├── predictedWinner: string
│       ├── confidence: number
│       ├── predictedScore: object
│       ├── factors: array
│       ├── recommendation: string
│       └── timestamp: timestamp
│
├── betting_lines/
│   └── {lineId}
│       ├── gameId: string
│       ├── bookmaker: string
│       ├── spread: object
│       ├── moneyline: object
│       ├── total: object
│       └── timestamp: timestamp
│
├── results/
│   └── {gameId}
│       ├── gameId: string
│       ├── actualScore: object
│       ├── outcomes: object
│       ├── profitLoss: object
│       └── timestamp: timestamp
│
└── bets/
    └── {betId}
        ├── gameId: string
        ├── betType: string
        ├── selection: string
        ├── stake: number
        ├── odds: number
        ├── bookmaker: string
        ├── status: string
        └── timestamp: timestamp
```

## Free Tier Limits

Firestore free tier includes:
- 1 GB storage
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day

This is more than enough for personal NFL betting tracking!

## Troubleshooting

### Error: "Firebase: No Firebase App"
- Make sure you added all 6 Firebase env variables to `.env.local`
- Restart the dev server after adding env variables

### Error: "Missing or insufficient permissions"
- Check Firestore security rules
- Make sure test mode is enabled or rules allow access

### Data not saving
- Open browser console and check for errors
- Verify Firebase project is active
- Check network tab for failed requests

---

**Once Firebase is configured, your predictions and results will automatically persist to the database!**
