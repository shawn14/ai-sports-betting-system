#!/usr/bin/env python3
"""
Backtest the model on historical data (2021-2024)
Uses walk-forward validation - train on prior seasons, test on next season
"""

import json
import pickle
import pandas as pd
import numpy as np
from datetime import datetime

def load_model_and_features():
    """Load the trained model and feature list"""
    MODEL_PATH = 'spread_model_20251206_211858.pkl'
    FEATURES_PATH = 'feature_columns_20251206_211858.json'

    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)

    with open(FEATURES_PATH, 'r') as f:
        feature_data = json.load(f)
        features = feature_data['features']

    return model, features

def load_historical_data():
    """Load the full 2021-2024 dataset with Vegas spreads"""
    print("Loading historical data with Vegas spreads...")
    with open('nfl_training_data_with_vegas.json', 'r') as f:
        dataset = json.load(f)

    games = dataset['data']
    print(f"✅ Loaded {len(games)} games from {min(g['season'] for g in games)}-{max(g['season'] for g in games)}")

    return games

def calculate_team_stats_historical(team_name, season, week, all_games):
    """
    Calculate team statistics using only prior games
    (same logic as prediction script)
    """
    # Find all games this team played before this week in this season
    team_games = [
        g for g in all_games
        if g['season'] == season and g['week'] < week and
        (g['homeTeam']['name'] == team_name or g['awayTeam']['name'] == team_name)
    ]

    # If no games yet, return defaults
    if not team_games:
        return {
            'winPct': 0.5,
            'ppg': 22.0,
            'pag': 22.0,
            'yardsPerGame': 350.0,
            'yardsAllowedPerGame': 350.0,
            'turnoverDiff': 0,
            'restDays': 7,
            'last3_pf': [22, 22, 22],
            'last3_pa': [22, 22, 22]
        }

    # Calculate stats
    wins = 0
    total_pf = 0
    total_pa = 0
    scores_for = []
    scores_against = []

    for game in team_games:
        is_home = game['homeTeam']['name'] == team_name

        if is_home:
            pf = game['outcome']['homeScore']
            pa = game['outcome']['awayScore']
            won = game['outcome']['homeWon']
        else:
            pf = game['outcome']['awayScore']
            pa = game['outcome']['homeScore']
            won = not game['outcome']['homeWon']

        scores_for.append(pf)
        scores_against.append(pa)
        total_pf += pf
        total_pa += pa
        if won:
            wins += 1

    games_played = len(team_games)

    # Last 3 games
    last3_pf = scores_for[-3:] if len(scores_for) >= 3 else scores_for
    last3_pa = scores_against[-3:] if len(scores_against) >= 3 else scores_against

    # Pad if needed
    while len(last3_pf) < 3:
        last3_pf.append(total_pf / games_played)
    while len(last3_pa) < 3:
        last3_pa.append(total_pa / games_played)

    return {
        'winPct': wins / games_played if games_played > 0 else 0.5,
        'ppg': total_pf / games_played if games_played > 0 else 22.0,
        'pag': total_pa / games_played if games_played > 0 else 22.0,
        'yardsPerGame': 350.0,  # Not available in dataset
        'yardsAllowedPerGame': 350.0,
        'turnoverDiff': 0,
        'restDays': 7,
        'last3_pf': last3_pf,
        'last3_pa': last3_pa
    }

def extract_features(game, home_stats, away_stats):
    """Extract features for prediction (matches training format)"""

    home_last3_pf = np.mean(home_stats['last3_pf'])
    home_last3_pa = np.mean(home_stats['last3_pa'])
    away_last3_pf = np.mean(away_stats['last3_pf'])
    away_last3_pa = np.mean(away_stats['last3_pa'])

    features = {
        # Home team
        'home_winPct': home_stats['winPct'],
        'home_ppg': home_stats['ppg'],
        'home_pag': home_stats['pag'],
        'home_yards_pg': home_stats['yardsPerGame'],
        'home_yards_allowed_pg': home_stats['yardsAllowedPerGame'],
        'home_turnover_diff': home_stats['turnoverDiff'],

        # Away team
        'away_winPct': away_stats['winPct'],
        'away_ppg': away_stats['ppg'],
        'away_pag': away_stats['pag'],
        'away_yards_pg': away_stats['yardsPerGame'],
        'away_yards_allowed_pg': away_stats['yardsAllowedPerGame'],
        'away_turnover_diff': away_stats['turnoverDiff'],

        # Last 3 games
        'home_last3_ppf': home_last3_pf,
        'home_last3_ppa': home_last3_pa,
        'away_last3_ppf': away_last3_pf,
        'away_last3_ppa': away_last3_pa,

        # Rest days
        'home_rest_days': home_stats['restDays'],
        'away_rest_days': away_stats['restDays'],
        'rest_days_diff': 0,

        # Derived features
        'ppg_differential': home_stats['ppg'] - away_stats['ppg'],
        'pag_differential': away_stats['pag'] - home_stats['pag'],
        'winPct_differential': home_stats['winPct'] - away_stats['winPct'],
        'yards_differential': home_stats['yardsPerGame'] - away_stats['yardsPerGame'],
        'turnover_differential': home_stats['turnoverDiff'] - away_stats['turnoverDiff'],

        # Matchup features (use defaults since not in historical data)
        'is_divisional': 0,
        'is_conference': 1,
        'is_thursday_night': 0,
        'is_monday_night': 0,
        'is_sunday_night': 0,

        # Weather (defaults)
        'temperature': 65,
        'wind_speed': 5,
        'precipitation': 0,
        'is_dome': 0,
    }

    return features

