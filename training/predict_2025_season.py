#!/usr/bin/env python3
"""
Generate predictions for all 2025 NFL games week-by-week
Then compare to actual results to calculate real performance

This simulates making predictions BEFORE each week's games,
then checking results after - exactly how we'd use the model in production.
"""

import json
import pickle
import requests
import pandas as pd
import numpy as np
from datetime import datetime
import sys

# Load the trained model
MODEL_PATH = 'spread_model_20251206_211858.pkl'
FEATURES_PATH = 'feature_columns_20251206_211858.json'

def fetch_2025_games():
    """Fetch all 2025 NFL games from ESPN API week-by-week"""
    print("Fetching 2025 NFL season data from ESPN...")

    all_games = []

    # Fetch weeks 1-18 (regular season)
    for week in range(1, 19):
        url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
        params = {
            "seasontype": 2,  # Regular season
            "week": week,
            "year": 2025
        }

        try:
            response = requests.get(url, params=params)
            data = response.json()

            week_games = 0
            for event in data.get('events', []):
                competition = event['competitions'][0]
                competitors = competition['competitors']

                home_team = next((c for c in competitors if c['homeAway'] == 'home'), None)
                away_team = next((c for c in competitors if c['homeAway'] == 'away'), None)

                if not home_team or not away_team:
                    continue

                # Extract Vegas spread from odds if available
                vegas_spread = None
                odds = competition.get('odds', [])
                if odds and len(odds) > 0:
                    # Spread is typically in the details field like "KC -3.5"
                    details = odds[0].get('details', '')
                    if details:
                        # Parse spread from details
                        import re
                        match = re.search(r'([-+]?\d+\.?\d*)', details)
                        if match:
                            vegas_spread = float(match.group(1))

                game = {
                    'id': event['id'],
                    'week': week,
                    'season': 2025,
                    'status': competition['status']['type']['name'],
                    'completed': competition['status']['type']['completed'],
                    'homeTeam': {
                        'name': home_team['team']['displayName'],
                        'abbreviation': home_team['team']['abbreviation'],
                        'score': int(home_team.get('score', 0)) if home_team.get('score') else None,
                    },
                    'awayTeam': {
                        'name': away_team['team']['displayName'],
                        'abbreviation': away_team['team']['abbreviation'],
                        'score': int(away_team.get('score', 0)) if away_team.get('score') else None,
                    },
                    'vegas_spread': vegas_spread
                }

                all_games.append(game)
                week_games += 1

            if week_games > 0:
                print(f"  Week {week}: {week_games} games")
        except Exception as e:
            print(f"  Week {week}: Error fetching ({e})")
            continue

    print(f"✅ Found {len(all_games)} total 2025 NFL games")
    return all_games

def load_model():
    """Load the trained XGBoost model"""
    print(f"Loading model from {MODEL_PATH}...")

    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)

    with open(FEATURES_PATH, 'r') as f:
        feature_data = json.load(f)
        features = feature_data['features']

    print(f"✅ Model loaded with {len(features)} features")
    return model, features

