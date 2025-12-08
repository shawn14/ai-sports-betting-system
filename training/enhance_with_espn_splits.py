#!/usr/bin/env python3
"""
Enhance training data with REAL home/away splits from ESPN API

This script:
1. Loads existing training data
2. For each team in each game, fetches ESPN team data
3. Extracts REAL home/away record splits
4. Updates the training data file
5. Re-runs model comparison
"""

import json
import requests
import time
from datetime import datetime

def fetch_team_splits(team_id, season, week):
    """
    Fetch home/away splits for a team at a specific point in the season

    Note: ESPN API doesn't give historical stats per week, so we'll use
    current season stats as proxy. For historical seasons, this is approximate.
    """
    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team_id}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        team_data = data.get('team', {})
        record_items = team_data.get('record', {}).get('items', [])

        # Find total, home, and road records
        total_record = None
        home_record = None
        road_record = None
        streak = 0

        for item in record_items:
            if item.get('type') == 'total':
                total_record = item
                # Extract streak
                for stat in item.get('stats', []):
                    if stat.get('name') == 'streak':
                        streak = stat.get('value', 0)
            elif item.get('type') == 'home':
                home_record = item
            elif item.get('type') == 'road':
                road_record = item

        # Extract win percentages
        home_win_pct = 0.5
        road_win_pct = 0.5

        if home_record:
            for stat in home_record.get('stats', []):
                if stat.get('name') == 'winPercent':
                    home_win_pct = stat.get('value', 0.5)

        if road_record:
            for stat in road_record.get('stats', []):
                if stat.get('name') == 'winPercent':
                    road_win_pct = stat.get('value', 0.5)

        return {
            'homeRecord': home_win_pct,
            'awayRecord': road_win_pct,
            'streak': int(streak)
        }

    except Exception as e:
        print(f"   ⚠️  Error fetching team {team_id}: {e}")
        return {
            'homeRecord': 0.5,
            'awayRecord': 0.5,
            'streak': 0
        }

def enhance_training_data():
    """Enhance training data with real ESPN splits"""

    print("=" * 70)
    print("🔧 ENHANCING TRAINING DATA WITH REAL ESPN SPLITS")
    print("=" * 70)

    # Load existing data
    print("\n📂 Loading existing training data...")
    with open('../public/training/nfl_training_data_with_vegas.json', 'r') as f:
        data = json.load(f)

    print(f"✅ Loaded {len(data['data'])} games")

    # Track unique teams to minimize API calls
    team_cache = {}

    print("\n🌐 Fetching current ESPN data for all teams...")
    print("   (This will take a minute - we're being respectful to ESPN's API)")

    # First, get current data for all unique teams
    unique_teams = set()
    for game in data['data']:
        unique_teams.add(game['homeTeam']['id'])
        unique_teams.add(game['awayTeam']['id'])

    print(f"\n📊 Found {len(unique_teams)} unique teams")

    for i, team_id in enumerate(unique_teams, 1):
        print(f"   Fetching {i}/{len(unique_teams)}: Team ID {team_id}...", end='', flush=True)
        team_cache[team_id] = fetch_team_splits(team_id, 2024, 1)
        print(" ✅")
        time.sleep(0.3)  # Be nice to ESPN's API

    print("\n🔄 Updating game data with real splits...")

    updated_count = 0
    for game in data['data']:
        home_id = game['homeTeam']['id']
        away_id = game['awayTeam']['id']

        if home_id in team_cache:
            game['homeTeam']['homeRecord'] = team_cache[home_id]['homeRecord']
            game['homeTeam']['awayRecord'] = team_cache[home_id]['awayRecord']
            game['homeTeam']['streak'] = team_cache[home_id]['streak']
            updated_count += 1

        if away_id in team_cache:
            game['awayTeam']['homeRecord'] = team_cache[away_id]['homeRecord']
            game['awayTeam']['awayRecord'] = team_cache[away_id]['awayRecord']
            game['awayTeam']['streak'] = team_cache[away_id]['streak']
            updated_count += 1

    print(f"✅ Updated {updated_count} team records")

    # Save enhanced data
    print("\n💾 Saving enhanced training data...")

    output_file = '../public/training/nfl_training_data_enhanced.json'
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✅ Saved to: {output_file}")

    # Show sample of updated data
    print("\n" + "=" * 70)
    print("📋 SAMPLE OF UPDATED DATA")
    print("=" * 70)

    for i, game in enumerate(data['data'][:5]):
        home = game['homeTeam']
        away = game['awayTeam']

        print(f"\n{i+1}. {away['name']} @ {home['name']}")
        print(f"   Home: Overall {home['winPct']:.3f}, At Home {home['homeRecord']:.3f}, Streak {home['streak']:+d}")
        print(f"   Away: Overall {away['winPct']:.3f}, On Road {away['awayRecord']:.3f}, Streak {away['streak']:+d}")

    print("\n" + "=" * 70)
    print("✅ DATA ENHANCEMENT COMPLETE")
    print("=" * 70)
    print(f"\nNext step: Run the model comparison again with real data")
    print(f"Command: python3 add_home_away_features.py --use-enhanced\n")

if __name__ == '__main__':
    enhance_training_data()
