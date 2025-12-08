#!/usr/bin/env python3
"""
Calculate ATS performance for each season individually
"""

import json
import numpy as np

def season_by_season_performance():
    print("="*70)
    print("📊 ATS PERFORMANCE BY SEASON")
    print("="*70)

    # Load all data
    with open('../public/training/nfl_training_data_with_vegas.json', 'r') as f:
        all_data = json.load(f)

    # Group by season
    seasons = {}
    for game in all_data['data']:
        season = game['season']
        if season not in seasons:
            seasons[season] = []
        seasons[season].append(game)

    print(f"\n✅ Loaded data for seasons: {sorted(seasons.keys())}")

    # For each season, calculate ATS if we use a model trained on all OTHER seasons
    results_by_season = {}

    for test_season in sorted(seasons.keys()):
        print(f"\n{'='*70}")
        print(f"Testing on {test_season} season...")
        print(f"{'='*70}")

        # Split data
        train_games = []
        test_games = seasons[test_season]

        for season, games in seasons.items():
            if season != test_season:
                train_games.extend(games)

        print(f"Training on: {len(train_games)} games from other seasons")
        print(f"Testing on: {len(test_games)} games from {test_season}")

        # Extract features
        X_train, y_spread_train = extract_features(train_games)
        X_test, y_spread_test = extract_features(test_games)

        # Quick XGBoost model
        from xgboost import XGBRegressor
        model = XGBRegressor(n_estimators=100, learning_rate=0.05, max_depth=6, random_state=42)
        model.fit(X_train, y_spread_train)

        # Predict
        predictions = model.predict(X_test)

        # Calculate ATS
        wins = 0
        losses = 0
        pushes = 0

        for i, game in enumerate(test_games):
            if 'lines' not in game or not game['lines']:
                continue

            pred_spread = predictions[i]
            vegas_spread = game['lines']['spread']
            actual_spread = game['outcome']['actualSpread']

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

        results_by_season[test_season] = {
            'wins': wins,
            'losses': losses,
            'pushes': pushes,
            'win_rate': win_rate,
            'roi': roi,
            'profit': profit
        }

        print(f"\n{test_season} Results:")
        print(f"  Record: {wins}-{losses}-{pushes}")
        print(f"  Win Rate: {win_rate:.2f}%")
        print(f"  ROI: {roi:+.2f}%")
        print(f"  Profit: ${profit:+.0f}")

    # Summary
    print("\n" + "="*70)
    print("📈 SUMMARY BY SEASON")
    print("="*70)
    print(f"\n{'Season':<10} {'Record':<15} {'Win Rate':<12} {'ROI':<10} {'Profit':<10}")
    print("-" * 70)

    total_wins = 0
    total_losses = 0
    total_pushes = 0

    for season in sorted(results_by_season.keys()):
        r = results_by_season[season]
        record = f"{r['wins']}-{r['losses']}-{r['pushes']}"
        print(f"{season:<10} {record:<15} {r['win_rate']:>6.2f}%     {r['roi']:>+6.2f}%   ${r['profit']:>+7.0f}")

        total_wins += r['wins']
        total_losses += r['losses']
        total_pushes += r['pushes']

    print("-" * 70)
    overall_wr = (total_wins / (total_wins + total_losses) * 100) if (total_wins + total_losses) > 0 else 0
    overall_profit = (total_wins * 100) - (total_losses * 110)
    overall_roi = (overall_profit / ((total_wins + total_losses) * 110) * 100) if (total_wins + total_losses) > 0 else 0

    record = f"{total_wins}-{total_losses}-{total_pushes}"
    print(f"{'OVERALL':<10} {record:<15} {overall_wr:>6.2f}%     {overall_roi:>+6.2f}%   ${overall_profit:>+7.0f}")
    print("="*70)

    # Show variance stats
    win_rates = [r['win_rate'] for r in results_by_season.values()]
    print(f"\n📊 Win Rate Statistics:")
    print(f"   Mean: {np.mean(win_rates):.2f}%")
    print(f"   Std Dev: {np.std(win_rates):.2f}%")
    print(f"   Min: {min(win_rates):.2f}%")
    print(f"   Max: {max(win_rates):.2f}%")
    print(f"   Range: {max(win_rates) - min(win_rates):.2f}%")

    return results_by_season

def extract_features(games):
    """Extract features from games"""
    X = []
    y_spread = []

    for game in games:
        home = game['homeTeam']
        away = game['awayTeam']
        matchup = game['matchup']
        weather = game['weather']

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

    return np.array(X), np.array(y_spread)

if __name__ == '__main__':
    season_by_season_performance()
