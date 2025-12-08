#!/usr/bin/env python3
"""
Convert 2025 season predictions to training data format
so it can be enriched with Vegas odds
"""

import json
import requests
from datetime import datetime

def fetch_espn_game_details(game_id):
    """Fetch detailed game info from ESPN API"""
    url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary"
    params = {"event": game_id}

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Extract game time
        game_time = data.get('header', {}).get('competitions', [{}])[0].get('date')

        return {
            'gameTime': game_time
        }
    except Exception as e:
        print(f"  Error fetching game {game_id}: {e}")
        return None

def convert_prediction_to_training_format(pred, game_details=None):
    """Convert prediction format to training data format"""

    # Calculate actual outcome
    home_score = pred.get('actual_home_score', 0) or 0
    away_score = pred.get('actual_away_score', 0) or 0

    # Basic game structure
    game = {
        "gameId": pred['game_id'],
        "season": 2025,
        "week": pred['week'],
        "homeTeam": {
            "id": "",  # Will be filled from ESPN if available
            "name": pred['home_team'],
            "winPct": 0.5,  # Placeholder
            "ppg": 22.0,
            "pag": 22.0,
            "yardsPerGame": 350.0,
            "yardsAllowedPerGame": 350.0,
            "turnoverDiff": 0,
            "homeRecord": 0.5,
            "awayRecord": 0.5,
            "last3Games": {
                "pointsScored": [],
                "pointsAllowed": [],
                "margins": []
            },
            "restDays": 7,
            "streak": 0
        },
        "awayTeam": {
            "id": "",
            "name": pred['away_team'],
            "winPct": 0.5,
            "ppg": 22.0,
            "pag": 22.0,
            "yardsPerGame": 350.0,
            "yardsAllowedPerGame": 350.0,
            "turnoverDiff": 0,
            "homeRecord": 0.5,
            "awayRecord": 0.5,
            "last3Games": {
                "pointsScored": [],
                "pointsAllowed": [],
                "margins": []
            },
            "restDays": 7,
            "streak": 0
        },
        "matchup": {
            "isDivisional": False,
            "isConference": True,
            "restDaysDiff": 0,
            "isThursdayNight": False,
            "isMondayNight": False,
            "isSundayNight": False
        },
        "weather": {
            "temperature": 65,
            "windSpeed": 5,
            "precipitation": 0,
            "isDome": False
        },
        "outcome": {
            "homeScore": home_score,
            "awayScore": away_score,
            "actualSpread": home_score - away_score,
            "actualTotal": home_score + away_score,
            "homeWon": home_score > away_score
        }
    }

    # Add game time if available from details
    if game_details and game_details.get('gameTime'):
        game['gameTime'] = game_details['gameTime']

    # Add placeholder for lines (will be filled by enrichment script)
    # Don't add lines here - let enrich_with_odds.py add them

    return game

def main():
    print("="*70)
    print("🔄 CONVERTING 2025 PREDICTIONS TO TRAINING FORMAT")
    print("="*70)

    # Load 2025 predictions
    print("\n📂 Loading 2025 predictions...")
    with open('2025_season_predictions.json', 'r') as f:
        data = json.load(f)

    predictions = data['predictions']
    print(f"✅ Loaded {len(predictions)} predictions")

    # Filter to completed games only
    completed = [p for p in predictions if p.get('completed', False)]
    print(f"✅ {len(completed)} completed games")

    # Convert to training format
    print("\n🔄 Converting to training format and fetching game times...")
    training_games = []

    for i, pred in enumerate(completed):
        if (i + 1) % 50 == 0:
            print(f"  Processed {i+1}/{len(completed)} games...")

        # Fetch game details to get exact game time
        game_details = fetch_espn_game_details(pred['game_id'])

        game = convert_prediction_to_training_format(pred, game_details)
        training_games.append(game)

    # Create training dataset structure
    dataset = {
        "metadata": {
            "collectionDate": datetime.now().isoformat() + "Z",
            "seasons": [2025],
            "totalGames": len(training_games),
            "features": [
                "home_win_pct",
                "home_ppg",
                "home_pag",
                "home_yards_pg",
                "home_yards_allowed_pg",
                "home_turnover_diff",
                "away_win_pct",
                "away_ppg",
                "away_pag",
                "away_yards_pg",
                "away_yards_allowed_pg",
                "away_turnover_diff",
                "home_last3_ppf",
                "home_last3_ppa",
                "away_last3_ppf",
                "away_last3_ppa",
                "home_rest_days",
                "away_rest_days",
                "rest_days_diff",
                "is_divisional",
                "is_conference",
                "is_thursday_night",
                "is_monday_night",
                "is_sunday_night",
                "temperature",
                "wind_speed",
                "precipitation",
                "is_dome"
            ],
            "version": "1.0.0"
        },
        "data": training_games
    }

    # Save to file
    output_file = 'nfl_training_data_2025_base.json'
    with open(output_file, 'w') as f:
        json.dump(dataset, f, indent=2)

    print(f"\n✅ Saved {len(training_games)} games to {output_file}")
    print("\n" + "="*70)
    print("📌 NEXT STEP:")
    print("="*70)
    print("\nRun the odds enrichment script:")
    print(f"  python3 enrich_with_odds.py \\")
    print(f"    --input {output_file} \\")
    print(f"    --output nfl_training_data_2025_with_vegas.json \\")
    print(f"    --cache odds_cache_2025.json")
    print("\n" + "="*70)

if __name__ == '__main__':
    main()