def fetch_team_stats(team_abbr, season, week, all_games):
    """
    Calculate team statistics up to a specific week
    This simulates what we'd know BEFORE making predictions

    Only uses games BEFORE the target week to avoid data leakage
    """
    # Find all games this team played before this week
    team_games = [
        g for g in all_games
        if g['week'] < week and g['completed'] and
        (g['homeTeam']['abbreviation'] == team_abbr or g['awayTeam']['abbreviation'] == team_abbr)
    ]

    # If no games played yet (week 1), return defaults
    if not team_games:
        return {
            'winPct': 0.5,
            'ppg': 22.0,
            'pag': 22.0,
            'yardsPerGame': 350.0,
            'yardsAllowedPerGame': 350.0,
            'turnoverDiff': 0,
            'restDays': 7,
            'last3Games': {
                'pointsScored': [22, 22, 22],
                'pointsAllowed': [22, 22, 22]
            }
        }

    # Calculate basic stats
    wins = 0
    total_points_for = 0
    total_points_against = 0
    points_scored_list = []
    points_allowed_list = []

    for game in team_games:
        is_home = game['homeTeam']['abbreviation'] == team_abbr

        if is_home:
            team_score = game['homeTeam']['score']
            opp_score = game['awayTeam']['score']
        else:
            team_score = game['awayTeam']['score']
            opp_score = game['homeTeam']['score']

        # Track scores
        points_scored_list.append(team_score)
        points_allowed_list.append(opp_score)
        total_points_for += team_score
        total_points_against += opp_score

        # Count wins
        if team_score > opp_score:
            wins += 1

    # Calculate stats
    games_played = len(team_games)
    win_pct = wins / games_played if games_played > 0 else 0.5
    ppg = total_points_for / games_played if games_played > 0 else 22.0
    pag = total_points_against / games_played if games_played > 0 else 22.0

    # Last 3 games (or fewer if not available)
    last3_scores = points_scored_list[-3:] if len(points_scored_list) >= 3 else points_scored_list
    last3_allowed = points_allowed_list[-3:] if len(points_allowed_list) >= 3 else points_allowed_list

    # Pad with averages if less than 3 games
    while len(last3_scores) < 3:
        last3_scores.append(ppg)
    while len(last3_allowed) < 3:
        last3_allowed.append(pag)

    return {
        'winPct': win_pct,
        'ppg': ppg,
        'pag': pag,
        'yardsPerGame': 350.0,  # Still using default - would need detailed play data
        'yardsAllowedPerGame': 350.0,  # Still using default
        'turnoverDiff': 0,  # Still using default
        'restDays': 7,  # Would need game dates to calculate
        'last3Games': {
            'pointsScored': last3_scores,
            'pointsAllowed': last3_allowed
        }
    }

def extract_features_from_game(game, home_stats, away_stats):
    """Extract features for prediction (same format as training)"""

    home_last3 = home_stats.get('last3Games', {})
    away_last3 = away_stats.get('last3Games', {})

    home_last3_pf = np.mean(home_last3.get('pointsScored', [22]))
    home_last3_pa = np.mean(home_last3.get('pointsAllowed', [22]))
    away_last3_pf = np.mean(away_last3.get('pointsScored', [22]))
    away_last3_pa = np.mean(away_last3.get('pointsAllowed', [22]))

    features = {
        # Home team
        'home_winPct': home_stats.get('winPct', 0.5),
        'home_ppg': home_stats.get('ppg', 22.0),
        'home_pag': home_stats.get('pag', 22.0),
        'home_yards_pg': home_stats.get('yardsPerGame', 350.0),
        'home_yards_allowed_pg': home_stats.get('yardsAllowedPerGame', 350.0),
        'home_turnover_diff': home_stats.get('turnoverDiff', 0),

        # Away team
        'away_winPct': away_stats.get('winPct', 0.5),
        'away_ppg': away_stats.get('ppg', 22.0),
        'away_pag': away_stats.get('pag', 22.0),
        'away_yards_pg': away_stats.get('yardsPerGame', 350.0),
        'away_yards_allowed_pg': away_stats.get('yardsAllowedPerGame', 350.0),
        'away_turnover_diff': away_stats.get('turnoverDiff', 0),

        # Last 3 games
        'home_last3_ppf': home_last3_pf,
        'home_last3_ppa': home_last3_pa,
        'away_last3_ppf': away_last3_pf,
        'away_last3_ppa': away_last3_pa,

        # Rest days
        'home_rest_days': home_stats.get('restDays', 7),
        'away_rest_days': away_stats.get('restDays', 7),
        'rest_days_diff': 0,

        # Derived features
        'ppg_differential': home_stats['ppg'] - away_stats['ppg'],
        'pag_differential': away_stats['pag'] - home_stats['pag'],
        'winPct_differential': home_stats['winPct'] - away_stats['winPct'],
        'yards_differential': home_stats['yardsPerGame'] - away_stats['yardsPerGame'],
        'turnover_differential': home_stats['turnoverDiff'] - away_stats['turnoverDiff'],

        # Matchup features (default values)
        'is_divisional': 0,
        'is_conference': 1,
        'is_thursday_night': 0,
        'is_monday_night': 0,
        'is_sunday_night': 0,

        # Weather (default values)
        'temperature': 65,
        'wind_speed': 5,
        'precipitation': 0,
        'is_dome': 0,
    }

    return features

