#!/usr/bin/env python3
"""
Historical Odds Enrichment Script
Fetches historical Vegas lines from The Odds API and enriches training data
"""

import json
import os
import sys
import time
import requests
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from odds_config import (
    ODDS_API_CONFIG,
    PRIORITY_BOOKMAKERS,
    LINE_STRATEGY,
    TEAM_ALIAS_MAP,
    WEEK_START_DATES,
)


class TeamNameMapper:
    """Maps between different team name formats"""

    def __init__(self):
        self.alias_map = TEAM_ALIAS_MAP

    def normalize_team_name(self, name: str) -> str:
        """Normalize team name for matching"""
        # Remove common suffixes, trim whitespace
        normalized = name.strip().lower()
        # Remove city/region prefixes for better matching
        for word in ['new', 'los', 'san', 'tampa', 'green', 'kansas']:
            if normalized.startswith(word):
                break
        return normalized

    def teams_match(self, team1: str, team2: str) -> bool:
        """Check if two team names refer to same team"""
        # Check exact match
        if self.normalize_team_name(team1) == self.normalize_team_name(team2):
            return True

        # Check if team names are in the same alias group
        for canonical, aliases in self.alias_map.items():
            all_names = [canonical] + aliases
            if team1 in all_names and team2 in all_names:
                return True

        # Partial match on key words (last resort)
        t1_words = set(team1.lower().split())
        t2_words = set(team2.lower().split())

        # If they share a unique team name (not a city), it's a match
        common_words = t1_words & t2_words
        # Filter out common words like "football", "team", cities
        common_words = {w for w in common_words if w not in ['football', 'team', 'new', 'los', 'san']}

        if common_words:
            return True

        return False


class OddsAPIClient:
    """Client for The Odds API with rate limiting and caching"""

    def __init__(self):
        self.base_url = ODDS_API_CONFIG['base_url']
        self.api_key = ODDS_API_CONFIG['api_key']
        self.session = requests.Session()
        self.request_count = 0
        self.cache = {}  # Week-based cache

    def get_historical_events(self, date: str) -> List[Dict]:
        """
        Get NFL events for a specific date

        Endpoint: GET /sports/americanfootball_nfl/events
        Params: apiKey, date (ISO 8601)

        Returns list of events with id, home_team, away_team, commence_time
        """
        cache_key = f"events_{date}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        url = f"{self.base_url}/sports/{ODDS_API_CONFIG['sport']}/events"
        params = {
            'apiKey': self.api_key,
            'date': date,
            'regions': ODDS_API_CONFIG['regions'],
        }

        self._rate_limit()

        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()

            events = response.json()
            self.cache[cache_key] = events
            self.request_count += 1

            return events
        except requests.exceptions.RequestException as e:
            print(f"    Error fetching events: {e}")
            return []

    def get_historical_odds(self, event_id: str, date: str) -> Optional[Dict]:
        """
        Get historical odds for specific event

        Endpoint: GET /historical/sports/americanfootball_nfl/events/{event_id}/odds
        Params: apiKey, date, regions, markets

        Returns odds from multiple bookmakers with spreads/totals
        """
        cache_key = f"odds_{event_id}_{date}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        url = f"{self.base_url}/historical/sports/{ODDS_API_CONFIG['sport']}/events/{event_id}/odds"
        params = {
            'apiKey': self.api_key,
            'date': date,
            'regions': ODDS_API_CONFIG['regions'],
            'markets': ODDS_API_CONFIG['markets'],
            'oddsFormat': ODDS_API_CONFIG['odds_format'],
        }

        self._rate_limit()

        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()

            odds = response.json()
            self.cache[cache_key] = odds
            self.request_count += 1

            return odds
        except requests.exceptions.RequestException as e:
            print(f"    Error fetching odds for event {event_id}: {e}")
            return None

    def _rate_limit(self):
        """Simple rate limiting (1 request per second)"""
        time.sleep(ODDS_API_CONFIG['rate_limit_delay'])


