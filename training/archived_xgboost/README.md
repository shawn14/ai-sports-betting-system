# Archived XGBoost System

This directory contains the **archived XGBoost-based prediction system** that was replaced by the **Matrix Prediction System** on December 8, 2024.

## What's Archived

### TypeScript Predictor
- `predictor.ts` - The old GamePredictor class that used rules-based predictions with optional ML fallback

### XGBoost Models (*.pkl)
- 5 versions of trained spread and total models from December 6, 2024
- Models trained on 832 games from 2021-2024 seasons
- Required Python/XGBoost for inference

### Python Training Scripts
- `train_model.py` - Main XGBoost training pipeline
- `ml_predictor.py` - Python-based prediction interface
- `batch_predict.py` - Batch prediction tool
- `backtest_*.py` - Various backtesting scripts
- `predict_*.py` - Prediction generation scripts
- `enrich_*.py` - Data enrichment scripts (EPA, odds, nfldata)
- `walk_forward_validation.py` - Time-series validation
- Other analysis and utility scripts

## Why It Was Replaced

The XGBoost system was replaced with the Matrix Prediction System for the following reasons:

1. **Temporal Validity**: Training on 2021-2024 data to predict 2025 games has limited relevance due to:
   - Rule changes (kickoff rules, targeting penalties)
   - Complete roster turnover (avg NFL career: 3.3 years)
   - Strategic evolution (modern offenses, defensive schemes)

2. **Data Complexity**: Required extensive data collection:
   - ESPN API for game data and team stats
   - Weather API for game conditions
   - Complex feature engineering (23 features)
   - Historical odds scraping

3. **System Complexity**: Multi-language architecture:
   - Python for training (XGBoost, scikit-learn, pandas)
   - TypeScript for web application
   - Model file management and versioning
   - Dependency on .pkl files

4. **Maintenance Overhead**: Required ongoing:
   - Weekly model retraining
   - Python environment management
   - Feature engineering updates
   - Model performance monitoring

## The Matrix System Advantage

The new Matrix Prediction System offers:

1. **Current Season Focus**: Uses only current season (2025) data from NFL.com standings
2. **Simpler Architecture**: Pure TypeScript implementation, no Python required
3. **Weekly Data Updates**: Scrape NFL.com standings once per week (Monday mornings)
4. **Transparent Calculations**: All formulas from PRD implemented exactly
5. **User Configurability**: 9 adjustable weights with 6 presets
6. **No Model Training**: TSR calculation is deterministic, no ML training needed

## Performance Comparison

### XGBoost System (2021-2024 training):
- Spread MAE: ~11.7 points
- Total MAE: ~12.0 points
- ATS Win Rate: ~54%
- Training time: 30-60 seconds
- Features: 23 engineered features

### Matrix System (2025 current season):
- Will be validated after Week 15+ with sufficient games
- Simpler calculation: 6 TSR components + total formula
- No training required
- Real-time predictions

## Recovery Instructions

If you need to restore the XGBoost system:

1. Move files back from this archive directory
2. Restore `predictor.ts` to `/lib/models/`
3. Restore Python scripts to `/training/`
4. Install Python dependencies: `pip install -r ../requirements.txt`
5. Revert code changes to use `GamePredictor` instead of `MatrixHelper`

## Notes

- Model files are large (1MB+ each for spread, 600KB+ for total)
- Training data JSON files remain in parent `/training/` directory
- Documentation files (METHODOLOGY_EXPLAINED.md, MODEL_DOCUMENTATION.md, etc.) remain in parent directory
- This archive is kept for reference and potential future comparison studies

---

**Archived:** December 8, 2024
**Replaced by:** Matrix Prediction System (NFL.com standings-based TSR)
**Contact:** See main project README for more information
