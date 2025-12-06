#!/usr/bin/env python3
"""
Historical Spreads Scraper
Scrapes historical NFL spreads from free sources
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime
import re

class SpreadsScraper:
    """Scrape historical NFL spreads"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

    def scrape_pro_football_reference(self, year, week):
        """
        Scrape spreads from Pro Football Reference
        Free and reliable source
        """
        url = f'https://www.pro-football-reference.com/years/{year}/week_{week}.htm'

        print(f"Scraping {url}...")

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            games = []
            game_tables = soup.find_all('div', class_='game_summary')

            for game_div in game_tables:
                try:
                    # Extract team names
                    teams = game_div.find_all('tr')
                    if len(teams) < 2:
                        continue

                    away_team = teams[0].find('a').text.strip() if teams[0].find('a') else None
                    home_team = teams[1].find('a').text.strip() if teams[1].find('a') else None

                    # Extract scores
                    away_score_td = teams[0].find('td', class_='right')
                    home_score_td = teams[1].find('td', class_='right')

                    away_score = int(away_score_td.text.strip()) if away_score_td else None
                    home_score = int(home_score_td.text.strip()) if home_score_td else None

                    # Look for spread info (sometimes in game summary)
                    spread_text = game_div.get_text()
                    spread_match = re.search(r'(\-?\d+\.?\d*)', spread_text)

                    game_data = {
                        'year': year,
                        'week': week,
                        'away_team': away_team,
                        'home_team': home_team,
                        'away_score': away_score,
                        'home_score': home_score,
                        'actual_spread': home_score - away_score if home_score and away_score else None,
                        'vegas_spread': None,  # PFR doesn't always have spreads
                        'source': 'pro-football-reference'
                    }

                    games.append(game_data)

                except Exception as e:
                    print(f"  Error parsing game: {e}")
                    continue

            print(f"  Found {len(games)} games")
            return games

        except Exception as e:
            print(f"  Error scraping: {e}")
            return []

    def scrape_covers_com(self, year, week):
        """
        Scrape spreads from Covers.com
        Has historical spreads going back years
        """
        # Covers uses different URL format
        url = f'https://www.covers.com/sport/football/nfl/matchups?selectedDate={year}-{week}'

        print(f"Scraping Covers.com for {year} Week {week}...")

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Covers has a different HTML structure
            # This would need to be adapted based on their current layout

            games = []

            print(f"  ⚠️  Covers.com scraping needs HTML structure analysis")
            print(f"  This is a placeholder - inspect their HTML to build proper scraper")

            return games

        except Exception as e:
            print(f"  Error scraping Covers: {e}")
            return []

    def scrape_season(self, year, start_week=1, end_week=18):
        """Scrape an entire season"""
        all_games = []

        for week in range(start_week, end_week + 1):
            print(f"\nWeek {week}:")
            games = self.scrape_pro_football_reference(year, week)
            all_games.extend(games)

            # Be nice to the server
            time.sleep(2)

        return all_games

    def save_to_json(self, games, filename):
        """Save scraped data to JSON"""
        with open(filename, 'w') as f:
            json.dump({
                'scraped_at': datetime.now().isoformat(),
                'total_games': len(games),
                'games': games
            }, f, indent=2)

        print(f"\n✅ Saved {len(games)} games to {filename}")

    def match_to_training_data(self, scraped_games, training_data_file):
        """
        Match scraped spreads to your training data
        This enriches your training data with actual Vegas lines
        """
        print(f"\nMatching spreads to training data...")

        with open(training_data_file, 'r') as f:
            training_data = json.load(f)

        matched = 0
        for data_point in training_data['data']:
            season = data_point['season']
            week = data_point['week']
            home_team = data_point['homeTeam']['name']
            away_team = data_point['awayTeam']['name']

            # Find matching game in scraped data
            for scraped in scraped_games:
                if (scraped['year'] == season and
                    scraped['week'] == week and
                    self._teams_match(scraped['home_team'], home_team) and
                    self._teams_match(scraped['away_team'], away_team)):

                    # Add Vegas spread to training data
                    if scraped['vegas_spread'] is not None:
                        if 'lines' not in data_point:
                            data_point['lines'] = {}
                        data_point['lines']['spread'] = scraped['vegas_spread']
                        matched += 1
                        break

        print(f"✅ Matched {matched} games with Vegas spreads")

        # Save enriched training data
        output_file = training_data_file.replace('.json', '_with_spreads.json')
        with open(output_file, 'w') as f:
            json.dump(training_data, f, indent=2)

        print(f"✅ Saved enriched data to {output_file}")

        return output_file

    def _teams_match(self, team1, team2):
        """Check if two team names match (handles different formats)"""
        # Normalize team names
        team1 = team1.lower().replace(' ', '').replace('.', '')
        team2 = team2.lower().replace(' ', '').replace('.', '')

        return (team1 in team2 or team2 in team1 or
                team1.split()[-1] in team2 or  # Just city/mascot
                team2.split()[-1] in team1)


def main():
    """CLI interface"""
    import sys

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scrape_historical_spreads.py <year> [start_week] [end_week]")
        print("  python scrape_historical_spreads.py 2024 1 14")
        print("")
        print("  python scrape_historical_spreads.py --match <scraped_data.json> <training_data.json>")
        sys.exit(1)

    scraper = SpreadsScraper()

    if sys.argv[1] == '--match':
        # Match scraped data to training data
        with open(sys.argv[2], 'r') as f:
            scraped_data = json.load(f)

        output_file = scraper.match_to_training_data(
            scraped_data['games'],
            sys.argv[3]
        )

        print(f"\n✅ Done! Use {output_file} for training with real spreads")

    else:
        # Scrape spreads
        year = int(sys.argv[1])
        start_week = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        end_week = int(sys.argv[3]) if len(sys.argv) > 3 else 18

        print(f"Scraping {year} NFL Season, Weeks {start_week}-{end_week}")
        print("="*60)

        games = scraper.scrape_season(year, start_week, end_week)

        filename = f'spreads_{year}_weeks_{start_week}_{end_week}.json'
        scraper.save_to_json(games, filename)

        print(f"\nNext step:")
        print(f"  python scrape_historical_spreads.py --match {filename} <your_training_data.json>")


if __name__ == '__main__':
    main()