class GameMatcher:
    """Match ESPN games to Odds API events"""

    def __init__(self, team_mapper: TeamNameMapper):
        self.team_mapper = team_mapper

    def find_match(self, espn_game: Dict, odds_events: List[Dict]) -> Optional[str]:
        """
        Find matching Odds API event for ESPN game

        Matching criteria:
        1. Home team matches
        2. Away team matches
        3. Date within 7 days (generous window for week matching)

        Returns: event_id or None
        """
        try:
            espn_date = datetime.fromisoformat(espn_game['gameTime'].replace('Z', '+00:00'))
        except:
            # Fallback if date parsing fails
            return None

        home_team = espn_game['homeTeam']['name']
        away_team = espn_game['awayTeam']['name']

        for event in odds_events:
            try:
                event_date = datetime.fromisoformat(event['commence_time'].replace('Z', '+00:00'))
            except:
                continue

            # Check date proximity (within 7 days to account for week grouping)
            if abs((espn_date - event_date).total_seconds()) > 604800:  # 7 days
                continue

            # Check team matches
            home_match = self.team_mapper.teams_match(home_team, event['home_team'])
            away_match = self.team_mapper.teams_match(away_team, event['away_team'])

            if home_match and away_match:
                return event['id']

        return None


class ConsensusLineCalculator:
    """Calculate consensus lines from multiple bookmakers"""

    def calculate_consensus(self, odds_data: Dict) -> Optional[Dict]:
        """
        Extract consensus closing lines using median

        Args:
            odds_data: Response from getHistoricalOdds()

        Returns:
            {spread: float, total: float, bookmakers_count: int} or None if insufficient data
        """
        if not odds_data:
            return None

        bookmakers = odds_data.get('bookmakers', [])

        if len(bookmakers) == 0:
            return None

        # Prioritize trusted bookmakers if we have enough
        if len(bookmakers) >= LINE_STRATEGY['min_bookmakers']:
            bookmakers_to_use = self._filter_priority_bookmakers(bookmakers)
            if not bookmakers_to_use:
                bookmakers_to_use = bookmakers
        else:
            bookmakers_to_use = bookmakers

        spreads = []
        totals = []

        for book in bookmakers_to_use:
            markets = book.get('markets', [])

            for market in markets:
                if market['key'] == 'spreads':
                    # Extract home team spread (negative = favorite)
                    outcomes = market.get('outcomes', [])
                    for outcome in outcomes:
                        # Find home team outcome
                        if outcome.get('name') == odds_data.get('home_team'):
                            point = outcome.get('point')
                            if point is not None:
                                spreads.append(float(point))

                elif market['key'] == 'totals':
                    # Extract total line
                    outcomes = market.get('outcomes', [])
                    if outcomes and len(outcomes) > 0:
                        point = outcomes[0].get('point')
                        if point is not None:
                            totals.append(float(point))

        if not spreads or not totals:
            return None

        return {
            'spread': float(np.median(spreads)),
            'total': float(np.median(totals)),
            'bookmakers_count': len(bookmakers_to_use),
        }

    def _filter_priority_bookmakers(self, bookmakers: List[Dict]) -> List[Dict]:
        """Filter to priority bookmakers"""
        priority = []
        for book in bookmakers:
            if book.get('key') in PRIORITY_BOOKMAKERS:
                priority.append(book)
        return priority


def load_training_data(json_path: str) -> Dict:
    """Load training data from JSON"""
    with open(json_path, 'r') as f:
        return json.load(f)


def group_games_by_week(games: List[Dict]) -> Dict:
    """Group games by season + week for batch processing"""
    weeks = {}
    for game in games:
        key = (game['season'], game['week'])
        if key not in weeks:
            weeks[key] = []
        weeks[key].append(game)
    return weeks


def get_week_closing_date(season: int, week: int) -> str:
    """
    Get Sunday morning (10am ET) for closing lines
    This is just before kickoff - most accurate lines
    """
    # Calculate Sunday of that week
    week_start = datetime.fromisoformat(WEEK_START_DATES[season])
    days_offset = (week - 1) * 7
    sunday = week_start + timedelta(days=days_offset)

    # Set to 10am ET (15:00 UTC for standard time, 14:00 UTC for daylight)
    # Simplified: use 15:00 UTC
    closing_time = sunday.replace(hour=15, minute=0, second=0, microsecond=0)

    return closing_time.isoformat() + 'Z'


