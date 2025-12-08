#!/usr/bin/env python3
"""
Enrich training data with historical Vegas lines from nfl_data_py
Uses Lee Sharpe's NFL dataset - complete, free, maintained
"""

import json
import sys
import os
import nfl_data_py as nfl

# Team name mapping between ESPN and nfl_data_py abbreviations
TEAM_NAME_TO_ABBR = {
    'Arizona Cardinals': 'ARI',
    'Atlanta Falcons': 'ATL',
    'Baltimore Ravens': 'BAL',
    'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR',
    'Chicago Bears': 'CHI',
    'Cincinnati Bengals': 'CIN',
    'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL',
    'Denver Broncos': 'DEN',
    'Detroit Lions': 'DET',
    'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU',
    'Indianapolis Colts': 'IND',
    'Jacksonville Jaguars': 'JAX',
    'Kansas City Chiefs': 'KC',
    'Las Vegas Raiders': 'LV',
    'Oakland Raiders': 'LV',  # Historical
    'Los Angeles Chargers': 'LAC',
    'San Diego Chargers': 'LAC',  # Historical
    'Los Angeles Rams': 'LA',
    'St. Louis Rams': 'LA',  # Historical
    'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN',
    'New England Patriots': 'NE',
    'New Orleans Saints': 'NO',
    'New York Giants': 'NYG',
    'New York Jets': 'NYJ',
    'Philadelphia Eagles': 'PHI',
    'Pittsburgh Steelers': 'PIT',
    'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA',
    'Tampa Bay Buccaneers': 'TB',
    'Tennessee Titans': 'TEN',
    'Washington Commanders': 'WAS',
    'Washington': 'WAS',  # Historical
    'Washington Football Team': 'WAS',  # Historical
}


