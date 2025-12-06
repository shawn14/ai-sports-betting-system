# NFL Betting ML Training

Train XGBoost models to optimize NFL betting predictions for ATS (Against The Spread) accuracy and ROI.

## Quick Start

### 1. Install Python Dependencies

```bash
cd training
pip install -r requirements.txt
```

### 2. Export Training Data

Go to http://localhost:3001/training and click **"Export to JSON"**. This will download a file like:
```
nfl_training_data_2024_2023_2022_2021_1765054889500.json
```

Move this file to the `training/` directory.

### 3. Train the Model

```bash
python train_model.py nfl_training_data_2024_2023_2022_2021_1765054889500.json
```

## What the Training Does

### Models Trained

1. **Spread Prediction Model** - Predicts final margin (home - away score)
   - Optimized for ATS (Against The Spread) betting
   - Target: Minimize prediction error on spread

2. **Total Prediction Model** - Predicts combined score (over/under)
   - Optimized for totals betting
   - Target: Minimize prediction error on total points

### Features Used (23 total)

**Team Stats (Home & Away):**
- Win percentage
- Points per game (PPG)
- Points allowed per game (PAG)
- Yards per game
- Yards allowed per game
- Turnover differential

**Derived Features:**
- PPG differential (home - away)
- PAG differential
- Win% differential
- Yards differential
- Turnover differential

**Matchup:**
- Is divisional game
- Is conference game

**Weather:**
- Temperature
- Wind speed
- Precipitation
- Is dome stadium

### Key Metrics

The script calculates:

1. **MAE (Mean Absolute Error)** - Average point difference in predictions
   - Target: <8 points is excellent

2. **RMSE (Root Mean Squared Error)** - Penalizes large errors
   - Target: <10 points is good

3. **ATS Win Rate** - % of correct picks against the spread
   - **52.4% = Breakeven** (after -110 vig)
   - **54%+ = Profitable**
   - **55%+ = Excellent**
   - **58%+ = Professional level**

4. **ROI (Return on Investment)** - Profit percentage
   - Target: 5-10% over a season

5. **Units Won/Lost** - Simulated betting profit
   - Assumes flat betting of 1 unit per game
   - Includes -110 vig (risk $110 to win $100)

## Expected Output

```
==========================================================
NFL BETTING ML TRAINING PIPELINE
==========================================================
Loading training data from nfl_training_data.json...
Dataset metadata:
  Seasons: [2024, 2023, 2022, 2021]
  Total Games: 832
  Features: 19
  Version: 1.0.0

Creating DataFrame with 832 games and 28 columns

Training set: 665 games
Test set: 167 games

==========================================================
TRAINING SPREAD PREDICTION MODEL
==========================================================

📊 Spread Model Performance:
  Train MAE: 9.42 points
  Test MAE: 10.15 points
  Train RMSE: 12.34 points
  Test RMSE: 13.21 points

==========================================================
BETTING PERFORMANCE (ATS)
==========================================================
  Total Bets: 167
  Correct ATS: 92
  ATS Win Rate: 55.1%
  Units Won/Lost: +12.3
  ROI: +6.7%

  🎉 EXCELLENT! This model beats the spread at a profitable rate!

==========================================================
SAVING MODELS
==========================================================
✅ Saved spread_model_20241206_151234.pkl
✅ Saved total_model_20241206_151234.pkl
✅ Saved feature_columns_20241206_151234.json
```

## Files Created

After training, you'll have:

1. `spread_model_[timestamp].pkl` - Trained spread prediction model
2. `total_model_[timestamp].pkl` - Trained total prediction model
3. `feature_columns_[timestamp].json` - List of features (for consistency)
4. `spread_model_importance.png` - Feature importance chart
5. `total_model_importance.png` - Feature importance chart

## Understanding the Results

### MAE (Mean Absolute Error)

- 8-10 points = Good
- 6-8 points = Very good
- <6 points = Excellent (rare)

NFL scores are inherently random - even the best models have ~8-10 point errors.

### ATS Win Rate

This is the **most important metric** for betting:

| ATS Win Rate | Result |
|--------------|--------|
| <50% | Losing money |
| 50-52% | Losing to vig |
| 52.4% | Breakeven (after vig) |
| 53-54% | Small profit (~2-5% ROI) |
| 54-56% | Good profit (~5-10% ROI) |
| 56%+ | Excellent (rare) |
| 58%+ | Professional level |

**Why 52.4% is breakeven:**
- Standard betting odds: -110 (risk $110 to win $100)
- Need to win 52.38% of bets to cover the vig
- 53% = ~$2,700 profit on 100 games at $100/bet
- 55% = ~$7,300 profit on 100 games at $100/bet

### Feature Importance

The charts show which features matter most. Common patterns:

1. **Recent Form** - Usually #1 (how team is playing now)
2. **PPG Differential** - Strong predictor
3. **Win % Differential** - Team quality
4. **Weather (Wind)** - Important for outdoor games
5. **Divisional Games** - Tend to be closer

## Next Steps

### Option 1: Use Models in Python

```python
import joblib
import numpy as np

# Load model
model = joblib.load('spread_model_20241206_151234.pkl')

# Predict on new game
features = np.array([[
    0.625,  # home_winPct
    24.5,   # home_ppg
    # ... all 23 features
]])

predicted_spread = model.predict(features)
print(f"Predicted spread: {predicted_spread[0]:.1f}")
```

### Option 2: Export to ONNX (for web integration)

```python
import onnxmltools
from skl2onnx import convert_sklearn

# Convert XGBoost to ONNX
onnx_model = convert_sklearn(
    model,
    initial_types=[('features', FloatTensorType([None, 23]))]
)

# Save
onnxmltools.utils.save_model(onnx_model, 'spread_model.onnx')
```

Then load in TypeScript:
```typescript
import * as ort from 'onnxruntime-web';

const session = await ort.InferenceSession.create('spread_model.onnx');
const prediction = await session.run(inputTensor);
```

### Option 3: Improve the Model

**Add more features:**
- Recent form (last 3-5 games weighted)
- Head-to-head history
- Injuries/player availability
- Line movement patterns
- Strength of schedule
- Time of season factors

**Try different algorithms:**
- Random Forest
- LightGBM
- Neural Networks
- Ensemble (combine multiple models)

**Hyperparameter tuning:**
- Use Optuna for automated optimization
- Cross-validate with walk-forward splits

## Troubleshooting

**"ModuleNotFoundError: No module named 'xgboost'"**
```bash
pip install -r requirements.txt
```

**"FileNotFoundError: [Errno 2] No such file or directory"**
- Make sure the JSON file is in the `training/` directory
- Use the full filename from the export

**Low ATS accuracy (<52%)**
- Try collecting more data (more seasons)
- Add more features (injuries, weather details, etc.)
- Tune hyperparameters
- Ensemble multiple models

**High training accuracy but low test accuracy (overfitting)**
- Reduce model complexity (lower max_depth)
- Increase regularization
- Get more training data
- Use simpler features

## Files in This Directory

```
training/
├── README.md              # This file
├── requirements.txt       # Python dependencies
├── train_model.py         # Main training script
├── *.json                 # Exported training data (gitignored)
├── *.pkl                  # Trained models (gitignored)
└── *.png                  # Feature importance charts
```
