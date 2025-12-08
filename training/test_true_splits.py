#!/usr/bin/env python3
"""
Test if TRUE home/away splits improve model performance
"""

import json
import numpy as np
from xgboost import XGBRegressor

def load_data_with_true_splits():
    """Load enhanced training data"""
    print("=" * 70)
    print("🧪 TESTING MODEL WITH TRUE HOME/AWAY SPLITS")
    print("=" * 70)

    with open('../public/training/nfl_training_data_with_true_splits.json', 'r') as f:
        data = json.load(f)

    print(f"\n✅ Loaded {len(data['data'])} games with calculated splits")

    return data

def extract_features(games, use_splits=False):
    """
    Extract features with optional home/away splits

    use_splits=False: Original 33 features
    use_splits=True: 39 features (33 + 6 new)
    """
    X = []
    y_spread = []

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

        # ORIGINAL 33 FEATURES
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

        # ADD NEW FEATURES if requested
        if use_splits:
            new_features = [
                home.get('homeRecord', home['winPct']),  # Home team's win % AT HOME
                away.get('awayRecord', away['winPct']),  # Away team's win % ON ROAD
                home.get('homeRecord', home['winPct']) - away.get('awayRecord', away['winPct']),  # Advantage
                home.get('streak', 0),  # Momentum
                away.get('streak', 0),
                home.get('streak', 0) - away.get('streak', 0),
            ]
            features.extend(new_features)

        X.append(features)
        y_spread.append(game['outcome']['actualSpread'])

    return np.array(X), np.array(y_spread)

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

def compare_models(data):
    """Compare original vs enhanced model"""

    # Split data: train on 2021-2023, test on 2024
    train_games = [g for g in data['data'] if g['season'] in [2021, 2022, 2023]]
    test_games = [g for g in data['data'] if g['season'] == 2024]

    print(f"\n📊 Data Split:")
    print(f"   Training: {len(train_games)} games (2021-2023)")
    print(f"   Testing: {len(test_games)} games (2024)")

    # Test ORIGINAL model (33 features)
    print("\n" + "=" * 70)
    print("📈 BASELINE MODEL (33 Features)")
    print("=" * 70)

    X_train_old, y_train_old = extract_features(train_games, use_splits=False)
    X_test_old, y_test_old = extract_features(test_games, use_splits=False)

    model_old = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42)
    model_old.fit(X_train_old, y_train_old)
    pred_old = model_old.predict(X_test_old)

    ats_old = calculate_ats(test_games, pred_old)

    print(f"\n2024 ATS Performance:")
    print(f"   Record: {ats_old['wins']}-{ats_old['losses']}-{ats_old['pushes']}")
    print(f"   Win Rate: {ats_old['win_rate']:.2f}%")
    print(f"   ROI: {ats_old['roi']:+.2f}%")
    print(f"   Profit: ${ats_old['profit']:+,.0f}")

    # Test NEW model (39 features with TRUE splits)
    print("\n" + "=" * 70)
    print("🚀 ENHANCED MODEL (39 Features + TRUE Home/Away Splits)")
    print("=" * 70)

    X_train_new, y_train_new = extract_features(train_games, use_splits=True)
    X_test_new, y_test_new = extract_features(test_games, use_splits=True)

    model_new = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42)
    model_new.fit(X_train_new, y_train_new)
    pred_new = model_new.predict(X_test_new)

    ats_new = calculate_ats(test_games, pred_new)

    print(f"\n2024 ATS Performance:")
    print(f"   Record: {ats_new['wins']}-{ats_new['losses']}-{ats_new['pushes']}")
    print(f"   Win Rate: {ats_new['win_rate']:.2f}%")
    print(f"   ROI: {ats_new['roi']:+.2f}%")
    print(f"   Profit: ${ats_new['profit']:+,.0f}")

    # Show improvement
    print("\n" + "=" * 70)
    print("📊 IMPROVEMENT ANALYSIS")
    print("=" * 70)

    wr_diff = ats_new['win_rate'] - ats_old['win_rate']
    roi_diff = ats_new['roi'] - ats_old['roi']
    profit_diff = ats_new['profit'] - ats_old['profit']

    print(f"\nWin Rate: {ats_old['win_rate']:.2f}% → {ats_new['win_rate']:.2f}% ({wr_diff:+.2f}%)")
    print(f"ROI: {ats_old['roi']:+.2f}% → {ats_new['roi']:+.2f}% ({roi_diff:+.2f}%)")
    print(f"Profit: ${ats_old['profit']:+,.0f} → ${ats_new['profit']:+,.0f} (${profit_diff:+,.0f})")

    # Feature importance
    print("\n" + "=" * 70)
    print("🎯 TOP 15 MOST IMPORTANT FEATURES")
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
    for i, (name, importance) in enumerate(feature_importance[:15], 1):
        is_new = name in ['home_win_pct_at_home', 'away_win_pct_on_road', 'home_road_advantage',
                          'home_streak', 'away_streak', 'streak_diff']
        marker = "🆕" if is_new else "  "
        print(f"   {i:2d}. {marker} {name:<25} {importance:.4f}")

    # Verdict
    print("\n" + "=" * 70)
    print("🎯 VERDICT")
    print("=" * 70)

    if wr_diff > 1.0:
        print(f"\n✅ SIGNIFICANT IMPROVEMENT (+{wr_diff:.2f}%)")
        print(f"\nThe home/away splits add meaningful predictive power!")
        print(f"Recommendation: Integrate into production model")
    elif wr_diff > 0.3:
        print(f"\n✅ MODERATE IMPROVEMENT (+{wr_diff:.2f}%)")
        print(f"\nThe splits help, worth considering for production")
    elif wr_diff > 0:
        print(f"\n➡️ MARGINAL IMPROVEMENT (+{wr_diff:.2f}%)")
        print(f"\nThe splits help slightly, but may not justify added complexity")
    elif wr_diff > -0.3:
        print(f"\n➡️ NO MEANINGFUL CHANGE ({wr_diff:+.2f}%)")
        print(f"\nThe splits don't add predictive value")
    else:
        print(f"\n⚠️ WORSE PERFORMANCE ({wr_diff:+.2f}%)")
        print(f"\nThe splits hurt predictions - don't use them")

    print()

    return {
        'baseline': ats_old,
        'enhanced': ats_new,
        'improvement': wr_diff
    }

if __name__ == '__main__':
    data = load_data_with_true_splits()
    results = compare_models(data)