class NFLVerseLinesEnricher:
    """Enrich training data using nfl_data_py (Lee Sharpe's dataset)"""

    def __init__(self):
        self.schedules = None
        self.matched_count = 0
        self.failed_count = 0

    def load_nflverse_data(self, seasons=[2021, 2022, 2023, 2024]):
        """Load NFL schedules with Vegas lines from nfl_data_py"""
        print(f"\n📦 Loading nfl_data_py schedules for seasons: {seasons}")

        try:
            # Load schedules as pandas DataFrame
            self.schedules = nfl.import_schedules(seasons)

            print(f"✅ Loaded {len(self.schedules)} games from nfl_data_py")
            print(f"   Columns available: {list(self.schedules.columns[:20])}...")

            # Check for Vegas line columns
            has_spread = 'spread_line' in self.schedules.columns
            has_total = 'total_line' in self.schedules.columns

            if not has_spread or not has_total:
                print(f"⚠️  Warning: Missing Vegas line columns!")
                print(f"   spread_line present: {has_spread}")
                print(f"   total_line present: {has_total}")
            else:
                # Count non-null values
                spread_count = self.schedules['spread_line'].notna().sum()
                total_count = self.schedules['total_line'].notna().sum()
                print(f"   Games with spread_line: {spread_count}")
                print(f"   Games with total_line: {total_count}")

            return True

        except Exception as e:
            print(f"❌ Error loading nfl_data_py: {e}")
            import traceback
            traceback.print_exc()
            return False

    def get_team_abbr(self, team_name):
        """Convert ESPN team name to nfl_data_py abbreviation"""
        return TEAM_NAME_TO_ABBR.get(team_name, None)

    def find_matching_game(self, espn_game):
        """
        Find matching nfl_data_py game for ESPN game

        Match criteria:
        1. Same season
        2. Same week
        3. Same home team
        4. Same away team
        """
        season = espn_game['season']
        week = espn_game['week']
        home_team_name = espn_game['homeTeam']['name']
        away_team_name = espn_game['awayTeam']['name']

        # Convert to abbreviations
        home_abbr = self.get_team_abbr(home_team_name)
        away_abbr = self.get_team_abbr(away_team_name)

        if not home_abbr or not away_abbr:
            print(f"  ⚠️  Unknown team: {home_team_name} or {away_team_name}")
            return None

        # Find in nfl_data_py schedules
        matching_games = self.schedules[
            (self.schedules['season'] == season) &
            (self.schedules['week'] == week) &
            (self.schedules['home_team'] == home_abbr) &
            (self.schedules['away_team'] == away_abbr)
        ]

        if len(matching_games) == 0:
            return None
        elif len(matching_games) > 1:
            print(f"  ⚠️  Multiple matches found for {away_team_name} @ {home_team_name}, using first")
            return matching_games.iloc[0]
        else:
            return matching_games.iloc[0]

    def enrich_training_data(self, training_data_path, output_path):
        """Main enrichment logic"""
        print("\n" + "="*70)
        print("🎲 VEGAS LINES ENRICHMENT (nfl_data_py)")
        print("="*70)
        print(f"Input:  {training_data_path}")
        print(f"Output: {output_path}")
        print("="*70)

        # Load training data
        print("\n📂 Loading training data...")
        with open(training_data_path, 'r') as f:
            dataset = json.load(f)

        games = dataset['data']
        print(f"✅ Loaded {len(games)} games from training data")

        # Determine seasons
        seasons = sorted(list(set(game['season'] for game in games)))
        print(f"   Seasons: {seasons}")

        # Load nfl_data_py
        if not self.load_nflverse_data(seasons):
            print("❌ Failed to load nfl_data_py data")
            return False

        # Enrich each game
        print("\n🔄 Matching games and enriching with Vegas lines...")

        for idx, game in enumerate(games):
            try:
                matching_game = self.find_matching_game(game)

                if matching_game is None:
                    self.failed_count += 1
                    if (idx + 1) % 100 == 0:
                        print(f"  ❌ No match: {game['season']} Week {game['week']}: "
                              f"{game['awayTeam']['name']} @ {game['homeTeam']['name']}")
                    continue

                # Extract Vegas lines
                spread = matching_game['spread_line']
                total = matching_game['total_line']

                # Check if lines exist (not NaN)
                if not (spread == spread) or not (total == total):  # NaN check
                    self.failed_count += 1
                    continue

                # Add lines to training data
                game['lines'] = {
                    'spread': float(spread),
                    'total': float(total)
                }

                self.matched_count += 1

                # Progress update
                if (idx + 1) % 100 == 0:
                    print(f"  ✅ Processed {idx + 1}/{len(games)} games "
                          f"(matched: {self.matched_count}, failed: {self.failed_count})")

            except Exception as e:
                print(f"  ⚠️  Error processing game {idx}: {e}")
                self.failed_count += 1

        # Save enriched data
        print(f"\n💾 Saving enriched data to: {output_path}")
        with open(output_path, 'w') as f:
            json.dump(dataset, f, indent=2)

        file_size = os.path.getsize(output_path) / (1024 * 1024)
        print(f"✅ Saved! ({file_size:.2f} MB)")

        # Summary report
        self.print_summary(len(games))

        return True

    def print_summary(self, total_games):
        """Print enrichment summary"""
        print("\n" + "="*70)
        print("📊 ENRICHMENT SUMMARY")
        print("="*70)
        print(f"\nTotal Games:           {total_games}")
        print(f"Successfully Enriched: {self.matched_count} ({self.matched_count/total_games*100:.1f}%)")
        print(f"Failed/Missing:        {self.failed_count} ({self.failed_count/total_games*100:.1f}%)")
        print(f"\nData Source:           nfl_data_py (Lee Sharpe's NFL dataset)")
        print(f"Cost:                  FREE")
        print(f"API Calls:             0 (local data)")
        print("\n" + "="*70)

        # Status indicator
        success_rate = (self.matched_count / total_games) * 100
        if success_rate >= 95:
            print("✅ Status: EXCELLENT (95%+ coverage)")
        elif success_rate >= 85:
            print("🟡 Status: GOOD (85-95% coverage)")
        else:
            print("⚠️  Status: NEEDS REVIEW (<85% coverage)")

        print("\n📌 Next steps:")
        print("   1. Validate enriched data")
        print("   2. Retrain model: python train_model.py <output_file>")
        print("   3. Calculate ATS: python batch_predict.py <output_file>")


def main():
    """CLI interface"""
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python enrich_with_nfldata.py <input_training_data.json> <output_file.json>")
        print("")
        print("Example:")
        print("  python enrich_with_nfldata.py nfl_training_data_2024_2023_2022_2021.json nfl_training_data_with_vegas.json")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    enricher = NFLVerseLinesEnricher()
    success = enricher.enrich_training_data(input_file, output_file)

    if success:
        print("\n✅ Enrichment complete!")
        sys.exit(0)
    else:
        print("\n❌ Enrichment failed!")
        sys.exit(1)


if __name__ == '__main__':
    main()
