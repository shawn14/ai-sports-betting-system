#!/usr/bin/env python3
"""
Fresh validation test - Train on 2021-2023, test on 2024
This will give us a completely independent validation
"""

import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import xgboost as xgb
import joblib

def fresh_validation():
    print("="*70)
    print("🔬 FRESH VALIDATION TEST")
    print("="*70)

    # Load all data
    print("\n📂 Loading historical data...")
    with open('../public/training/nfl_training_data_with_vegas.json', 'r') as f:
        all_data = json.load(f)

    print(f"✅ Loaded {len(all_data['data'])} total games")

    # Split by season
    train_games = []
    test_games = []

    for game in all_data['data']:
        if game['season'] in [2021, 2022, 2023]:
            train_games.append(game)
        elif game['season'] == 2024:
            test_games.append(game)

    print(f"\n📊 Data split:")
    print(f"   Training: {len(train_games)} games (2021-2023)")
    print(f"   Testing: {len(test_games)} games (2024)")

    # Extract features
    print("\n⚙️  Extracting features...")

    X_train, y_spread_train, y_total_train = extract_features_and_targets(train_games)
    X_test, y_spread_test, y_total_test, test_metadata = extract_features_and_targets(test_games, return_metadata=True)

    print(f"✅ Training features: {X_train.shape}")
    print(f"✅ Test features: {X_test.shape}")

    # Train spread model
    print("\n🎯 Training spread model...")
    spread_model = xgb.XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=6,
        random_state=42
    )
    spread_model.fit(X_train, y_spread_train)

    # Train total model
    print("🎯 Training total model...")
    total_model = xgb.XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=6,
        random_state=42
    )
    total_model.fit(X_train, y_total_train)

    # Make predictions on 2024
    print("\n🔮 Making predictions on 2024 data...")
    spread_predictions = spread_model.predict(X_test)
    total_predictions = total_model.predict(X_test)

    # Calculate ATS performance
    print("\n📈 Calculating ATS performance...")

    ats_wins = 0
    ats_losses = 0
    ats_pushes = 0

    for i, game in enumerate(test_games):
        if 'lines' not in game or not game['lines']:
            continue

        pred_spread = spread_predictions[i]
        vegas_spread = game['lines']['spread']
        actual_spread = game['outcome']['actualSpread']

        # ATS logic
        if abs(actual_spread - vegas_spread) < 0.5:
            ats_pushes += 1
        elif (pred_spread - vegas_spread) * (actual_spread - vegas_spread) > 0:
            ats_wins += 1
        else:
            ats_losses += 1

    # Calculate stats
    total_bets = ats_wins + ats_losses
    win_rate = (ats_wins / total_bets * 100) if total_bets > 0 else 0
    profit = (ats_wins * 100) - (ats_losses * 110)
    roi = (profit / (total_bets * 110) * 100) if total_bets > 0 else 0

    print("\n" + "="*70)
    print("📊 2024 VALIDATION RESULTS (COMPLETELY FRESH TEST)")
    print("="*70)
    print(f"\nRecord: {ats_wins}-{ats_losses}-{ats_pushes}")
    print(f"Win Rate: {win_rate:.2f}%")
    print(f"ROI: {roi:+.2f}%")
    print(f"Profit (per $110 unit): ${profit:+.0f}")
    print(f"\nBreakeven: 52.38%")
    print(f"Edge: {win_rate - 52.38:+.2f}%")

    if win_rate > 55:
        print("\n✅ EXCELLENT - Above 55% is world-class!")
    elif win_rate > 52.4:
        print("\n✅ GOOD - Profitable above breakeven")
    else:
        print("\n⚠️  BELOW BREAKEVEN - Model needs improvement")

    print("="*70)

    return {
        'wins': ats_wins,
        'losses': ats_losses,
        'pushes': ats_pushes,
        'win_rate': win_rate,
        'roi': roi
    }

def extract_features_and_targets(games, return_metadata=False):
    """Extract features from games"""

    X = []
    y_spread = []
    y_total = []
    metadata = []

    for game in games:
        home = game['homeTeam']
        away = game['awayTeam']
        matchup = game['matchup']
        weather = game['weather']

        # Calculate derived features
        home_last3 = home.get('last3Games', {})
        away_last3 = away.get('last3Games', {})

        home_last3_pf = sum(home_last3.get('pointsScored', [0,0,0])) / 3
        home_last3_pa = sum(home_last3.get('pointsAllowed', [0,0,0])) / 3
        away_last3_pf = sum(away_last3.get('pointsScored', [0,0,0])) / 3
        away_last3_pa = sum(away_last3.get('pointsAllowed', [0,0,0])) / 3

        features = [
            home['winPct'],
            home['ppg'],
            home['pag'],
            home['yardsPerGame'],
            home['yardsAllowedPerGame'],
            home['turnoverDiff'],
            away['winPct'],
            away['ppg'],
            away['pag'],
            away['yardsPerGame'],
            away['yardsAllowedPerGame'],
            away['turnoverDiff'],
            home_last3_pf,
            home_last3_pa,
            away_last3_pf,
            away_last3_pa,
            home.get('restDays', 7),
            away.get('restDays', 7),
            matchup.get('restDaysDiff', 0),
            home['ppg'] - away['ppg'],
            away['pag'] - home['pag'],
            home['winPct'] - away['winPct'],
            home['yardsPerGame'] - away['yardsPerGame'],
            home['turnoverDiff'] - away['turnoverDiff'],
            1 if matchup['isDivisional'] else 0,
            1 if matchup['isConference'] else 0,
            1 if matchup.get('isThursdayNight', False) else 0,
            1 if matchup.get('isMondayNight', False) else 0,
            1 if matchup.get('isSundayNight', False) else 0,
            weather['temperature'],
            weather['windSpeed'],
            weather['precipitation'],
            1 if weather['isDome'] else 0,
        ]

        X.append(features)
        y_spread.append(game['outcome']['actualSpread'])
        y_total.append(game['outcome']['actualTotal'])

        if return_metadata:
            metadata.append(game)

    if return_metadata:
        return np.array(X), np.array(y_spread), np.array(y_total), metadata
    else:
        return np.array(X), np.array(y_spread), np.array(y_total)

if __name__ == '__main__':
    fresh_validation()
