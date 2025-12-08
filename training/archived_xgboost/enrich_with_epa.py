#!/usr/bin/env python3
"""
Enrich NFL training data with EPA (Expected Points Added) and advanced metrics.

This script adds high-value predictive features from nfl_data_py:
- EPA per play (offensive and defensive)
- Success rate
- Explosive play rate
- QB-specific EPA
- Home/away record splits
- Strength of schedule

Data source: nfl_data_py (Lee Sharpe's play-by-play dataset)
"""

import json
import sys
import argparse
from datetime import datetime
import nfl_data_py as nfl
import pandas as pd
import numpy as np
from team_abbr_map import get_abbr, TEAM_NAME_TO_ABBR


class EPAEnricher:
    """Enrich training data with EPA and advanced metrics."""

    def __init__(self):
        self.pbp_data = None  # Play-by-play data
        self.schedules = None  # Schedule data (for QBR context)
        self.team_cache = {}  # Cache for team metrics by season/week

    def load_play_by_play_data(self, seasons):
        """
        Load play-by-play data with EPA from nfl_data_py.

        Args:
            seasons (list): List of seasons to load (e.g., [2021, 2022, 2023, 2024])
        """
        print(f"\nLoading play-by-play data for seasons: {seasons}")
        print("This may take a few minutes for multiple seasons...")

        try:
            self.pbp_data = nfl.import_pbp_data(seasons, downcast=True, cache=False)
            print(f"✅ Loaded {len(self.pbp_data):,} plays")

            # Verify EPA column exists
            if 'epa' not in self.pbp_data.columns:
                raise ValueError("EPA column not found in play-by-play data")

            return True

        except Exception as e:
            print(f"❌ Error loading play-by-play data: {e}")
            return False

    def calculate_team_epa_metrics(self, team_abbr, season, week):
        """
        Calculate EPA and efficiency metrics for a team through a specific week.

        CRITICAL: Only uses games BEFORE the target week to prevent data leakage.

        Args:
            team_abbr (str): Team abbreviation (e.g., "KC")
            season (int): Season year
            week (int): Week number (metrics calculated through week-1)

        Returns:
            dict: EPA and efficiency metrics
        """
        cache_key = f"{team_abbr}_{season}_{week}"
        if cache_key in self.team_cache:
            return self.team_cache[cache_key]

        # Filter to games BEFORE the target week (no data leakage)
        team_plays = self.pbp_data[
            (self.pbp_data['season'] == season) &
            (self.pbp_data['week'] < week) &
            ((self.pbp_data['posteam'] == team_abbr) |
             (self.pbp_data['defteam'] == team_abbr))
        ].copy()

        # Default values for early season (insufficient data)
        if len(team_plays) < 50:
            default_metrics = {
                'epa_per_play': 0.0,
                'epa_allowed_per_play': 0.0,
                'success_rate': 0.5,
                'explosive_rate': 0.1,
                'qb_epa': 0.0,
                'data_quality': 'insufficient'
            }
            self.team_cache[cache_key] = default_metrics
            return default_metrics

        # Offensive metrics (when team has possession)
        offense_plays = team_plays[
            (team_plays['posteam'] == team_abbr) &
            (team_plays['epa'].notna())
        ]

        # Defensive metrics (when team is defending)
        defense_plays = team_plays[
            (team_plays['defteam'] == team_abbr) &
            (team_plays['epa'].notna())
        ]

        # Calculate EPA
        off_epa = offense_plays['epa'].mean() if len(offense_plays) > 0 else 0.0
        def_epa = defense_plays['epa'].mean() if len(defense_plays) > 0 else 0.0

        # Success rate (EPA > 0)
        if len(offense_plays) > 0:
            success_rate = (offense_plays['epa'] > 0).mean()
        else:
            success_rate = 0.5

        # Explosive play rate (20+ yard pass, 10+ yard rush)
        explosive_plays = offense_plays[
            ((offense_plays['pass'] == 1) & (offense_plays['yards_gained'] >= 20)) |
            ((offense_plays['rush'] == 1) & (offense_plays['yards_gained'] >= 10))
        ]
        explosive_rate = len(explosive_plays) / len(offense_plays) if len(offense_plays) > 0 else 0.0

        # QB-specific EPA (passing plays only)
        qb_plays = offense_plays[
            (offense_plays['pass'] == 1) &
            (offense_plays['qb_epa'].notna())
        ]
        qb_epa = qb_plays['qb_epa'].mean() if len(qb_plays) > 0 else 0.0

        metrics = {
            'epa_per_play': float(off_epa),
            'epa_allowed_per_play': float(def_epa),
            'success_rate': float(success_rate),
            'explosive_rate': float(explosive_rate),
            'qb_epa': float(qb_epa),
            'data_quality': 'good'
        }

        self.team_cache[cache_key] = metrics
        return metrics

    def calculate_home_away_records(self, games, team_name, season, week):
        """
        Calculate actual home and away win percentages for a team.

        CRITICAL: Only uses games BEFORE the target week to prevent data leakage.

        Args:
            games (list): All games in dataset
            team_name (str): ESPN team name (e.g., "Kansas City Chiefs")
            season (int): Season year
            week (int): Week number

        Returns:
            tuple: (home_win_pct, away_win_pct)
        """
        # Filter to games BEFORE target week
        team_games = [
            g for g in games
            if (g['season'] < season or
                (g['season'] == season and g['week'] < week)) and
            (g['homeTeam']['name'] == team_name or
             g['awayTeam']['name'] == team_name)
        ]

        # Home games
        home_games = [g for g in team_games if g['homeTeam']['name'] == team_name]
        home_wins = sum(1 for g in home_games if g['outcome']['homeWon'])
        home_win_pct = home_wins / len(home_games) if home_games else 0.5

        # Away games
        away_games = [g for g in team_games if g['awayTeam']['name'] == team_name]
        away_wins = sum(1 for g in away_games if not g['outcome']['homeWon'])
        away_win_pct = away_wins / len(away_games) if away_games else 0.5

        return home_win_pct, away_win_pct

    def calculate_strength_of_schedule(self, games, team_name, season, week):
        """
        Calculate strength of schedule (average opponent win% faced this season).

        CRITICAL: Only uses games BEFORE the target week to prevent data leakage.

        Args:
            games (list): All games in dataset
            team_name (str): ESPN team name
            season (int): Season year
            week (int): Week number

        Returns:
            float: Average opponent win percentage (0.0 to 1.0)
        """
        # Games this team played THIS season before target week
        team_games = [
            g for g in games
            if g['season'] == season and g['week'] < week and
            (g['homeTeam']['name'] == team_name or
             g['awayTeam']['name'] == team_name)
        ]

        if not team_games:
            return 0.5  # Default for early season

        # Get opponent win percentages
        opponent_win_pcts = []
        for game in team_games:
            if game['homeTeam']['name'] == team_name:
                # Opponent is away team
                opponent_win_pct = game['awayTeam'].get('winPct', 0.5)
            else:
                # Opponent is home team
                opponent_win_pct = game['homeTeam'].get('winPct', 0.5)

            opponent_win_pcts.append(opponent_win_pct)

        return sum(opponent_win_pcts) / len(opponent_win_pcts)

    def enrich_game(self, game, all_games):
        """
        Add EPA and advanced metrics to a single game.

        Args:
            game (dict): Single game from training dataset
            all_games (list): All games (for home/away splits and SOS)

        Returns:
            dict: Game with added 'advanced_metrics' field
        """
        season = game['season']
        week = game['week']
        home_team = game['homeTeam']['name']
        away_team = game['awayTeam']['name']

        # Get team abbreviations
        home_abbr = get_abbr(home_team)
        away_abbr = get_abbr(away_team)

        if not home_abbr or not away_abbr:
            # Can't process without team mapping
            return game

        # Calculate EPA metrics
        home_epa = self.calculate_team_epa_metrics(home_abbr, season, week)
        away_epa = self.calculate_team_epa_metrics(away_abbr, season, week)

        # Calculate home/away splits
        home_home_pct, home_away_pct = self.calculate_home_away_records(
            all_games, home_team, season, week
        )
        away_home_pct, away_away_pct = self.calculate_home_away_records(
            all_games, away_team, season, week
        )

        # Calculate strength of schedule
        home_sos = self.calculate_strength_of_schedule(
            all_games, home_team, season, week
        )
        away_sos = self.calculate_strength_of_schedule(
            all_games, away_team, season, week
        )

        # Add all advanced metrics to game
        game['advanced_metrics'] = {
            'home': {
                # EPA metrics
                'epa_per_play': home_epa['epa_per_play'],
                'epa_allowed_per_play': home_epa['epa_allowed_per_play'],
                'success_rate': home_epa['success_rate'],
                'explosive_rate': home_epa['explosive_rate'],
                'qb_epa': home_epa['qb_epa'],
                # Home/away splits
                'home_record_pct': home_home_pct,
                'away_record_pct': home_away_pct,
                # Strength of schedule
                'strength_of_schedule': home_sos,
                # Data quality
                'data_quality': home_epa['data_quality']
            },
            'away': {
                # EPA metrics
                'epa_per_play': away_epa['epa_per_play'],
                'epa_allowed_per_play': away_epa['epa_allowed_per_play'],
                'success_rate': away_epa['success_rate'],
                'explosive_rate': away_epa['explosive_rate'],
                'qb_epa': away_epa['qb_epa'],
                # Home/away splits
                'home_record_pct': away_home_pct,
                'away_record_pct': away_away_pct,
                # Strength of schedule
                'strength_of_schedule': away_sos,
                # Data quality
                'data_quality': away_epa['data_quality']
            }
        }

        return game

    def enrich_training_data(self, input_path, output_path):
        """
        Enrich entire training dataset with EPA and advanced metrics.

        Args:
            input_path (str): Path to input JSON (e.g., nfl_training_data_with_vegas.json)
            output_path (str): Path to output JSON (e.g., nfl_training_data_with_epa.json)

        Returns:
            bool: Success status
        """
        print(f"\n{'='*80}")
        print("EPA ENRICHMENT PROCESS")
        print(f"{'='*80}")
        print(f"Input:  {input_path}")
        print(f"Output: {output_path}")

        # Load training data
        print(f"\nLoading training data from {input_path}...")
        try:
            with open(input_path, 'r') as f:
                dataset = json.load(f)
            games = dataset['data']
            print(f"✅ Loaded {len(games)} games")
        except Exception as e:
            print(f"❌ Error loading training data: {e}")
            return False

        # Get seasons to load
        seasons = sorted(set(g['season'] for g in games))
        print(f"Seasons in dataset: {seasons}")

        # Load play-by-play data
        if not self.load_play_by_play_data(seasons):
            return False

        # Enrich each game
        print(f"\nEnriching {len(games)} games with EPA metrics...")
        enriched_count = 0
        insufficient_data_count = 0

        for i, game in enumerate(games):
            game = self.enrich_game(game, games)

            # Track data quality
            if 'advanced_metrics' in game:
                if game['advanced_metrics']['home']['data_quality'] == 'insufficient':
                    insufficient_data_count += 1
                else:
                    enriched_count += 1

            # Progress update
            if (i + 1) % 100 == 0:
                print(f"  Processed {i+1}/{len(games)} games "
                      f"({enriched_count} with good data, "
                      f"{insufficient_data_count} with insufficient data)")

        print(f"\n{'='*80}")
        print("ENRICHMENT SUMMARY")
        print(f"{'='*80}")
        print(f"Total games:           {len(games)}")
        print(f"Enriched (good data):  {enriched_count} ({enriched_count/len(games)*100:.1f}%)")
        print(f"Insufficient data:     {insufficient_data_count} ({insufficient_data_count/len(games)*100:.1f}%)")

        # Save enriched dataset
        print(f"\nSaving enriched data to {output_path}...")
        try:
            with open(output_path, 'w') as f:
                json.dump(dataset, f, indent=2)
            print(f"✅ Successfully saved enriched dataset")
            return True
        except Exception as e:
            print(f"❌ Error saving enriched data: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description='Enrich NFL training data with EPA and advanced metrics'
    )
    parser.add_argument(
        '--input',
        default='nfl_training_data_with_vegas.json',
        help='Input training data JSON file'
    )
    parser.add_argument(
        '--output',
        default='nfl_training_data_with_epa.json',
        help='Output enriched JSON file'
    )

    args = parser.parse_args()

    # Run enrichment
    enricher = EPAEnricher()
    success = enricher.enrich_training_data(args.input, args.output)

    if success:
        print(f"\n{'='*80}")
        print("✅ EPA ENRICHMENT COMPLETE!")
        print(f"{'='*80}")
        print(f"\nNext steps:")
        print(f"1. Update train_model.py to extract EPA features")
        print(f"2. Retrain model: python train_model.py {args.output}")
        print(f"3. Validate performance improvements")
        sys.exit(0)
    else:
        print(f"\n❌ EPA enrichment failed. See errors above.")
        sys.exit(1)


if __name__ == '__main__':
    main()