def backtest_season(model, feature_cols, games, test_season):
    """
    Backtest on a single season
    Uses only data from earlier weeks in that season
    """
    print(f"\n{'='*70}")
    print(f"BACKTESTING {test_season} SEASON")
    print(f"{'='*70}")

    # Get games for this season
    season_games = [g for g in games if g['season'] == test_season]

    # Sort by week
    season_games.sort(key=lambda x: x['week'])

    predictions = []

    # Group by week
    weeks = sorted(set(g['week'] for g in season_games))
    print(f"Weeks: {weeks}")

    for week in weeks:
        week_games = [g for g in season_games if g['week'] == week]

        for game in week_games:
            # Only test on games with Vegas spreads
            if 'lines' not in game or not game['lines']:
                continue

            # Calculate team stats using only prior games
            home_stats = calculate_team_stats_historical(
                game['homeTeam']['name'], test_season, week, season_games
            )
            away_stats = calculate_team_stats_historical(
                game['awayTeam']['name'], test_season, week, season_games
            )

            # Extract features
            features = extract_features(game, home_stats, away_stats)

            # Make prediction
            X = pd.DataFrame([features])[feature_cols]
            pred_spread = float(model.predict(X)[0])

            # Store prediction
            predictions.append({
                'game_id': game['gameId'],
                'season': test_season,
                'week': week,
                'home_team': game['homeTeam']['name'],
                'away_team': game['awayTeam']['name'],
                'predicted_spread': pred_spread,
                'vegas_spread': game['lines']['spread'],
                'actual_spread': game['outcome']['actualSpread'],
                'home_score': game['outcome']['homeScore'],
                'away_score': game['outcome']['awayScore']
            })

    print(f"Generated {len(predictions)} predictions for {test_season}")

    return predictions

def calculate_ats_performance(predictions):
    """Calculate ATS metrics from predictions"""

    if not predictions:
        return None

    wins = 0
    losses = 0
    pushes = 0

    for pred in predictions:
        pred_spread = pred['predicted_spread']
        vegas_spread = pred['vegas_spread']
        actual_spread = pred['actual_spread']

        # Model pick vs reality
        model_takes_home = pred_spread > vegas_spread
        home_covered = actual_spread > vegas_spread

        # Check for push
        if abs(actual_spread - vegas_spread) < 0.5:
            pushes += 1
        elif model_takes_home == home_covered:
            wins += 1
        else:
            losses += 1

    total_bets = wins + losses
    win_rate = (wins / total_bets * 100) if total_bets > 0 else 0

    # ROI calculation
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

def main():
    print("="*70)
    print("HISTORICAL BACKTEST (2021-2024)")
    print("="*70)

    # Load model and data
    model, feature_cols = load_model_and_features()
    print(f"\n✅ Loaded model with {len(feature_cols)} features")

    games = load_historical_data()

    # Backtest each season
    all_results = {}
    all_predictions = []

    seasons = sorted(set(g['season'] for g in games))

    for season in seasons:
        preds = backtest_season(model, feature_cols, games, season)
        all_predictions.extend(preds)

        # Calculate ATS for this season
        perf = calculate_ats_performance(preds)
        if perf:
            all_results[season] = perf

            print(f"\n{season} Results:")
            print(f"  Record: {perf['wins']}-{perf['losses']}-{perf['pushes']}")
            print(f"  Win Rate: {perf['win_rate']:.1f}%")
            print(f"  ROI: {perf['roi']:+.1f}%")

    # Overall results
    print("\n" + "="*70)
    print("OVERALL BACKTEST RESULTS (2021-2024)")
    print("="*70)

    overall = calculate_ats_performance(all_predictions)

    if overall:
        print(f"\nTotal Record: {overall['wins']}-{overall['losses']}-{overall['pushes']}")
        print(f"Win Rate: {overall['win_rate']:.2f}%")
        print(f"ROI: {overall['roi']:+.2f}%")
        print(f"Profit per $110 unit: ${overall['profit']:+,.0f}")
        print(f"Breakeven: 52.38%")
        print(f"Edge: {overall['win_rate'] - 52.38:+.2f}%")

        # Statistical significance
        try:
            from scipy import stats
            if hasattr(stats, 'binomtest'):
                result = stats.binomtest(overall['wins'], overall['total_bets'], 0.5, alternative='greater')
                p_value = result.pvalue
            else:
                p_value = stats.binom_test(overall['wins'], overall['total_bets'], 0.5, alternative='greater')

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
            'seasons_tested': seasons,
            'total_predictions': len(all_predictions)
        },
        'by_season': all_results,
        'overall': overall,
        'predictions': all_predictions
    }

    with open('backtest_results_2021_2024.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n💾 Saved detailed results to backtest_results_2021_2024.json")
    print("="*70)

if __name__ == '__main__':
    main()