def predict_week(model, feature_cols, games, week_num):
    """
    Make predictions for all games in a specific week
    Returns predictions WITHOUT looking at actual outcomes
    """
    week_games = [g for g in games if g['week'] == week_num]

    if not week_games:
        return []

    print(f"\n📅 Week {week_num}: {len(week_games)} games")

    predictions = []

    for game in week_games:
        # Fetch team stats up to (but not including) this week
        home_stats = fetch_team_stats(game['homeTeam']['abbreviation'], 2025, week_num, games)
        away_stats = fetch_team_stats(game['awayTeam']['abbreviation'], 2025, week_num, games)

        # Extract features
        features = extract_features_from_game(game, home_stats, away_stats)

        # Create feature vector in correct order
        X = pd.DataFrame([features])[feature_cols]

        # Make prediction
        predicted_spread = float(model.predict(X)[0])

        prediction = {
            'game_id': game['id'],
            'week': week_num,
            'home_team': game['homeTeam']['name'],
            'away_team': game['awayTeam']['name'],
            'predicted_spread': predicted_spread,
            'vegas_spread': game.get('vegas_spread'),
            'predicted_winner': 'home' if predicted_spread > 0 else 'away',
            'actual_home_score': game['homeTeam']['score'],
            'actual_away_score': game['awayTeam']['score'],
            'actual_spread': (game['homeTeam']['score'] - game['awayTeam']['score']) if game['completed'] else None,
            'actual_winner': 'home' if (game['homeTeam']['score'] or 0) > (game['awayTeam']['score'] or 0) else 'away' if game['completed'] else None,
            'completed': game['completed']
        }

        predictions.append(prediction)

        status = "✅ FINAL" if game['completed'] else "⏳ UPCOMING"
        print(f"  {status} {game['awayTeam']['abbreviation']} @ {game['homeTeam']['abbreviation']}: Pred {predicted_spread:+.1f}")

    return predictions

def calculate_performance(all_predictions):
    """Calculate performance metrics from all predictions"""
    completed = [p for p in all_predictions if p['completed']]

    if not completed:
        return {
            'total_predictions': len(all_predictions),
            'completed_games': 0,
            'winner_accuracy': 0.0,
            'correct': 0,
            'incorrect': 0,
            'avg_spread_error': 0.0
        }

    correct_winners = sum(1 for p in completed if p['predicted_winner'] == p['actual_winner'])

    spread_errors = [abs(p['predicted_spread'] - p['actual_spread']) for p in completed if p['actual_spread'] is not None]
    avg_error = np.mean(spread_errors) if spread_errors else 0

    return {
        'total_predictions': len(all_predictions),
        'completed_games': len(completed),
        'winner_accuracy': (correct_winners / len(completed) * 100) if completed else 0,
        'correct': correct_winners,
        'incorrect': len(completed) - correct_winners,
        'avg_spread_error': avg_error
    }

def main():
    """Main prediction workflow"""
    print("=" * 60)
    print("2025 NFL SEASON PREDICTIONS")
    print("=" * 60)

    # Load model
    model, feature_cols = load_model()

    # Fetch all 2025 games
    games = fetch_2025_games()

    # Get unique weeks
    weeks = sorted(set(g['week'] for g in games if g['week'] > 0))
    print(f"\nProcessing weeks: {weeks}")

    # Predict week by week
    all_predictions = []

    for week in weeks:
        week_preds = predict_week(model, feature_cols, games, week)
        all_predictions.extend(week_preds)

    # Calculate performance
    print("\n" + "=" * 60)
    print("PERFORMANCE SUMMARY")
    print("=" * 60)

    perf = calculate_performance(all_predictions)

    print(f"\nTotal Predictions: {perf['total_predictions']}")
    print(f"Completed Games: {perf['completed_games']}")
    print(f"Winner Accuracy: {perf['winner_accuracy']:.1f}%")
    print(f"Record: {perf['correct']}-{perf['incorrect']}")
    print(f"Avg Spread Error: ±{perf['avg_spread_error']:.1f} points")

    # Save results
    output = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'model': MODEL_PATH,
            'season': 2025,
            'total_predictions': perf['total_predictions'],
            'completed_games': perf['completed_games']
        },
        'performance': perf,
        'predictions': all_predictions
    }

    output_file = '2025_season_predictions.json'
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n✅ Results saved to {output_file}")
    print("=" * 60)

if __name__ == '__main__':
    main()
