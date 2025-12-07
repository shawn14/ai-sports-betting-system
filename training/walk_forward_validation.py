#!/usr/bin/env python3
"""
Walk-Forward Validation on 2021-2024
Tests model's actual predictive ability on historical data

For each season:
1. Train on ALL PRIOR seasons
2. Predict on THAT season (out-of-sample)
3. Calculate ATS performance

This simulates real-world usage where we train on history and predict future.
"""

import json
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.metrics import mean_absolute_error
from datetime import datetime

def load_historical_data():
    """Load 2021-2024 dataset"""
    print("Loading historical data...")
    with open('nfl_training_data_with_vegas.json', 'r') as f:
        dataset = json.load(f)

    games = dataset['data']
    print(f"✅ Loaded {len(games)} games from 2021-2024")
    return games

def prepare_training_data(games):
    """Convert games to training format (same as train_model.py)"""
    records = []

    for game in games:
        # Skip games without Vegas lines
        if 'lines' not in game or not game['lines']:
            continue

        home_last3 = game['homeTeam'].get('last3Games', {})
        away_last3 = game['awayTeam'].get('last3Games', {})

        home_last3_pf = sum(home_last3.get('pointsScored', [0])) / max(len(home_last3.get('pointsScored', [0])), 1)
        home_last3_pa = sum(home_last3.get('pointsAllowed', [0])) / max(len(home_last3.get('pointsAllowed', [0])), 1)
        away_last3_pf = sum(away_last3.get('pointsScored', [0])) / max(len(away_last3.get('pointsScored', [0])), 1)
        away_last3_pa = sum(away_last3.get('pointsAllowed', [0])) / max(len(away_last3.get('pointsAllowed', [0])), 1)

        record = {
            'gameId': game['gameId'],
            'season': game['season'],
            'week': game['week'],

            # Home team features
            'home_winPct': game['homeTeam']['winPct'],
            'home_ppg': game['homeTeam']['ppg'],
            'home_pag': game['homeTeam']['pag'],
            'home_yards_pg': game['homeTeam']['yardsPerGame'],
            'home_yards_allowed_pg': game['homeTeam']['yardsAllowedPerGame'],
            'home_turnover_diff': game['homeTeam']['turnoverDiff'],

            # Away team features
            'away_winPct': game['awayTeam']['winPct'],
            'away_ppg': game['awayTeam']['ppg'],
            'away_pag': game['awayTeam']['pag'],
            'away_yards_pg': game['awayTeam']['yardsPerGame'],
            'away_yards_allowed_pg': game['awayTeam']['yardsAllowedPerGame'],
            'away_turnover_diff': game['awayTeam']['turnoverDiff'],

            # Last 3 games
            'home_last3_ppf': home_last3_pf,
            'home_last3_ppa': home_last3_pa,
            'away_last3_ppf': away_last3_pf,
            'away_last3_ppa': away_last3_pa,

            # Rest days
            'home_rest_days': game['homeTeam'].get('restDays', 7),
            'away_rest_days': game['awayTeam'].get('restDays', 7),
            'rest_days_diff': game['matchup'].get('restDaysDiff', 0),

            # Derived features
            'ppg_differential': game['homeTeam']['ppg'] - game['awayTeam']['ppg'],
            'pag_differential': game['awayTeam']['pag'] - game['homeTeam']['pag'],
            'winPct_differential': game['homeTeam']['winPct'] - game['awayTeam']['winPct'],
            'yards_differential': game['homeTeam']['yardsPerGame'] - game['awayTeam']['yardsPerGame'],
            'turnover_differential': game['homeTeam']['turnoverDiff'] - game['awayTeam']['turnoverDiff'],

            # Matchup features
            'is_divisional': 1 if game['matchup']['isDivisional'] else 0,
            'is_conference': 1 if game['matchup']['isConference'] else 0,
            'is_thursday_night': 1 if game['matchup'].get('isThursdayNight', False) else 0,
            'is_monday_night': 1 if game['matchup'].get('isMondayNight', False) else 0,
            'is_sunday_night': 1 if game['matchup'].get('isSundayNight', False) else 0,

            # Weather
            'temperature': game['weather'].get('temperature', 65),
            'wind_speed': game['weather'].get('windSpeed', 5),
            'precipitation': game['weather'].get('precipitation', 0),
            'is_dome': 1 if game['weather'].get('isDome', False) else 0,

            # Target variables
            'actual_spread': game['outcome']['actualSpread'],
            'vegas_spread': game['lines']['spread'],
            'home_score': game['outcome']['homeScore'],
            'away_score': game['outcome']['awayScore'],
        }

        records.append(record)

    return pd.DataFrame(records)

def train_xgboost_model(X_train, y_train):
    """Train XGBoost model (same params as main training)"""
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=200,
        learning_rate=0.05,
        max_depth=6,
        min_child_weight=3,
        subsample=0.8,
        colsample_bytree=0.8,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42
    )

    model.fit(X_train, y_train, verbose=False)
    return model

