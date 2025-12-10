# Automated Analytics System

This document explains how the automated prediction and analytics system works for PredictionMatrix.

## Overview

The system automatically generates predictions and results for completed NFL games every week, keeping the analytics page updated without manual intervention.

## How It Works

### Automated Schedule

1. **Monday 6:00 AM** - Weekly Data Refresh (`/api/cron/weekly-refresh`)
   - Uploads current week's standings to Firestore cache
   - Caches betting odds from The Odds API
   - Generates predictions and results for any completed games from the previous week

2. **Tuesday 10:00 AM** - Post-Monday Night Football (`/api/cron/generate-predictions`)
   - Catches any games that completed on Monday night
   - Generates predictions and results for those games
   - Ensures all games from the week are processed

### What Gets Automated

✅ **Predictions Generation**
- Loads standings data from JSON files (`public/training/standings_2025_w{week}.json`)
- Fetches completed games from ESPN API
- Calculates TSR (Team Strength Rating) using Matrix model
- Saves predictions to Firestore `predictions` collection

✅ **Results Generation**
- Compares predictions against actual game scores
- Calculates accuracy metrics (winner correct, spread covered, total over)
- Saves results to Firestore `results` collection

✅ **Analytics Page Updates**
- Analytics page reads from `results` collection
- Automatically shows updated statistics for all teams
- No manual intervention needed

### What Requires Manual Work

❌ **Standings Data Files**
- You must manually create/upload the standings JSON file for each week
- File location: `public/training/standings_2025_w{week}.json`
- This step is required BEFORE the cron jobs can generate predictions

**How to create standings file:**
```bash
# Option 1: Use the training page UI to export standings
# Visit http://localhost:3000/training and export JSON

# Option 2: Manually scrape/create the standings JSON
# See existing files in public/training/ for format
```

## Architecture

### API Endpoints

**`POST /api/cron/generate-predictions`**
- Called by: Vercel Cron (and can be called manually)
- Auth: Requires `CRON_SECRET` bearer token
- Function: Generates predictions + results for completed games
- Duration: Up to 5 minutes (300s)

**`GET /api/cron/weekly-refresh`**
- Called by: Vercel Cron (every Monday 6am)
- Auth: Requires `CRON_SECRET` bearer token
- Function: Updates standings cache, odds cache, and generates predictions
- Duration: Up to 1 minute (60s)

3. **Every 2 Hours on Game Days** - Pre-Game Intelligence (`/api/cron/generate-game-intelligence`)
   - Generates injury/weather/news reports for games starting in 60-90 minutes
   - Caches intelligence in Firestore for instant user access
   - Runs on Saturdays, Sundays, Mondays, and Thursdays (game days)

4. **Wednesday 8:00 AM** - Weekly Analyst Report (`/api/cron/weekly-analyst-report`)
   - Generates ESPN-style deep dive analysis of previous week's performance
   - Uses Claude AI to analyze patterns, trends, and betting strategy
   - Saves comprehensive report to Firestore

### Cron Configuration

Located in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-refresh",
      "schedule": "0 6 * * 1"
    },
    {
      "path": "/api/cron/generate-predictions",
      "schedule": "0 10 * * 2"
    },
    {
      "path": "/api/cron/generate-game-intelligence",
      "schedule": "0 */2 * * 0,1,4,6"
    },
    {
      "path": "/api/cron/weekly-analyst-report",
      "schedule": "0 8 * * 3"
    }
  ]
}
```

**Schedule Format:** `minute hour day month weekday`
- `0 6 * * 1` = 6:00 AM every Monday
- `0 10 * * 2` = 10:00 AM every Tuesday
- `0 */2 * * 0,1,4,6` = Every 2 hours on Sunday, Monday, Thursday, Saturday
- `0 8 * * 3` = 8:00 AM every Wednesday

## Manual Testing

You can manually trigger the automation endpoints for testing:

### Test Predictions Generation

```bash
curl -X POST https://predictionmatrix.com/api/cron/generate-predictions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or visit in browser (requires auth):
```
https://predictionmatrix.com/api/cron/generate-predictions?auth=YOUR_CRON_SECRET
```

### Test Weekly Refresh

