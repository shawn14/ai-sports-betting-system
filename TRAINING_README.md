# NFL Betting ML Training System

## Overview

This training system collects historical NFL game data and prepares it for machine learning model training. The goal is to optimize prediction accuracy (especially ATS - Against The Spread) and maximize ROI.

## What's Been Built

### 1. Historical Data Collector (`/lib/training/dataCollector.ts`)

Automatically collects historical NFL game data with:
- ✅ Game results (scores, winners)
- ✅ Team statistics at time of game (rolling averages)
- ✅ Weather conditions
- ✅ Matchup analysis (divisional, conference games)
- ✅ Progress tracking with real-time updates
- ✅ Export to JSON
- ✅ Save to Firebase

**Features Collected Per Game:**
- Home/Away: Win %, PPG, PAG, Yards/Game, Turnover Differential
- Matchup: Is Divisional, Is Conference, Rest Days
- Weather: Temperature, Wind Speed, Precipitation, Dome
- Outcome: Final Score, Spread, Total, Winner

### 2. Training Dashboard (`/app/training/page.tsx`)

Web interface to:
- ✅ Select seasons to collect (2021-2024)
- ✅ Choose week range
- ✅ Monitor collection progress in real-time
- ✅ View dataset summary and sample data
- ✅ Export to JSON for Python training
- ✅ Save to Firebase for persistence

## How to Use

### Step 1: Collect Historical Data

1. Navigate to `/training` page (http://localhost:3001/training)
2. Select seasons (recommend 2022, 2023, 2024 for ~800 games)
3. Choose week range (weeks 1-14 recommended)
4. Click "Start Collection"
5. Wait for completion (10-20 minutes for 3 seasons)

### Step 2: Export Data

Once collection is complete:
- Click "Export to JSON" to download the dataset
- Or click "Save to Firebase" to store in database

### Step 3: Train ML Model (Python)

Use the exported JSON with Python ML libraries:

```python
import json
import pandas as pd
from sklearn.model_selection import train_test_split
import xgboost as xgb

# Load data
with open('nfl_training_data.json', 'r') as f:
    dataset = json.load(f)

# Convert to DataFrame
df = pd.DataFrame(dataset['data'])

# Extract features
X = df[['homeTeam.ppg', 'homeTeam.pag', 'homeTeam.winPct',
        'awayTeam.ppg', 'awayTeam.pag', 'awayTeam.winPct',
        'matchup.isDivisional', 'weather.windSpeed', ...]]

# Target: Actual Spread (home - away)
y = df['outcome.actualSpread']

# Train/test split (temporal - use earlier games for training)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

# Train XGBoost model
model = xgb.XGBRegressor(
    max_depth=5,
    learning_rate=0.1,
    n_estimators=500,
    objective='reg:squarederror'
)

model.fit(X_train, y_train)

# Evaluate
predictions = model.predict(X_test)
# Calculate ATS accuracy, ROI, etc.
```

### Step 4: Optimize for Betting (ATS Accuracy)

The key is to optimize for **Against The Spread (ATS) accuracy**, not just winner prediction:

```python
# Custom metric: ATS Win Rate
def ats_accuracy(y_true, y_pred, closing_lines):
    correct = 0
    for i in range(len(y_true)):
        predicted_spread = y_pred[i]
        actual_spread = y_true[i]
        line = closing_lines[i]

        # Our prediction vs the spread
        our_pick = 'home' if predicted_spread > line else 'away'

        # Did we beat the spread?
        if our_pick == 'home' and actual_spread > line:
            correct += 1
        elif our_pick == 'away' and actual_spread < line:
            correct += 1

    return correct / len(y_true)

# Target: 52-55% ATS accuracy (53%+ is profitable)
```

## Data Schema

### TrainingDataPoint Structure

```typescript
{
  gameId: string;
  season: number;
  week: number;

  homeTeam: {
    id: string;
    name: string;
    winPct: number;        // Win percentage at time of game
    ppg: number;           // Points per game (rolling avg)
    pag: number;           // Points allowed per game
    yardsPerGame: number;
    yardsAllowedPerGame: number;
    turnoverDiff: number;  // Takeaways - Turnovers
    homeRecord: number;
    awayRecord: number;
    last3Games: number[];  // Point margins from last 3
    streak: number;        // Win/loss streak
  };

  awayTeam: { /* same structure */ };

  matchup: {
    isDivisional: boolean;
    isConference: boolean;
    restDaysDiff: number;
  };

  weather: {
    temperature: number;
    windSpeed: number;
    precipitation: number;
    isDome: boolean;
  };

  lines?: {
    spread: number;       // Closing spread
    total: number;        // O/U line
  };

  outcome: {
    homeScore: number;
    awayScore: number;
    actualSpread: number; // home - away
    actualTotal: number;  // home + away
    homeWon: boolean;
  };
}
```

## Performance Targets

Based on industry benchmarks:

| Metric | Target | World Class |
|--------|--------|-------------|
| **ATS Win Rate** | 52-55% | 55-58% |
| **ROI** | 5-10% | 10-15% |
| **Sharpe Ratio** | 1.0+ | 1.5+ |
| **Spread RMSE** | <10 points | <8 points |

**Why These Matter:**
- 52.4% ATS = Break-even after vig (-110 odds)
- 53% ATS = ~2% ROI
- 55% ATS = ~8% ROI (excellent)
- 58%+ ATS = Professional level

## Next Steps

1. ✅ **Data Collection** - Complete (you can now collect 800+ games)
2. 🔄 **Feature Engineering** - Add more advanced features:
   - Recent form (last 3-5 games weighted)
   - Head-to-head history
   - Line movement patterns
   - Strength of schedule
3. 📊 **Model Training** - Train XGBoost, Random Forest, Neural Networks
4. 🎯 **Hyperparameter Tuning** - Use Optuna for automated optimization
5. 📈 **Model Evaluation** - Backtest on held-out data
6. 🔄 **Integration** - Export to ONNX and integrate into prediction system
7. 🔬 **A/B Testing** - Compare ML model vs rules-based model

## Files Created

- `/lib/training/dataCollector.ts` - Data collection engine
- `/app/training/page.tsx` - Training dashboard UI
- `/types/index.ts` - Added TrainingDataPoint, DataCollectionProgress types
- `/lib/firebase/firestore.ts` - Added training data storage methods

## API Rate Limits

The ESPN API has rate limits. The data collector includes:
- ✅ Automatic delays between requests (100ms)
- ✅ Error handling and retries
- ✅ Progress tracking to resume if interrupted

Expect ~10-20 minutes to collect 3 full seasons (800+ games).

## Firebase Storage

Training data is stored in two collections:
- `training_datasets` - Metadata about each dataset
- `training_data` - Individual game data points

This allows:
- Re-use of collected data
- Versioning of datasets
- Sharing data across training runs

## Questions?

The training dashboard includes full instructions and help text.

For best results:
1. Collect at least 2 seasons of data (400+ games)
2. Use weeks 1-14 (most stable, playoff games can be outliers)
3. Export to JSON and train with Python (XGBoost recommended)
4. Optimize for ATS accuracy and ROI, not just winner prediction
5. Use walk-forward validation (train on past, test on future)
