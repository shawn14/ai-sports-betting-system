#!/usr/bin/env python3
"""
Calculate TRUE historical home/away splits and streaks from game data

This script processes all historical games and calculates accurate point-in-time:
- Home win percentage (games at home only)
- Road win percentage (games on road only)
- Current streak (consecutive wins/losses)

Maintains temporal integrity - never uses future data.
"""

import json
from datetime import datetime
from collections import defaultdict

def calculate_splits_and_streaks(all_games):
    """
    Calculate home/away splits and streaks for each team at each point in time

    Returns: Dictionary mapping (team_id, game_date) -> {homeWinPct, roadWinPct, streak}
    """

    print("=" * 70)
    print("🔧 CALCULATING TRUE HISTORICAL HOME/AWAY SPLITS")
    print("=" * 70)

    # Sort games by date to process chronologically
    sorted_games = sorted(all_games, key=lambda g: g.get('date', g.get('gameTime', '')))

    print(f"\n📊 Processing {len(sorted_games)} games chronologically...")

    # Track team records over time
    team_history = defaultdict(lambda: {
        'home_wins': 0,
        'home_losses': 0,
        'road_wins': 0,
        'road_losses': 0,
        'streak': 0,  # positive = wins, negative = losses
        'last_result': None
    })

    # Store calculated splits for each game
    game_splits = {}

    for i, game in enumerate(sorted_games):
        game_id = game['gameId']
        home_team_id = game['homeTeam']['id']
        away_team_id = game['awayTeam']['id']

        # Get current splits BEFORE this game
        home_team = team_history[home_team_id]
        away_team = team_history[away_team_id]

        # Calculate win percentages (before this game)
        home_total_home_games = home_team['home_wins'] + home_team['home_losses']
        home_win_pct_at_home = home_team['home_wins'] / home_total_home_games if home_total_home_games > 0 else 0.5

        away_total_road_games = away_team['road_wins'] + away_team['road_losses']
        away_win_pct_on_road = away_team['road_wins'] / away_total_road_games if away_total_road_games > 0 else 0.5

        # Store splits for this game
        game_splits[game_id] = {
            'homeTeam': {
                'homeWinPct': home_win_pct_at_home,
                'roadWinPct': (home_team['road_wins'] / (home_team['road_wins'] + home_team['road_losses'])) if (home_team['road_wins'] + home_team['road_losses']) > 0 else 0.5,
                'streak': home_team['streak']
            },
            'awayTeam': {
                'homeWinPct': (away_team['home_wins'] / (away_team['home_wins'] + away_team['home_losses'])) if (away_team['home_wins'] + away_team['home_losses']) > 0 else 0.5,
                'roadWinPct': away_win_pct_on_road,
                'streak': away_team['streak']
            }
        }

        # Update team history AFTER recording splits
        outcome = game['outcome']
        home_won = outcome['homeScore'] > outcome['awayScore']

        # Update home team
        if home_won:
            home_team['home_wins'] += 1
            if home_team['last_result'] == 'W':
                home_team['streak'] += 1
            else:
                home_team['streak'] = 1
            home_team['last_result'] = 'W'
        else:
            home_team['home_losses'] += 1
            if home_team['last_result'] == 'L':
                home_team['streak'] -= 1
            else:
                home_team['streak'] = -1
            home_team['last_result'] = 'L'

        # Update away team
        if not home_won:
            away_team['road_wins'] += 1
            if away_team['last_result'] == 'W':
                away_team['streak'] += 1
            else:
                away_team['streak'] = 1
            away_team['last_result'] = 'W'
        else:
            away_team['road_losses'] += 1
            if away_team['last_result'] == 'L':
                away_team['streak'] -= 1
            else:
                away_team['streak'] = -1
            away_team['last_result'] = 'L'

        if (i + 1) % 100 == 0:
            print(f"   Processed {i + 1}/{len(sorted_games)} games...")

    print(f"✅ Calculated splits for all {len(sorted_games)} games")

    return game_splits

