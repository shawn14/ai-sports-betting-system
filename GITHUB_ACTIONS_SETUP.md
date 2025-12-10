# GitHub Actions Setup Guide

This guide explains how to set up automated weekly NFL standings updates using GitHub Actions.

## What This Does

Every **Wednesday at 6:00 AM EST**, GitHub Actions will automatically:
1. Detect the current NFL week from ESPN API
2. Upload updated standings to Firestore
3. Your predictions page will automatically use the latest data

**No manual intervention needed after setup!**

## One-Time Setup Steps

### 1. Add Firebase Credentials to GitHub Secrets

You need to add your Firebase credentials as GitHub repository secrets:

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/nfl-betting-system`
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret** button
5. Add each of the following secrets:

| Secret Name | Where to Find Value |
|-------------|---------------------|
| `FIREBASE_API_KEY` | Your `.env.local` file → `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `FIREBASE_AUTH_DOMAIN` | Your `.env.local` file → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `FIREBASE_PROJECT_ID` | Your `.env.local` file → `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `FIREBASE_STORAGE_BUCKET` | Your `.env.local` file → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `FIREBASE_MESSAGING_SENDER_ID` | Your `.env.local` file → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `FIREBASE_APP_ID` | Your `.env.local` file → `NEXT_PUBLIC_FIREBASE_APP_ID` |

**Example:**
- Name: `FIREBASE_API_KEY`
- Secret: `AIzaSyC7xxxxxxxxxxxxxxxxxxxxxxxxxxx` (copy from your .env.local)

### 2. Push the Workflow File to GitHub

The workflow file already exists at `.github/workflows/update-standings.yml`. Just commit and push:

```bash
git add .github/workflows/update-standings.yml
git commit -m "Add GitHub Actions workflow for automated standings updates"
git push origin main
```

### 3. Test the Workflow Manually (Optional)

Before waiting for Wednesday, you can test it manually:

1. Go to your GitHub repository
2. Click **Actions** tab (top menu)
3. Click **Update NFL Standings** workflow (left sidebar)
4. Click **Run workflow** button (right side)
5. Click green **Run workflow** button
6. Watch it run in real-time

You should see:
```
✅ Successfully updated standings for Week 15
```

## How It Works

### Weekly Schedule
- **Runs:** Every Wednesday at 6:00 AM EST (11:00 AM UTC)
- **Cron:** `0 11 * * 3` (day 3 = Wednesday)

### What Happens Each Week

**Example Timeline:**

**Monday, Dec 16 (Week 15)**
- Last game of Week 15 finishes (Monday Night Football ~11pm EST)
- ESPN API updates standings in real-time

**Wednesday, Dec 18 at 6:00 AM EST**
- GitHub Actions runs automatically
- Detects current week from ESPN (Week 16)
- Uploads Week 16 standings to Firestore
- Takes ~30 seconds to complete

**Thursday, Dec 19 (TNF starts)**
- Your predictions page automatically shows Week 16
- Uses Week 15 standings (uploaded Wednesday) to predict Week 16 games
- Vegas spreads fetched from The Odds API
- Users see all predictions ready to go!

### Why Wednesday at 6am EST?
- **After MNF**: Gives 24-36 hours after Monday Night Football for stats to settle
- **Before TNF**: Runs well before Thursday Night Football kickoff (~8:15pm EST)
- **Conservative**: Avoids any edge cases with late stat corrections or delays

## Monitoring

### Check if it's working

**View latest runs:**
1. Go to GitHub repository → **Actions** tab
2. See all workflow runs with status (✅ success or ❌ failed)

**Check Firestore:**
1. Go to Firebase Console → Firestore Database
2. Check `standings_cache` collection
3. Should see documents like `2025-w16`, `2025-w17`, etc.

**Check predictions page:**
1. Visit your live site on Thursday
2. Should automatically show current week predictions
3. All 16 games with Vegas spreads populated

### If Something Goes Wrong

**Check workflow logs:**
1. GitHub → Actions → Click the failed run
2. Click "Upload standings to Firestore" step
3. Read error message

**Common issues:**
- Missing or incorrect Firebase secrets → Re-add secrets in GitHub Settings
- ESPN API down → Workflow will retry next week
- Firestore permissions → Check Firebase security rules

**Manual fallback:**
If the automation fails one week, you can always manually run:
```bash
npx tsx scripts/uploadStandingsClient.ts 2025 16
```

## Cost

**GitHub Actions:**
- Free for public repositories (unlimited minutes)
- Free for private repositories (2,000 minutes/month)
- This workflow uses ~1 minute per week = **FREE**

**Firebase:**
- Reads: ~1 per week (checking standings)
- Writes: ~32 per week (one per team)
- Well within free tier limits

**The Odds API:**
- 1 request per page load for live odds
- ~500 requests/month free tier limit
- Should stay under limit easily

## Disabling/Modifying

**Pause automation:**
1. GitHub → Settings → Actions → General
2. Disable "Allow all actions and reusable workflows"

**Change schedule:**
Edit `.github/workflows/update-standings.yml` line 5:
```yaml
# Change day: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, etc.
- cron: '0 11 * * 3'  # Wednesday 6am EST
```

**Run at different time:**
```yaml
# 11:00 AM UTC = 6:00 AM EST
- cron: '0 11 * * 3'

# Change to 12:00 PM EST (5:00 PM UTC):
- cron: '0 17 * * 3'
```

## Security Notes

- Firebase credentials are stored as encrypted GitHub secrets
- Secrets are never exposed in logs
- Only workflows in this repository can access them
- You can rotate secrets anytime in GitHub Settings

## Success! 🎉

After setup, your NFL predictions system is **fully automated**:
- ✅ Predictions auto-advance to current week (ESPN API)
- ✅ Vegas spreads auto-populate (The Odds API)
- ✅ Standings auto-update every Wednesday (GitHub Actions)
- ✅ Win/loss tracking works automatically after games complete

**No more manual work needed each week!**

---

## Need Help?

Check the logs:
```bash
# View GitHub Actions logs (in browser)
GitHub → Actions → Update NFL Standings → Latest run

# Test locally
npx tsx scripts/uploadStandingsClient.ts 2025 15
```

See the main plan document: `.claude/plans/fizzy-hatching-papert.md`
