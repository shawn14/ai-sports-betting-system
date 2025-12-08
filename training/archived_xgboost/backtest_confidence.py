#!/usr/bin/env python3
"""
Backtest NFL betting model with confidence-based bet filtering.

Strategy: Only bet when the model has high confidence (prediction differs
significantly from Vegas line).
"""

import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime


def load_model_and_data():
    """Load the trained model and test data"""
    print("Loading model and data...")

    # Load latest model (33 features, no EPA)
    model_file = 'spread_model_20251206_211858.pkl'
    with open(model_file, 'rb') as f:
        model = pickle.load(f)

    # Load feature columns
    with open('feature_columns_20251206_211858.json', 'r') as f:
        feature_data = json.load(f)
        feature_cols = feature_data['features']

    # Load training data
    with open('nfl_training_data_with_vegas.json', 'r') as f:
        dataset = json.load(f)

    print(f"✅ Loaded model: {model_file}")
    print(f"✅ Features: {len(feature_cols)}")
    print(f"✅ Games: {len(dataset['data'])}")

    return model, feature_cols, dataset


def extract_features(game):
    """Extract features from a single game (same logic as train_model.py)"""
    home_last3 = game['homeTeam']['last3Games']
    away_last3 = game['awayTeam']['last3Games']

    home_last3_pf = sum(home_last3.get('pointsScored', [0])) / max(len(home_last3.get('pointsScored', [0])), 1)
    home_last3_pa = sum(home_last3.get('pointsAllowed', [0])) / max(len(home_last3.get('pointsAllowed', [0])), 1)
    away_last3_pf = sum(away_last3.get('pointsScored', [0])) / max(len(away_last3.get('pointsScored', [0])), 1)
    away_last3_pa = sum(away_last3.get('pointsAllowed', [0])) / max(len(away_last3.get('pointsAllowed', [0])), 1)

    features = {
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

        # Weather features
        'temperature': game['weather']['temperature'],
        'wind_speed': game['weather']['windSpeed'],
        'precipitation': game['weather']['precipitation'],
        'is_dome': 1 if game['weather']['isDome'] else 0,
    }

    return features


def backtest_with_confidence(model, feature_cols, games, confidence_thresholds):
    """
    Backtest betting strategy with different confidence thresholds.

    Confidence metric: abs(our_prediction - vegas_spread)
    Only bet when our prediction differs from Vegas by at least the threshold.
    """
    print(f"\n{'='*80}")
    print("CONFIDENCE-BASED BACKTEST")
    print(f"{'='*80}")

    # Use same train/test split as training (665 train, 167 test)
    test_games = games[665:]

    print(f"Test set: {len(test_games)} games")
    print(f"Testing confidence thresholds: {confidence_thresholds}")

    results = {}

    for threshold in confidence_thresholds:
        bets = []

        for game in test_games:
            # Skip if no Vegas line
            if 'lines' not in game or not game['lines']:
                continue

            vegas_spread = game['lines']['spread']
            actual_spread = game['outcome']['actualSpread']

            # Extract features and predict
            features = extract_features(game)
            X = pd.DataFrame([features])[feature_cols]
            predicted_spread = model.predict(X)[0]

            # Calculate confidence (how much we differ from Vegas)
            confidence = abs(predicted_spread - vegas_spread)

            # Only bet if confidence exceeds threshold
            if confidence >= threshold:
                # Determine bet direction
                # If we predict home to win by MORE than Vegas, bet home
                # If we predict home to win by LESS than Vegas (or lose by more), bet away
                if predicted_spread > vegas_spread:
                    # Bet on home (we think they'll beat the spread)
                    bet_on_home = True
                    home_covered = actual_spread > vegas_spread
                    won = home_covered
                else:
                    # Bet on away (we think they'll beat the spread)
                    bet_on_home = False
                    away_covered = actual_spread < vegas_spread
                    won = away_covered

                bets.append({
                    'game': f"{game['awayTeam']['name']} @ {game['homeTeam']['name']}",
                    'season': game['season'],
                    'week': game['week'],
                    'vegas_spread': vegas_spread,
                    'predicted_spread': predicted_spread,
                    'actual_spread': actual_spread,
                    'confidence': confidence,
                    'bet_on': 'home' if bet_on_home else 'away',
                    'won': won
                })

        # Calculate performance
        if len(bets) > 0:
            wins = sum(1 for b in bets if b['won'])
            win_rate = wins / len(bets)

            # Calculate units (assuming -110 vig)
            units = 0
            for bet in bets:
                if bet['won']:
                    units += 1  # Win $100 on $110 bet = 0.909 units, simplified to 1
                else:
                    units -= 1.1  # Lose $110

            roi = (units / len(bets)) * 100

            results[threshold] = {
                'threshold': threshold,
                'total_bets': len(bets),
                'wins': wins,
                'losses': len(bets) - wins,
                'win_rate': win_rate,
                'units': units,
                'roi': roi,
                'bets': bets
            }
        else:
            results[threshold] = {
                'threshold': threshold,
                'total_bets': 0,
                'wins': 0,
                'losses': 0,
                'win_rate': 0,
                'units': 0,
                'roi': 0,
                'bets': []
            }

    return results


