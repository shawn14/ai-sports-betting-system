# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PredictionMatrix** is an AI-powered NFL sports betting analytics platform that uses XGBoost machine learning models to predict game outcomes and identify profitable betting edges. The system combines real-time odds data, historical game statistics, weather analysis, and advanced ML predictions to achieve 54%+ Against The Spread (ATS) accuracy.

**Website:** [predictionmatrix.com](https://predictionmatrix.com)

## Tech Stack

- **Frontend:** Next.js 14.1.0, React 18, TypeScript, Tailwind CSS
- **Backend:** Firebase Firestore, Next.js API Routes
- **ML/Python:** XGBoost, scikit-learn, pandas, numpy, matplotlib
- **APIs:** The Odds API (betting lines), ESPN API (game data), OpenWeather API (weather)
- **Data Viz:** Recharts for analytics dashboards

## Key Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Python ML Training
```bash
cd training
pip install -r requirements.txt              # Install ML dependencies
python train_model.py <data_file.json>       # Train XGBoost models
python ml_predictor.py --test                # Test predictions with trained models
python scrape_historical_spreads.py 2024 1 14  # Scrape historical spreads
```

## Architecture Overview

### Three-Layer Prediction System

1. **Data Collection Layer** (`lib/training/dataCollector.ts`)
   - Collects historical NFL games from ESPN API
   - Calculates rolling team statistics at time of each game
   - Enriches with weather data from OpenWeather API
   - Exports training datasets to JSON

2. **ML Training Layer** (`training/*.py`)
   - `train_model.py` - Trains XGBoost models on historical data (832+ games)
   - `ml_predictor.py` - Loads trained models and makes predictions
   - `scrape_historical_spreads.py` - Scrapes Vegas lines for ATS validation
   - Models predict: spread (home - away margin) and total (combined score)

3. **Web Application Layer** (`app/**/*.tsx`, `lib/**/*.ts`)
   - Next.js pages for predictions, analytics, edge detection, backtesting
   - Firebase Firestore for persisting predictions and results
   - Real-time odds integration from The Odds API
   - Edge detection: ML predictions vs Vegas lines

### Core Data Flow

```
ESPN API → Data Collector → Training JSON → Python XGBoost → Trained Models
                                                                    ↓
The Odds API → Edge Dashboard ← ML Predictor ← Trained Models (.pkl)
```

## Critical Architectural Concepts

### 1. Temporal Data Integrity
**Never** use future data to predict past games. The system maintains temporal integrity by:
- Computing team stats as **rolling averages** up to (but not including) the game being predicted
- Using `last3Games` for recent form (previous 3 games only)
- Splitting training/test data chronologically (train on past, test on future)

### 2. ATS (Against The Spread) Focus
The primary success metric is **ATS win rate**, not raw prediction accuracy:
- 52.4% ATS = breakeven (covers -110 vig)
- 54% ATS = ~$1,900 profit per season ($100/game, 256 games)
- 55% ATS = ~$3,400 profit (12.5% ROI) - target performance
- See `EDGE_FINDING_SYSTEM.md` for full betting strategy

### 3. Edge Detection Logic
Edge = ML Prediction - Vegas Line (in points)
- **STRONG BET:** 4+ point edge
- **GOOD BET:** 2.5-4 point edge
- **SLIGHT EDGE:** 1.5-2.5 point edge
- **NO EDGE:** <1.5 point edge

Implemented in:
- Python: `training/ml_predictor.py` (CLI tool)
- TypeScript: `app/edge/page.tsx` (web dashboard)
- Predictor: `lib/models/predictor.ts` (rules-based fallback)

### 4. Three-Tier Vegas Spread System
The system now uses a three-tier approach for comparing predictions to Vegas lines:

**Tier 1 (Best):** Historical spread from training data
- Saved in `GamePrediction.vegasSpread` at prediction time
- Most accurate for backtesting historical performance
- Only available for games that were in training dataset

**Tier 2 (Good):** Pre-game cached spread from The Odds API
- Saved in Firebase `odds_cache` collection
- Refreshed periodically before games start
- Used for live edge detection on current week

**Tier 3 (Fallback):** Live real-time spread
- Fetched directly from The Odds API when needed
- Most current but uses API quota
- Used when cache expires or is unavailable

Implementation: See `app/analytics/page.tsx` lines 200-230

### 5. Firebase Collections Structure

```typescript
/games              // Game schedules and scores
/predictions        // ML predictions (keyed by gameId - prevents duplicates)
/results            // Post-game outcomes for backtesting
/betting_lines      // Historical line movements
/odds_cache         // Cached odds data (season_week key)
/training_data      // Individual training data points
/training_datasets  // Dataset metadata
/bets              // User bet tracking
```

**Key Pattern:** Using `gameId` as document ID in predictions prevents duplicate predictions for the same game. Always use `setDoc(doc(db, 'predictions', gameId), data)` not `addDoc()`.

## Important Development Patterns

### Working with Training Data
1. **Never mock data** - Always use real APIs (ESPN, The Odds API, OpenWeather)
2. **Export from UI first** - Use `/training` page to collect and export to JSON
3. **Python for ML, TypeScript for Web** - Keep ML in Python, web features in TypeScript
4. **Version models** - Model files include timestamps: `spread_model_20241206_151234.pkl`

### Feature Engineering (23 features per game)
Critical features from `training/train_model.py`:
- Basic: `ppg_differential`, `pag_differential`, `winPct_differential`
- Advanced: `home_last3_ppf`, `rest_days_diff`, `turnover_differential`
- Context: `is_divisional`, `is_thursday_night`, `temperature`, `wind_speed`
- Never add features to models without retraining

### Edge Detection Implementation
When implementing edge-related features:
```typescript
// Calculate edge
const predictedSpread = homePredicted - awayPredicted;
const spreadEdge = predictedSpread - vegasLine;

// Recommendation logic
if (Math.abs(spreadEdge) >= 4) return 'STRONG BET';
if (Math.abs(spreadEdge) >= 2.5) return 'GOOD BET';
if (Math.abs(spreadEdge) >= 1.5) return 'SLIGHT EDGE';
return 'NO EDGE';
```

### API Rate Limits & Caching
- **The Odds API:** 500 requests/month on free tier
  - Cache odds in Firebase with 1-hour expiration
  - Batch fetch all games for a week (1 request vs N requests)
  - See `lib/firebase/firestore.ts` - `saveOddsCache()` and `getCachedOdds()`

- **ESPN API:** No official rate limit, but be respectful
  - 100ms delay between requests in data collector
  - See `lib/training/dataCollector.ts` line delays

## Testing & Validation

### Model Performance Metrics (from Python training)
```bash
python train_model.py data.json
# Look for:
# - Spread MAE: <11 points (target)
# - Total MAE: <12 points (target)
# - ATS Win Rate: 54%+ (target)
# - ROI: 5-10% (target)
```

### Backtesting
Use `/backtest` page or Python scripts:
- `training/backtest_historical.py` - Historical validation
- `training/walk_forward_validation.py` - Time-series validation
- Always use temporal splits (train on past, test on future)

## Environment Variables

Required in `.env.local`:
```bash
# The Odds API (free tier: 500 req/month)
NEXT_PUBLIC_ODDS_API_KEY=your_key

# OpenWeather API (free tier: 1000 req/day)
NEXT_PUBLIC_WEATHER_API_KEY=your_key

# Firebase (Firestore for data persistence)
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Page Routes & Functionality

- `/` - Current week games with live odds
- `/predictions` - AI predictions for upcoming games
- `/edge` - Edge detection dashboard (ML vs Vegas)
- `/analytics` - Performance tracking and ROI analysis
- `/backtest` - Historical validation of predictions
- `/training` - Data collection interface for ML training
- `/database` - View and manage stored predictions/results
- `/dashboard` - Line movement tracking

## Common Pitfalls & Gotchas

1. **Firestore Queries Without Indexes**
   - Avoid combining `where()` + `orderBy()` on different fields
   - If needed, create composite index in Firebase Console
   - Current workaround: Query with `where()`, sort in-memory

2. **API Rate Limit Exhaustion**
   - Always check cache before calling The Odds API
   - Use `FirestoreService.getCachedOdds()` first
   - Set appropriate cache expiration (1 hour for live odds)

3. **Stale Model Files**
   - Model filenames include timestamps
   - Python scripts auto-load latest model by default
   - Delete old models manually to avoid confusion

4. **Timezone Issues**
   - Game times are in UTC from ESPN API
   - Convert to local timezone in UI layer
   - Weather API uses stadium local time

5. **Missing Vegas Spreads in Analytics**
   - Analytics page needs three-tier spread lookup
   - Check: vegasSpread → cached odds → live API
   - See implementation in `app/analytics/page.tsx`

## Key Documentation Files

- `README.md` - Full project documentation and setup
- `EDGE_FINDING_SYSTEM.md` - Complete edge detection guide
- `TRAINING_README.md` - ML training system documentation
- `training/QUICKSTART.md` - Fast-track ML training guide
- `training/MODEL_DOCUMENTATION.md` - Model architecture details (if exists)
- `training/ATS_EXPLANATION.md` - ATS betting explanation (if exists)

## Extending the System

### Adding New Features
1. Add feature to `types/index.ts` → `TrainingDataPoint`
2. Update `lib/training/dataCollector.ts` to collect the data
3. Update `training/train_model.py` feature extraction
4. Retrain models with new feature
5. Update `training/ml_predictor.py` feature extraction
6. Update feature count (was 23, now 24+)

### Supporting New Sports (Planned)
The architecture is designed to be sport-agnostic:
- Core types (`Game`, `TeamStats`, `Prediction`) are generic
- API integrations are modular (`lib/api/`)
- Add new sport by: creating sport-specific API service, extending types, training sport-specific models

## Performance Targets

Based on industry benchmarks and current system:

| Metric | Current | Target | World-Class |
|--------|---------|--------|-------------|
| Spread MAE | 11.7 pts | <11 pts | <8 pts |
| Total MAE | 12.0 pts | <12 pts | <10 pts |
| ATS Win Rate | ~54% | 54-56% | 56-58% |
| ROI | 5-7% | 8-10% | 12-15% |
| Dataset Size | 832 games | 1000+ games | 1500+ games |

## Disclaimer

This is an educational/research project. Sports betting involves risk. The system is not a guarantee of profit. Users are responsible for their own betting decisions and should gamble responsibly.
