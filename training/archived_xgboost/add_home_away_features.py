#!/usr/bin/env python3
"""
Add Home/Away split features and streak to improve model predictions
Phase 1: Quick wins with free ESPN API data
"""

import json
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split

def load_data():
    """Load existing training data"""
    print("=" * 70)
    print("📊 PHASE 1: ADDING HOME/AWAY SPLITS + STREAK")
    print("=" * 70)

    with open('../public/training/nfl_training_data_with_vegas.json', 'r') as f:
        data = json.load(f)

    print(f"\n✅ Loaded {len(data['data'])} games")
    print(f"   Seasons: {data['metadata']['seasons']}")
    print(f"   Current features: {len(data['metadata']['features'])}")

    return data

def extract_features_with_splits(games):
    """
    Extract features INCLUDING home/away splits and streak

    NEW FEATURES ADDED:
    - home_win_pct_at_home (instead of just home_win_pct)
    - away_win_pct_on_road (instead of just away_win_pct)
    - home_streak
    - away_streak
    """
    X = []
    y_spread = []
    y_total = []

    for game in games:
        home = game['homeTeam']
        away = game['awayTeam']
        matchup = game['matchup']
        weather = game['weather']

        # Calculate derived features
        home_last3 = home.get('last3Games', {})
        away_last3 = away.get('last3Games', {})

        home_last3_pf = sum(home_last3.get('pointsScored', [0,0,0])) / 3 if home_last3.get('pointsScored') else 0
        home_last3_pa = sum(home_last3.get('pointsAllowed', [0,0,0])) / 3 if home_last3.get('pointsAllowed') else 0
        away_last3_pf = sum(away_last3.get('pointsScored', [0,0,0])) / 3 if away_last3.get('pointsScored') else 0
        away_last3_pa = sum(away_last3.get('pointsAllowed', [0,0,0])) / 3 if away_last3.get('pointsAllowed') else 0

        # ORIGINAL 33 FEATURES (keeping for comparison)
        features = [
            # Team overall stats
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
            # Recent form
            home_last3_pf,
            home_last3_pa,
            away_last3_pf,
            away_last3_pa,
            # Rest
            home.get('restDays', 7),
            away.get('restDays', 7),
            matchup.get('restDaysDiff', 0),
            # Differentials
            home['ppg'] - away['ppg'],
            away['pag'] - home['pag'],
            home['winPct'] - away['winPct'],
            home['yardsPerGame'] - away['yardsPerGame'],
            home['turnoverDiff'] - away['turnoverDiff'],
            # Matchup context
            1 if matchup['isDivisional'] else 0,
            1 if matchup['isConference'] else 0,
            1 if matchup.get('isThursdayNight', False) else 0,
            1 if matchup.get('isMondayNight', False) else 0,
            1 if matchup.get('isSundayNight', False) else 0,
            # Weather
            weather['temperature'],
            weather['windSpeed'],
            weather['precipitation'],
            1 if weather['isDome'] else 0,
        ]

        # NEW FEATURES (6 total)
        new_features = [
            # Home/Away splits - THE BIG ONE
            home.get('homeRecord', home['winPct']),  # Win % at home
            away.get('awayRecord', away['winPct']),  # Win % on road
            home.get('homeRecord', home['winPct']) - away.get('awayRecord', away['winPct']),  # Home/road advantage diff
            # Momentum
            home.get('streak', 0),  # Current streak (+ = winning, - = losing)
            away.get('streak', 0),
            home.get('streak', 0) - away.get('streak', 0),  # Momentum differential
        ]

        # Combine original + new
        features.extend(new_features)

        X.append(features)
        y_spread.append(game['outcome']['actualSpread'])
        y_total.append(game['outcome']['actualTotal'])

    return np.array(X), np.array(y_spread), np.array(y_total)

