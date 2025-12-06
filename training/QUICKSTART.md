# Quick Start: Train Your NFL Betting Model

## Step-by-Step Guide

### 1. Export Your Training Data

1. Go to http://localhost:3001/training
2. Click the green **"Export to JSON"** button
3. Save the file (it will be named something like `nfl_training_data_2024_2023_2022_2021_1765054889500.json`)
4. Move the file to this `training/` directory

### 2. Install Python Packages

Open terminal and run:

```bash
cd ~/Desktop/nfl-betting-system/training
pip install -r requirements.txt
```

This installs:
- pandas (data manipulation)
- numpy (numerical operations)
- scikit-learn (ML utilities)
- xgboost (main ML algorithm)
- matplotlib & seaborn (visualizations)
- joblib (model saving)

### 3. Run Training

```bash
python train_model.py nfl_training_data_2024_2023_2022_2021_1765054889500.json
```

(Replace with your actual filename)

### 4. Wait for Training

The script will:
- ✅ Load your 832 games
- ✅ Extract 23 features per game
- ✅ Split into training (665 games) and test (167 games)
- ✅ Train spread prediction model
- ✅ Train total prediction model
- ✅ Calculate ATS win rate and ROI
- ✅ Save models and charts

**Estimated time:** 2-5 minutes

### 5. Review Results

Look for these key numbers in the output:

```
📊 Spread Model Performance:
  Test MAE: 10.15 points          ← Lower is better (target: <10)
  Test RMSE: 13.21 points          ← Lower is better (target: <12)

==========================================================
BETTING PERFORMANCE (ATS)
==========================================================
  ATS Win Rate: 55.1%              ← TARGET: 54%+ is profitable!
  ROI: +6.7%                       ← TARGET: 5-10% is excellent
  Units Won/Lost: +12.3            ← Profit on 167 test games
```

### What the Numbers Mean

**ATS Win Rate: 55.1%**
- This means the model correctly predicted 55.1% of games against the betting spread
- 52.4% = breakeven (covers the -110 vig)
- **55.1% = VERY PROFITABLE** (approximately 6-7% ROI)

**Units Won: +12.3**
- If you bet $100 per game on 167 test games:
- Total risked: $18,370 (167 × $110)
- **Profit: $1,230**
- This is a 6.7% return on investment

### Files Created

After training completes:

```
training/
├── spread_model_20241206_151234.pkl       ← Trained model
├── total_model_20241206_151234.pkl        ← Trained model
├── feature_columns_20241206_151234.json   ← Feature list
├── spread_model_importance.png            ← Chart showing what matters
├── total_model_importance.png             ← Chart showing what matters
```

### View Feature Importance

Open the PNG files to see which features matter most:

Common rankings:
1. **PPG Differential** - How much better one team scores
2. **Win % Differential** - Team quality gap
3. **PAG Differential** - Defensive matchup
4. **Recent Form** - Hot/cold streaks
5. **Weather (Wind)** - Affects passing games

### Next Steps

**Option A: Use in Python**
```python
import joblib
model = joblib.load('spread_model_20241206_151234.pkl')
prediction = model.predict(features)
```

**Option B: Integrate into Web App**
- Export model to ONNX format
- Load in TypeScript/JavaScript
- Use for live predictions

**Option C: Improve the Model**
- Collect more seasons of data
- Add more features (injuries, etc.)
- Try hyperparameter tuning
- Ensemble multiple models

## Troubleshooting

**No module named 'xgboost'**
```bash
pip install -r requirements.txt
```

**Can't find JSON file**
- Make sure it's in the `training/` directory
- Use exact filename from export

**Low accuracy (<52%)**
- Collect more data (more seasons)
- Add better features
- This is normal - NFL is hard to predict!

## Realistic Expectations

**Good Results:**
- ATS Win Rate: 54-56%
- ROI: 5-10%
- MAE: 8-10 points

**Excellent Results (rare):**
- ATS Win Rate: 56%+
- ROI: 10%+
- MAE: <8 points

**Professional Level (very rare):**
- ATS Win Rate: 58%+
- ROI: 15%+
- Sustained over multiple seasons

Remember: Even a 54% ATS win rate over a full NFL season is **extremely profitable**!

## Support

See the full `README.md` for detailed explanations of:
- Feature engineering
- Model architecture
- Evaluation metrics
- Integration options
- Improvement strategies