def calculate_ats_performance(predictions):
    """Calculate ATS metrics"""
    if len(predictions) == 0:
        return None

    wins = 0
    losses = 0
    pushes = 0

    for pred in predictions:
        # Model says home covers if prediction > vegas
        model_takes_home = pred['predicted_spread'] > pred['vegas_spread']
        home_covered = pred['actual_spread'] > pred['vegas_spread']

        # Push check
        if abs(pred['actual_spread'] - pred['vegas_spread']) < 0.5:
            pushes += 1
        elif model_takes_home == home_covered:
            wins += 1
        else:
            losses += 1

    total_bets = wins + losses
    win_rate = (wins / total_bets * 100) if total_bets > 0 else 0

    # ROI
    profit = (wins * 100) - (losses * 110)
    total_wagered = total_bets * 110
    roi = (profit / total_wagered * 100) if total_wagered > 0 else 0

    return {
        'wins': wins,
        'losses': losses,
        'pushes': pushes,
        'total_bets': total_bets,
        'win_rate': win_rate,
        'roi': roi,
        'profit': profit
    }

def walk_forward_validate():
    """
    Walk-forward validation:
    - 2022: Train on 2021, predict 2022
    - 2023: Train on 2021-2022, predict 2023
    - 2024: Train on 2021-2023, predict 2024
    """
    print("="*70)
    print("WALK-FORWARD VALIDATION (2021-2024)")
    print("="*70)

    # Load data
    games = load_historical_data()
    df = prepare_training_data(games)

    print(f"\n✅ Prepared {len(df)} games with features and Vegas lines")

    # Feature columns (exclude targets and metadata)
    feature_cols = [col for col in df.columns if col not in [
        'gameId', 'season', 'week', 'actual_spread', 'vegas_spread', 'home_score', 'away_score'
    ]]

    print(f"📊 Using {len(feature_cols)} features")

    # Walk-forward validation
    results_by_season = {}
    all_predictions = []

    test_seasons = [2022, 2023, 2024]

    for test_season in test_seasons:
        print(f"\n{'='*70}")
        print(f"TEST SEASON: {test_season}")
        print(f"{'='*70}")

        # Training data: all seasons BEFORE test season
        train_data = df[df['season'] < test_season]
        test_data = df[df['season'] == test_season]

        print(f"Training on: {sorted(train_data['season'].unique())} ({len(train_data)} games)")
        print(f"Testing on: {test_season} ({len(test_data)} games)")

        # Prepare features and targets
        X_train = train_data[feature_cols]
        y_train = train_data['actual_spread']
        X_test = test_data[feature_cols]
        y_test = test_data['actual_spread']

        # Train model
        print(f"Training model...")
        model = train_xgboost_model(X_train, y_train)

        # Make predictions
        predictions = model.predict(X_test)

        # Evaluate spread prediction accuracy
        mae = mean_absolute_error(y_test, predictions)
        print(f"✅ Model trained. Spread MAE: {mae:.2f} points")

        # Store predictions for ATS calculation
        for idx, (_, row) in enumerate(test_data.iterrows()):
            all_predictions.append({
                'season': test_season,
                'week': row['week'],
                'game_id': row['gameId'],
                'predicted_spread': float(predictions[idx]),
                'vegas_spread': row['vegas_spread'],
                'actual_spread': row['actual_spread'],
                'home_score': row['home_score'],
                'away_score': row['away_score']
            })

        # Calculate ATS for this season
        season_preds = [p for p in all_predictions if p['season'] == test_season]
        ats = calculate_ats_performance(season_preds)

        if ats:
            results_by_season[test_season] = ats
            print(f"\n{test_season} ATS Performance:")
            print(f"  Record: {ats['wins']}-{ats['losses']}-{ats['pushes']}")
            print(f"  Win Rate: {ats['win_rate']:.1f}%")
            print(f"  ROI: {ats['roi']:+.1f}%")

    # Overall results
    print(f"\n{'='*70}")
    print("OVERALL WALK-FORWARD RESULTS (2022-2024)")
    print(f"{'='*70}")

    overall_ats = calculate_ats_performance(all_predictions)

    if overall_ats:
        print(f"\nCombined Record: {overall_ats['wins']}-{overall_ats['losses']}-{overall_ats['pushes']}")
        print(f"Win Rate: {overall_ats['win_rate']:.2f}%")
        print(f"ROI: {overall_ats['roi']:+.2f}%")
        print(f"Profit per $110 unit: ${overall_ats['profit']:+,.0f}")
        print(f"Breakeven: 52.38%")
        print(f"Edge: {overall_ats['win_rate'] - 52.38:+.2f}%")

        # Statistical significance
        try:
            from scipy import stats
            if hasattr(stats, 'binomtest'):
                result = stats.binomtest(overall_ats['wins'], overall_ats['total_bets'], 0.5, alternative='greater')
                p_value = result.pvalue
            else:
                p_value = stats.binom_test(overall_ats['wins'], overall_ats['total_bets'], 0.5, alternative='greater')

            print(f"\nStatistical Significance: p = {p_value:.6f}")
            if p_value < 0.05:
                print("✅ Statistically significant (p < 0.05)")
            else:
                print("⚠️  Not statistically significant")
        except:
            pass

    # Save results
    output = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'validation_type': 'walk_forward',
            'test_seasons': test_seasons,
            'total_predictions': len(all_predictions)
        },
        'by_season': results_by_season,
        'overall': overall_ats,
        'predictions': all_predictions
    }

    with open('walk_forward_results.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n💾 Saved results to walk_forward_results.json")
    print("="*70)

if __name__ == '__main__':
    walk_forward_validate()