def enrich_games_with_odds(
    games: List[Dict],
    api_client: OddsAPIClient,
    matcher: GameMatcher,
    calculator: ConsensusLineCalculator
) -> Tuple[int, int]:
    """
    Enrich games with historical odds

    Returns: (successful_count, failed_count)
    """
    successful = 0
    failed = 0

    # Group by week to batch API calls
    weeks = group_games_by_week(games)

    for (season, week), week_games in sorted(weeks.items()):
        print(f"\nProcessing {season} Week {week} ({len(week_games)} games)...")

        try:
            # Get closing date for this week
            closing_date = get_week_closing_date(season, week)

            # Fetch events for this week
            events = api_client.get_historical_events(closing_date)
            print(f"  Found {len(events)} events from Odds API")

            # Match and enrich each game
            for game in week_games:
                event_id = matcher.find_match(game, events)

                if not event_id:
                    print(f"  ❌ No match: {game['awayTeam']['name']} @ {game['homeTeam']['name']}")
                    failed += 1
                    continue

                # Fetch odds for matched event
                try:
                    odds_data = api_client.get_historical_odds(event_id, closing_date)
                    consensus = calculator.calculate_consensus(odds_data)

                    if consensus:
                        game['lines'] = {
                            'spread': consensus['spread'],
                            'total': consensus['total'],
                        }
                        print(f"  ✅ {game['awayTeam']['name']} @ {game['homeTeam']['name']}: {consensus['spread']:+.1f}, {consensus['total']:.1f}")
                        successful += 1
                    else:
                        print(f"  ⚠️  No consensus: {game['awayTeam']['name']} @ {game['homeTeam']['name']}")
                        failed += 1

                except Exception as e:
                    print(f"  ❌ Error fetching odds: {e}")
                    failed += 1

        except Exception as e:
            print(f"  ❌ Error processing week: {e}")
            failed += len(week_games)

    return successful, failed


def save_enriched_data(dataset: Dict, output_path: str) -> None:
    """Save enriched training data"""
    with open(output_path, 'w') as f:
        json.dump(dataset, f, indent=2)

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\n💾 Saved enriched data: {output_path} ({file_size:.2f} MB)")


def generate_report(total_games: int, successful: int, failed: int, api_calls: int) -> None:
    """Generate summary report"""
    print("\n" + "="*70)
    print("📊 ENRICHMENT SUMMARY")
    print("="*70)
    print(f"\nTotal Games:           {total_games}")
    print(f"Successfully Enriched: {successful} ({successful/total_games*100:.1f}%)")
    print(f"Failed/Missing:        {failed} ({failed/total_games*100:.1f}%)")
    print(f"\nAPI Calls Used:        {api_calls}")
    print(f"Estimated Cost:        {'FREE (within 500/month quota)' if api_calls < 500 else 'May require paid tier'}")
    print("\n" + "="*70)


def main():
    """Main execution flow"""
    import argparse

    parser = argparse.ArgumentParser(description='Enrich training data with historical Vegas odds')
    parser.add_argument('--input', required=True, help='Input training data JSON')
    parser.add_argument('--output', required=True, help='Output enriched JSON')
    parser.add_argument('--cache', default='odds_cache.json', help='Cache file for API responses')

    args = parser.parse_args()

    print("="*70)
    print("🎲 HISTORICAL ODDS ENRICHMENT")
    print("="*70)
    print(f"Input:  {args.input}")
    print(f"Output: {args.output}")
    print("="*70)

    # Load training data
    print("\n📂 Loading training data...")
    dataset = load_training_data(args.input)
    games = dataset['data']
    print(f"✅ Loaded {len(games)} games")

    # Initialize components
    team_mapper = TeamNameMapper()
    api_client = OddsAPIClient()
    matcher = GameMatcher(team_mapper)
    calculator = ConsensusLineCalculator()

    # Load cache if exists
    if os.path.exists(args.cache):
        print(f"\n📦 Loading cache from {args.cache}...")
        with open(args.cache, 'r') as f:
            api_client.cache = json.load(f)
        print(f"✅ Loaded {len(api_client.cache)} cached entries")

    # Enrich games
    print("\n🔄 Starting enrichment...")
    successful, failed = enrich_games_with_odds(games, api_client, matcher, calculator)

    # Save enriched data
    save_enriched_data(dataset, args.output)

    # Save cache
    print(f"\n💾 Saving cache to {args.cache}...")
    with open(args.cache, 'w') as f:
        json.dump(api_client.cache, f, indent=2)

    # Generate report
    generate_report(len(games), successful, failed, api_client.request_count)

    print(f"\n✅ Enrichment complete!")
    print(f"\n📌 Next steps:")
    print(f"   1. Review enriched data: {args.output}")
    print(f"   2. Retrain model: python train_model.py {args.output}")
    print(f"   3. Calculate ATS: python batch_predict.py {args.output}")


if __name__ == '__main__':
    main()