def compare_models(data):
    """Compare old model (33 features) vs new model (39 features)"""

    print("\n" + "=" * 70)
    print("🔬 MODEL COMPARISON: OLD (33) vs NEW (39 features)")
    print("=" * 70)

    # Split by season for fair comparison
    train_games = []
    test_games = []

    for game in data['data']:
        if game['season'] in [2021, 2022, 2023]:
            train_games.append(game)
        elif game['season'] == 2024:
            test_games.append(game)

    print(f"\n📊 Data Split:")
    print(f"   Training: {len(train_games)} games (2021-2023)")
    print(f"   Testing: {len(test_games)} games (2024)")

    # Extract features with new splits
    X_train, y_spread_train, y_total_train = extract_features_with_splits(train_games)
    X_test, y_spread_test, y_total_test = extract_features_with_splits(test_games)

    print(f"\n✅ Feature matrix shape: {X_train.shape}")
    print(f"   Total features: {X_train.shape[1]} (33 original + 6 new)")

    # Test ORIGINAL model (first 33 features only)
    print("\n" + "=" * 70)
    print("📈 BASELINE MODEL (33 Original Features)")
    print("=" * 70)

    X_train_old = X_train[:, :33]
    X_test_old = X_test[:, :33]

    model_old = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42)
    model_old.fit(X_train_old, y_spread_train)
    predictions_old = model_old.predict(X_test_old)

    ats_old = calculate_ats(test_games, predictions_old)

    print(f"\nATS Performance (2024):")
    print(f"   Record: {ats_old['wins']}-{ats_old['losses']}-{ats_old['pushes']}")
    print(f"   Win Rate: {ats_old['win_rate']:.2f}%")
    print(f"   ROI: {ats_old['roi']:+.2f}%")

    # Test NEW model (all 39 features)
    print("\n" + "=" * 70)
    print("🚀 NEW MODEL (39 Features with Home/Away Splits + Streak)")
    print("=" * 70)

    model_new = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42)
    model_new.fit(X_train, y_spread_train)
    predictions_new = model_new.predict(X_test)

    ats_new = calculate_ats(test_games, predictions_new)

    print(f"\nATS Performance (2024):")
    print(f"   Record: {ats_new['wins']}-{ats_new['losses']}-{ats_new['pushes']}")
    print(f"   Win Rate: {ats_new['win_rate']:.2f}%")
    print(f"   ROI: {ats_new['roi']:+.2f}%")

    # Show improvement
    print("\n" + "=" * 70)
    print("📊 IMPROVEMENT")
    print("=" * 70)

    wr_improvement = ats_new['win_rate'] - ats_old['win_rate']
    roi_improvement = ats_new['roi'] - ats_old['roi']

    print(f"\nWin Rate: {ats_old['win_rate']:.2f}% → {ats_new['win_rate']:.2f}% ({wr_improvement:+.2f}%)")
    print(f"ROI: {ats_old['roi']:+.2f}% → {ats_new['roi']:+.2f}% ({roi_improvement:+.2f}%)")

    if wr_improvement > 0:
        print(f"\n✅ IMPROVEMENT! New features add {wr_improvement:.2f}% to win rate")
    elif wr_improvement < 0:
        print(f"\n⚠️  WORSE! New features hurt performance by {abs(wr_improvement):.2f}%")
    else:
        print(f"\n➡️  NO CHANGE - New features don't help or hurt")

    # Show feature importance
    print("\n" + "=" * 70)
    print("🎯 TOP 10 MOST IMPORTANT FEATURES (New Model)")
    print("=" * 70)

    feature_names = [
        'home_win_pct', 'home_ppg', 'home_pag', 'home_yards', 'home_yards_allowed', 'home_to_diff',
        'away_win_pct', 'away_ppg', 'away_pag', 'away_yards', 'away_yards_allowed', 'away_to_diff',
        'home_last3_pf', 'home_last3_pa', 'away_last3_pf', 'away_last3_pa',
        'home_rest', 'away_rest', 'rest_diff',
        'ppg_diff', 'pag_diff', 'win_pct_diff', 'yards_diff', 'to_diff_diff',
        'is_divisional', 'is_conference', 'is_thursday', 'is_monday', 'is_sunday',
        'temp', 'wind', 'precip', 'is_dome',
        'home_win_pct_at_home', 'away_win_pct_on_road', 'home_road_advantage',
        'home_streak', 'away_streak', 'streak_diff'
    ]

    importances = model_new.feature_importances_
    feature_importance = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)

    print()
    for i, (name, importance) in enumerate(feature_importance[:10], 1):
        marker = "🆕" if name in ['home_win_pct_at_home', 'away_win_pct_on_road', 'home_road_advantage',
                                    'home_streak', 'away_streak', 'streak_diff'] else "  "
        print(f"   {i:2d}. {marker} {name:<25} {importance:.4f}")

    return {
        'old_model': ats_old,
        'new_model': ats_new,
        'improvement': wr_improvement
    }

def calculate_ats(games, predictions):
    """Calculate ATS performance"""
    wins = 0
    losses = 0
    pushes = 0

    for i, game in enumerate(games):
        if 'lines' not in game or not game['lines']:
            continue

        pred_spread = predictions[i]
        vegas_spread = game['lines']['spread']
        actual_spread = game['outcome']['actualSpread']

        # ATS logic
        if abs(actual_spread - vegas_spread) < 0.5:
            pushes += 1
        elif (pred_spread - vegas_spread) * (actual_spread - vegas_spread) > 0:
            wins += 1
        else:
            losses += 1

    total_bets = wins + losses
    win_rate = (wins / total_bets * 100) if total_bets > 0 else 0
    profit = (wins * 100) - (losses * 110)
    roi = (profit / (total_bets * 110) * 100) if total_bets > 0 else 0

    return {
        'wins': wins,
        'losses': losses,
        'pushes': pushes,
        'win_rate': win_rate,
        'roi': roi,
        'profit': profit
    }

if __name__ == '__main__':
    data = load_data()
    results = compare_models(data)

    print("\n" + "=" * 70)
    print("🎯 CONCLUSION")
    print("=" * 70)

    if results['improvement'] > 0.5:
        print(f"\n✅ SUCCESS! Home/Away splits improved win rate by {results['improvement']:.2f}%")
        print(f"\nNext steps:")
        print(f"   1. Update training script to use 39 features")
        print(f"   2. Retrain full model on all available data")
        print(f"   3. Update prediction pipeline to include new features")
    elif results['improvement'] > 0:
        print(f"\n✅ MARGINAL IMPROVEMENT ({results['improvement']:.2f}%)")
        print(f"\nThe features help slightly, but may not be worth the added complexity.")
    else:
        print(f"\n⚠️  NO IMPROVEMENT")
        print(f"\nHome/Away splits don't improve predictions. Stick with original 33 features.")

    print()
