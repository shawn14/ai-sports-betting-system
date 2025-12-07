#!/usr/bin/env python3
"""
Scrape historical Vegas spreads for 2025 season from ESPN API
ESPN includes odds data in their game summary endpoint
"""

import json
import requests
import time
import re
from datetime import datetime

def fetch_game_odds_from_espn(game_id):
    """
    Fetch odds for a specific game from ESPN API
    ESPN includes Vegas lines in the game summary
    """
    url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary"
    params = {"event": game_id}

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Extract odds from pickcenter
        pick_center = data.get('pickcenter', [])
        if not pick_center or len(pick_center) == 0:
            return None

        # Get the first provider (usually consensus)
        provider = pick_center[0]
        details = provider.get('details', '')

        # Parse spread from details string like "KC -3.5"
        # Format is usually "TEAM +/-X.X"
        match = re.search(r'([-+]?\d+\.?\d*)', details)
        if not match:
            return None

        spread = float(match.group(1))

        # Extract over/under if available
        over_under = provider.get('overUnder')
        total = float(over_under) if over_under else None

        # Determine which team the spread is for
        spread_team = provider.get('spread', {}).get('team', {}).get('displayName', '')

        # Get home team name
        home_team = data.get('header', {}).get('competitions', [{}])[0].get('competitors', [])
        home_team_name = None
        for team in home_team:
            if team.get('homeAway') == 'home':
                home_team_name = team.get('team', {}).get('displayName')
                break

        # Adjust spread sign based on which team
        if home_team_name and spread_team:
            if spread_team != home_team_name:
                spread = -spread

        return {
            'spread': spread,
            'total': total,
            'source': 'ESPN'
        }

    except Exception as e:
        print(f"    Error fetching odds for game {game_id}: {e}")
        return None


def enrich_game_with_espn_odds(game, progress_msg=""):
    """Add ESPN odds to a game"""
    game_id = game['gameId']

    odds = fetch_game_odds_from_espn(game_id)

    if odds:
        game['lines'] = {
            'spread': odds['spread'],
            'total': odds['total'],
        }
        print(f"  ✅ {progress_msg}: {odds['spread']:+.1f}, {odds['total']:.1f if odds['total'] else 'N/A'}")
        return True
    else:
        print(f"  ❌ {progress_msg}: No odds available")
        return False


def main():
    print("="*70)
    print("🎲 ESPN ODDS SCRAPER FOR 2025 SEASON")
    print("="*70)

    # Load base training data
    print("\n📂 Loading 2025 base training data...")
    with open('nfl_training_data_2025_base.json', 'r') as f:
        dataset = json.load(f)

    games = dataset['data']
    print(f"✅ Loaded {len(games)} games")

    # Enrich with ESPN odds
    print("\n🔄 Fetching odds from ESPN...")
    successful = 0
    failed = 0

    # Group by week
    weeks = {}
    for game in games:
        week = game['week']
        if week not in weeks:
            weeks[week] = []
        weeks[week].append(game)

    for week_num in sorted(weeks.keys()):
        week_games = weeks[week_num]
        print(f"\n📅 Week {week_num} ({len(week_games)} games):")

        for game in week_games:
            home = game['homeTeam']['name']
            away = game['awayTeam']['name']
            progress = f"{away} @ {home}"

            if enrich_game_with_espn_odds(game, progress):
                successful += 1
            else:
                failed += 1

            # Rate limiting
            time.sleep(0.5)

    # Save enriched data
    output_file = 'nfl_training_data_2025_with_vegas.json'
    with open(output_file, 'w') as f:
        json.dump(dataset, f, indent=2)

    # Summary
    print("\n" + "="*70)
    print("📊 ENRICHMENT SUMMARY")
    print("="*70)
    print(f"\nTotal Games:           {len(games)}")
    print(f"Successfully Enriched: {successful} ({successful/len(games)*100:.1f}%)")
    print(f"Failed/Missing:        {failed} ({failed/len(games)*100:.1f}%)")
    print(f"\n💾 Saved to: {output_file}")
    print("\n" + "="*70)

    if successful > 0:
        print("\n✅ SUCCESS! You can now:")
        print("   1. Review the enriched data")
        print("   2. Update analytics page to use this file")
        print("   3. Calculate true ATS performance")
    else:
        print("\n⚠️  WARNING: No odds were found")
        print("   ESPN may not have historical odds for these games")


if __name__ == '__main__':
    main()
