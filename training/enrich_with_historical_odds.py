#!/usr/bin/env python3
"""
Simplified Historical Odds Enrichment
Uses the /historical/odds endpoint directly (paid API required)
"""

import json
import requests
import time
from datetime import datetime, timedelta
import numpy as np

API_KEY = '6501c357d0e15af57c63948347e2ea5f'
BASE_URL = 'https://api.the-odds-api.com/v4'

def fetch_week_odds(week_date):
    """
    Fetch all NFL odds for a specific date
    Uses /historical/odds endpoint
    """
    url = f"{BASE_URL}/historical/sports/americanfootball_nfl/odds"
    params = {
        'apiKey': API_KEY,
        'regions': 'us',
        'markets': 'spreads,totals',
        'date': week_date,
        'oddsFormat': 'american'
    }

    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()
        return data.get('data', [])
    except Exception as e:
        print(f"    Error fetching odds: {e}")
        return []


def match_game_to_odds(game, odds_games):
    """Match ESPN game to Odds API game by team names"""
    home_team = game['homeTeam']['name']
    away_team = game['awayTeam']['name']

    for odds_game in odds_games:
        if (odds_game['home_team'] == home_team and
            odds_game['away_team'] == away_team):
            return odds_game

    return None


def extract_consensus_spread(odds_game):
    """Extract median spread from all bookmakers"""
    spreads = []
    totals = []

    home_team = odds_game['home_team']

    for bookmaker in odds_game.get('bookmakers', []):
        for market in bookmaker.get('markets', []):
            if market['key'] == 'spreads':
                for outcome in market.get('outcomes', []):
                    if outcome['name'] == home_team:
                        spreads.append(outcome.get('point', 0))
            elif market['key'] == 'totals':
                outcomes = market.get('outcomes', [])
                if outcomes:
                    totals.append(outcomes[0].get('point', 0))

    if not spreads or not totals:
        return None

    return {
        'spread': float(np.median(spreads)),
        'total': float(np.median(totals))
    }


def enrich_games_with_odds(games):
    """Enrich all games with historical odds"""

    # Group games by week
    weeks = {}
    for game in games:
        week = game['week']
        if week not in weeks:
            weeks[week] = []
        weeks[week].append(game)

    successful = 0
    failed = 0

    for week_num in sorted(weeks.keys()):
        week_games = weeks[week_num]
        print(f"\n📅 Week {week_num} ({len(week_games)} games)...")

        # Get a sample game from this week to find the date
        sample_game = week_games[0]
        game_time = sample_game.get('gameTime', '')

        if not game_time:
            print(f"  ⚠️  No game time available, skipping week")
            failed += len(week_games)
            continue

        # Parse game time and get closing odds (1 hour before kickoff)
        try:
            dt = datetime.fromisoformat(game_time.replace('Z', '+00:00'))
            closing_time = (dt - timedelta(hours=1)).isoformat().replace('+00:00', 'Z')
        except:
            print(f"  ⚠️  Could not parse game time: {game_time}")
            failed += len(week_games)
            continue

        print(f"  Fetching odds for {closing_time}...")

        # Fetch odds for this week
        odds_games = fetch_week_odds(closing_time)
        print(f"  Found {len(odds_games)} games with odds")

        # Match and enrich each game
        for game in week_games:
            home = game['homeTeam']['name']
            away = game['awayTeam']['name']

            odds_game = match_game_to_odds(game, odds_games)

            if odds_game:
                lines = extract_consensus_spread(odds_game)
                if lines:
                    game['lines'] = lines
                    print(f"  ✅ {away} @ {home}: {lines['spread']:+.1f}, O/U {lines['total']:.1f}")
                    successful += 1
                else:
                    print(f"  ⚠️  {away} @ {home}: Found but no valid lines")
                    failed += 1
            else:
                print(f"  ❌ {away} @ {home}: No match")
                failed += 1

        # Rate limiting
        time.sleep(1.5)

    return successful, failed


def main():
    print("="*70)
    print("🎲 HISTORICAL ODDS ENRICHMENT (Simplified)")
    print("="*70)

    # Load base data
    print("\n📂 Loading 2025 base data...")
    with open('nfl_training_data_2025_base.json', 'r') as f:
        dataset = json.load(f)

    games = dataset['data']
    print(f"✅ Loaded {len(games)} games")

    # Enrich with odds
    print("\n🔄 Starting enrichment...")
    successful, failed = enrich_games_with_odds(games)

    # Save
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


if __name__ == '__main__':
    main()