```bash
curl -X GET https://predictionmatrix.com/api/cron/weekly-refresh \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Weekly Workflow

### Week 15 Example (Current Week)

**Friday/Saturday before games:**
1. Create `public/training/standings_2025_w15.json` (manual)
2. System has standings ready for predictions

**Sunday/Monday - Games Complete:**
3. **Monday 6am** - Cron runs, generates predictions for Sunday games
4. **Tuesday 10am** - Cron runs, catches Monday Night Football game

**Result:**
- All Week 15 predictions saved to Firestore
- All Week 15 results calculated and saved
- Analytics page automatically shows Week 15 data for all teams

### Future Weeks (16, 17, 18)

**All you need to do:**
1. Create `standings_2025_w{week}.json` file before games start
2. Everything else happens automatically

**The system automatically:**
- Fetches completed games from ESPN
- Generates predictions using Matrix model
- Calculates results against actual scores
- Updates analytics page

## Firestore Collections

### `predictions` Collection
```typescript
{
  gameId: string,           // ESPN game ID (document ID)
  season: number,           // 2025
  week: number,             // 1-18
  homeTeam: string,
  awayTeam: string,
  predictedScore: {
    home: number,
    away: number
  },
  predictedSpread: number,
  predictedTotal: number,
  predictedWinner: 'home' | 'away',
  confidence: number,       // 50-95
  gameTime: string,
  timestamp: string
}
```

### `results` Collection
```typescript
{
  gameId: string,           // ESPN game ID (document ID)
  season: number,
  week: number,

  // Predictions
  predictedHomeScore: number,
  predictedAwayScore: number,
  predictedSpread: number,
  predictedTotal: number,
  predictedWinner: 'home' | 'away',

  // Actuals
  actualHomeScore: number,
  actualAwayScore: number,
  actualSpread: number,
  actualTotal: number,
  actualWinner: 'home' | 'away',

  // Results
  winnerCorrect: boolean,   // Did we pick the right winner?
  spreadCovered: boolean,   // Within 7 points?
  totalOver: boolean,       // Did game go over predicted total?
  spreadError: number,      // Abs diff between predicted/actual spread
  totalError: number,       // Abs diff between predicted/actual total

  confidence: number,
  game: {...},             // Team info, venue, etc.
  timestamp: string
}
```

## Environment Variables Required

```bash
# In Vercel dashboard and .env.local
CRON_SECRET=your_secret_here              # For securing cron endpoints
NEXT_PUBLIC_FIREBASE_API_KEY=...          # Firestore access
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... other Firebase config
```

## Monitoring

### Check if cron ran successfully:

1. **Vercel Dashboard → Logs**
   - View cron execution logs
   - See any errors or failures

2. **Firestore Console**
   - Check `predictions` collection for new documents
   - Check `results` collection for new results
   - Verify week number matches current week

3. **Analytics Page**
   - Visit https://predictionmatrix.com/analytics
   - Should show updated stats for all teams
   - Game counts should include latest week

## Troubleshooting

### Analytics not updating?

1. **Check standings file exists:**
   ```bash
   ls public/training/standings_2025_w*.json
   ```

2. **Check if predictions were generated:**
   - Go to Firestore Console
   - Look in `predictions` collection
   - Filter by `week == 15` (or current week)

3. **Check if results were generated:**
   - Go to Firestore Console
   - Look in `results` collection
   - Should match number of predictions

4. **Manually trigger cron:**
   ```bash
   curl -X POST http://localhost:3000/api/cron/generate-predictions \
     -H "Authorization: Bearer test"
   ```

### "Standings file not found" error?

**Cause:** The `standings_2025_w{week}.json` file doesn't exist yet.

**Solution:** Create the standings file before running predictions:
1. Visit `/training` page
2. Collect standings data
3. Export to JSON
4. Save as `public/training/standings_2025_w{week}.json`

### Predictions generated but no results?

**Cause:** Games haven't completed yet (status not 'completed' in ESPN API).

**Solution:** Wait until games finish, or manually mark games as completed in test environment.

## Benefits of This System

✅ **Hands-off Analytics**
- No more running scripts manually after each week
- Analytics page stays current automatically

✅ **Consistent Timing**
- Predictions generated at same time every week
- Results calculated right after games finish

✅ **Error Recovery**
- Two cron jobs (Monday + Tuesday) ensure all games are caught
- If Monday run misses MNF, Tuesday catches it

✅ **Scalability**
- System handles 14-17 games per week automatically
- Works for regular season and playoffs

## Limitations

⚠️ **Standings Files Required**
- You must create the standings JSON file before each week
- Cannot be fully automated without a reliable standings API

⚠️ **Cron Timing**
- Runs at fixed times (Monday 6am, Tuesday 10am)
- May miss late-finishing games on rare occasions

⚠️ **API Rate Limits**
- ESPN API: No official limit but be respectful
- The Odds API: 500 requests/month (cached to minimize usage)

## Future Improvements

🔮 **Potential Enhancements:**
- Auto-generate standings from ESPN API (if format improves)
- Add email notifications when cron runs
- Dashboard to manually trigger predictions for specific weeks
- Retry logic for failed predictions
- Webhook to trigger immediately after last game completes

---

**Last Updated:** 2025-12-10
**Current Season:** 2025 NFL Season
**Weeks Automated:** 1-18 (regular season + playoffs)