def apply_splits_to_data(data, game_splits):
    """Apply calculated splits to training data"""

    print("\n🔄 Applying calculated splits to training data...")

    updated = 0
    missing = 0

    for game in data['data']:
        game_id = game['gameId']

        if game_id in game_splits:
            splits = game_splits[game_id]

            # Update home team
            game['homeTeam']['homeRecord'] = splits['homeTeam']['homeWinPct']
            game['homeTeam']['awayRecord'] = splits['homeTeam']['roadWinPct']
            game['homeTeam']['streak'] = splits['homeTeam']['streak']

            # Update away team
            game['awayTeam']['homeRecord'] = splits['awayTeam']['homeWinPct']
            game['awayTeam']['awayRecord'] = splits['awayTeam']['roadWinPct']
            game['awayTeam']['streak'] = splits['awayTeam']['streak']

            updated += 1
        else:
            missing += 1

    print(f"✅ Updated {updated} games")
    if missing > 0:
        print(f"⚠️  {missing} games had no split data (likely edge cases)")

    return data

def show_sample_splits(data, game_splits):
    """Show samples of the calculated splits"""

    print("\n" + "=" * 70)
    print("📋 SAMPLE OF CALCULATED SPLITS")
    print("=" * 70)

    # Show a few games with interesting splits
    samples = 0
    for game in data['data']:
        if samples >= 10:
            break

        game_id = game['gameId']
        if game_id not in game_splits:
            continue

        home = game['homeTeam']
        away = game['awayTeam']

        # Only show if there's actual variance (not default 0.5)
        if home['homeRecord'] != 0.5 or away['awayRecord'] != 0.5:
            print(f"\n{away['name']} @ {home['name']} (Week {game['week']}, {game['season']})")
            print(f"   Home Team: Overall {home['winPct']:.1%}, At Home {home['homeRecord']:.1%}, Streak {home['streak']:+d}")
            print(f"   Away Team: Overall {away['winPct']:.1%}, On Road {away['awayRecord']:.1%}, Streak {away['streak']:+d}")
            print(f"   Outcome: {game['outcome']['homeScore']}-{game['outcome']['awayScore']}")
            samples += 1

def validate_splits(data):
    """Validate that splits look reasonable"""

    print("\n" + "=" * 70)
    print("🔍 VALIDATION CHECK")
    print("=" * 70)

    home_diffs = []
    away_diffs = []
    streaks = []

    for game in data['data']:
        home = game['homeTeam']
        away = game['awayTeam']

        # Calculate how different home/road records are from overall
        if home['homeRecord'] != 0.5:
            home_diff = abs(home['homeRecord'] - home['winPct'])
            home_diffs.append(home_diff)

        if away['awayRecord'] != 0.5:
            away_diff = abs(away['awayRecord'] - away['winPct'])
            away_diffs.append(away_diff)

        streaks.append(abs(home.get('streak', 0)))
        streaks.append(abs(away.get('streak', 0)))

    print(f"\n📊 Home/Away Split Statistics:")
    print(f"   Average difference (home record vs overall): {sum(home_diffs)/len(home_diffs):.1%}" if home_diffs else "   No home diffs")
    print(f"   Average difference (road record vs overall): {sum(away_diffs)/len(away_diffs):.1%}" if away_diffs else "   No away diffs")
    print(f"   Max streak observed: {max(streaks)}" if streaks else "   No streaks")
    print(f"   Average streak magnitude: {sum(streaks)/len(streaks):.1f}" if streaks else "   No streaks")

    # Count how many games have meaningful splits
    meaningful = sum(1 for g in data['data'] if g['homeTeam']['homeRecord'] != 0.5 or g['awayTeam']['awayRecord'] != 0.5)
    print(f"\n✅ {meaningful}/{len(data['data'])} games ({meaningful/len(data['data']):.1%}) have non-default split data")

def main():
    """Main execution"""

    # Load data
    print("📂 Loading training data...")
    with open('../public/training/nfl_training_data_with_vegas.json', 'r') as f:
        data = json.load(f)

    print(f"✅ Loaded {len(data['data'])} games")

    # Calculate splits
    game_splits = calculate_splits_and_streaks(data['data'])

    # Apply to data
    data = apply_splits_to_data(data, game_splits)

    # Show samples
    show_sample_splits(data, game_splits)

    # Validate
    validate_splits(data)

    # Save enhanced data
    print("\n" + "=" * 70)
    print("💾 SAVING ENHANCED DATA")
    print("=" * 70)

    output_file = '../public/training/nfl_training_data_with_true_splits.json'
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n✅ Saved enhanced data to:")
    print(f"   {output_file}")

    print("\n" + "=" * 70)
    print("🎯 NEXT STEP")
    print("=" * 70)
    print("\nRun model comparison to test if splits improve predictions:")
    print("   python3 test_true_splits.py")
    print()

if __name__ == '__main__':
    main()
