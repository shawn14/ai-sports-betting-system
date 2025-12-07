# 🔄 Data Update System - Professional Approach

Your betting system now works like a professional betting site with **cached data** and **scheduled updates**.

## 🎯 How It Works Now

### Before (Inefficient):
- ❌ Every page load = fresh API calls
- ❌ Wasted API quota
- ❌ Slow page loads (10-30 seconds)
- ❌ Rate limits from APIs

### After (Professional):
- ✅ Load from Firebase cache (instant!)
- ✅ Manual refresh button when you want
- ✅ Scheduled background updates
- ✅ Shows "last updated" timestamp

---

## 🚀 How to Use

### 1️⃣ **Visit Predictions Page**
```
http://localhost:3001/predictions
```

- **First load**: Instantly loads cached data from Firebase
- **Shows**: "Last updated: Dec 6, 2025 at 2:30 PM"
- **Fast**: No API calls, just reads from database

### 2️⃣ **Update Data When You Want**
Click the **"Refresh Data"** button in top-right corner

**What happens:**
1. Calls `/api/update-data` endpoint
2. Fetches latest from ESPN, The Odds API, Weather API
3. Generates new predictions
4. Saves to Firebase (creates new cache)
5. Reloads page with fresh data

**When to refresh:**
- Before making bets (get latest lines)
- After significant news (injury, weather change)
- When lines move significantly
- Once per day minimum

### 3️⃣ **Automated Updates (Optional)**

Set up a cron job to auto-refresh every 30 minutes:

**Option A: macOS/Linux Crontab**
```bash
# Edit crontab
crontab -e

# Add this line (runs every 30 minutes)
*/30 * * * * curl -X POST http://localhost:3001/api/update-data
```

**Option B: Use a service like cron-job.org**
1. Go to https://cron-job.org
2. Create job: `POST http://localhost:3001/api/update-data`
3. Schedule: Every 30 minutes
4. Only works if your server is publicly accessible

**Option C: Next.js API Route + setInterval (Development)**
Create a simple script that runs in the background while your dev server is running.

---

## 📊 API Endpoints

### `POST /api/update-data`
**Triggers full data update**

**What it does:**
1. Gets current season/week
2. Fetches all games for the week
3. Gets betting odds from The Odds API
4. Gets team stats from ESPN
5. Gets weather forecasts
6. Generates predictions
7. Saves everything to Firebase

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-12-06T14:30:00.000Z",
  "season": 2024,
  "week": 15,
  "duration": 12543,
  "stats": {
    "total": 14,
    "updated": 14,
    "errors": 0
  },
  "games": [
    {
      "id": "game123",
      "matchup": "BUF @ KC",
      "confidence": 72,
      "recommendation": "value_bet"
    }
  ]
}
```

**Usage:**
```bash
# Manual trigger
curl -X POST http://localhost:3001/api/update-data

# Or from browser console
fetch('/api/update-data', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

### `GET /api/update-data`
**Check update status**

Returns current season/week info without triggering update.

---

## 🗄️ Firebase Caching

### Collections Used:

**`games`**
- Stores game info (teams, date, status)
- Updated on each refresh

**`predictions`**
- Stores ML predictions with timestamp
- Multiple predictions per game (history)
- Keeps most recent for display

**`betting_lines`**
- Stores odds from different bookmakers
- Timestamps for line movement tracking
- Multiple lines per game

### How Cache Works:

1. **Save**: `/api/update-data` saves to Firebase
2. **Load**: Page loads use `getCachedPredictions()`
3. **Dedup**: Shows only latest prediction per game
4. **Fast**: No API calls on page load!

---

## 💡 Best Practices

### Update Frequency:

**Too Often** (every 5 mins):
- ❌ Wastes API quota
- ❌ Gets rate limited
- ❌ Minimal line movement

**Too Rare** (once per day):
- ❌ Miss line movements
- ❌ Stale odds
- ❌ Miss injury news

**Just Right** (every 30 mins):
- ✅ Catches line movements
- ✅ Stays within API limits
- ✅ Fresh enough for betting

### Recommended Schedule:

| Time | Action |
|------|--------|
| **Sunday Morning** | Refresh 2-3 hours before first game |
| **During Games** | No refresh needed (games in progress) |
| **Monday Night** | Refresh before MNF |
| **Thursday** | Refresh for TNF |
| **Saturday** | Refresh if there are games |

---

## 🔧 Customization

### Change Update Frequency

Edit your cron job or scheduled task to run more/less frequently.

**Every 15 minutes:**
```bash
*/15 * * * * curl -X POST http://localhost:3001/api/update-data
```

**Every hour:**
```bash
0 * * * * curl -X POST http://localhost:3001/api/update-data
```

**Specific times (9am, 12pm, 3pm daily):**
```bash
0 9,12,15 * * * curl -X POST http://localhost:3001/api/update-data
```

### Add Slack Notifications

Modify `/app/api/update-data/route.ts` to send Slack webhook after update:

```typescript
// At the end of successful update
await fetch('YOUR_SLACK_WEBHOOK_URL', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: `🎯 Data updated! ${results.updated} games analyzed. ${strongBets} STRONG BETS found!`
  })
});
```

---

## 🎯 Production Deployment

When you deploy to production (Vercel, Netlify, etc.):

### Option 1: Vercel Cron Jobs
```json
// vercel.json
{
  "crons": [{
    "path": "/api/update-data",
    "schedule": "*/30 * * * *"
  }]
}
```

### Option 2: External Cron Service
Use services like:
- cron-job.org
- EasyCron
- AWS EventBridge
- Google Cloud Scheduler

Point them to: `https://yourdomain.com/api/update-data`

### Option 3: GitHub Actions
```yaml
# .github/workflows/update-data.yml
name: Update Betting Data
on:
  schedule:
    - cron: '*/30 * * * *'
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Update
        run: curl -X POST https://yourdomain.com/api/update-data
```

---

## 📈 Monitoring

### Check Update Status

Visit: `http://localhost:3001/api/update-data` (GET request)

Shows current season/week without triggering update.

### View Logs

Check console output when refresh button is clicked:
```
🔄 Starting data update...
📅 Current: 2024 Season, Week 15
🏈 Found 14 games
💰 Fetched odds for 14 games
✅ Updated: BUF @ KC
✅ Updated: LAC @ LV
...
✨ Data update complete in 12543ms
```

### Firebase Console

Check data directly: https://console.firebase.google.com/project/betanalytics-f095a/firestore

---

## 🚨 Troubleshooting

### "No cached predictions found"
**Solution**: Click "Refresh Data" button to generate first set of predictions

### API Rate Limits
**Solution**: Reduce update frequency, or upgrade API plan

### Slow Refreshes
**Cause**: Many games to process + multiple API calls per game
**Expected**: 10-30 seconds for full week update
**Normal**: Processing 14 games × 3 APIs each = ~42 API calls

### Firebase Quota Exceeded
**Solution**: Clean up old data using database page cleanup feature

---

## ✅ Summary

**Your new workflow:**

1. **First time**: Click "Refresh Data" to populate cache
2. **Daily**: Visit predictions page (instant load from cache)
3. **Before betting**: Click "Refresh Data" for latest odds
4. **Optional**: Set up cron job for automatic updates every 30 mins

**API usage:**
- **Before**: 42+ calls per page load
- **After**: 0 calls per page load (cached!)
- **Refresh**: 42+ calls only when you click refresh

**Result**: Professional betting site experience! 🎉