def print_results(results):
    """Print backtest results in a nice table"""
    print(f"\n{'='*80}")
    print("BACKTEST RESULTS BY CONFIDENCE THRESHOLD")
    print(f"{'='*80}")
    print(f"{'Threshold':<12} {'Bets':<8} {'Wins':<8} {'Win %':<10} {'Units':<12} {'ROI':<10}")
    print(f"{'-'*80}")

    for threshold in sorted(results.keys()):
        r = results[threshold]
        if r['total_bets'] > 0:
            print(f"{threshold:<12.1f} {r['total_bets']:<8} {r['wins']:<8} "
                  f"{r['win_rate']*100:>6.1f}%    "
                  f"{r['units']:>+8.1f}     "
                  f"{r['roi']:>+6.1f}%")
        else:
            print(f"{threshold:<12.1f} {'0':<8} {'-':<8} {'-':<10} {'-':<12} {'-':<10}")

    # Find best threshold
    best_threshold = None
    best_roi = -float('inf')
    best_win_rate = 0

    for threshold, r in results.items():
        if r['total_bets'] >= 20:  # Require at least 20 bets for statistical significance
            if r['roi'] > best_roi or (r['roi'] == best_roi and r['win_rate'] > best_win_rate):
                best_roi = r['roi']
                best_win_rate = r['win_rate']
                best_threshold = threshold

    if best_threshold is not None:
        print(f"\n{'='*80}")
        print("OPTIMAL THRESHOLD")
        print(f"{'='*80}")
        r = results[best_threshold]
        print(f"Confidence Threshold: {best_threshold} points")
        print(f"Total Bets: {r['total_bets']}")
        print(f"Win Rate: {r['win_rate']*100:.1f}%")
        print(f"Units Won: {r['units']:+.1f}")
        print(f"ROI: {r['roi']:+.1f}%")
        print(f"\n💡 This strategy only bets when our prediction differs from Vegas by {best_threshold}+ points")

        # Show some example bets
        print(f"\nSample High-Confidence Bets:")
        sample_bets = sorted(r['bets'], key=lambda x: x['confidence'], reverse=True)[:5]
        for bet in sample_bets:
            result = "✅ WON" if bet['won'] else "❌ LOST"
            print(f"  {result} | {bet['game']} (Week {bet['week']})")
            print(f"         Vegas: {bet['vegas_spread']:+.1f} | Our prediction: {bet['predicted_spread']:+.1f} | "
                  f"Actual: {bet['actual_spread']:+.1f}")
            print(f"         Confidence: {bet['confidence']:.1f} points | Bet on: {bet['bet_on']}")
    else:
        print(f"\n⚠️  No threshold produced profitable results with 20+ bets")


def main():
    # Load model and data
    model, feature_cols, dataset = load_model_and_data()
    games = dataset['data']

    # Test different confidence thresholds
    confidence_thresholds = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0]

    # Run backtest
    results = backtest_with_confidence(model, feature_cols, games, confidence_thresholds)

    # Print results
    print_results(results)

    # Save results
    output_file = f'backtest_confidence_results_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    with open(output_file, 'w') as f:
        # Convert to JSON-serializable format
        json_results = {}
        for threshold, r in results.items():
            json_results[str(threshold)] = {
                'threshold': r['threshold'],
                'total_bets': r['total_bets'],
                'wins': r['wins'],
                'losses': r['losses'],
                'win_rate': r['win_rate'],
                'units': r['units'],
                'roi': r['roi']
            }
        json.dump(json_results, f, indent=2)

    print(f"\n✅ Results saved to {output_file}")


if __name__ == '__main__':
    main()
