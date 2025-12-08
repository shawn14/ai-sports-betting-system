#!/usr/bin/env python3
"""
Production NFL Betting Predictions with Confidence Filtering

Strategy: Only recommend bets when our prediction differs from Vegas by 6+ points
Expected Performance: 58.1% win rate, +11.9% ROI (based on backtest)
"""

import json
import pickle
import pandas as pd
import numpy as np
from datetime import datetime
import sys


# Optimal confidence threshold from backtest
CONFIDENCE_THRESHOLD = 6.0


class NFLPredictor:
    """NFL betting predictions with confidence filtering"""

    def __init__(self, model_path='spread_model_20251206_211858.pkl',
                 features_path='feature_columns_20251206_211858.json'):
        """Load trained model and feature configuration"""
        print("Loading NFL Prediction Model...")

        # Load model
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)

        # Load feature columns
        with open(features_path, 'r') as f:
            feature_data = json.load(f)
            self.feature_cols = feature_data['features']

        # Set default confidence threshold
        self.confidence_threshold = CONFIDENCE_THRESHOLD

        print(f"✅ Model loaded: {model_path}")
        print(f"✅ Features: {len(self.feature_cols)}")
        print(f"✅ Confidence threshold: {self.confidence_threshold} points")

    def extract_features(self, game):
        """Extract features from a game (same as training)"""
        home_last3 = game['homeTeam']['last3Games']
        away_last3 = game['awayTeam']['last3Games']

        home_last3_pf = sum(home_last3.get('pointsScored', [0])) / max(len(home_last3.get('pointsScored', [0])), 1)
        home_last3_pa = sum(home_last3.get('pointsAllowed', [0])) / max(len(home_last3.get('pointsAllowed', [0])), 1)
        away_last3_pf = sum(away_last3.get('pointsScored', [0])) / max(len(away_last3.get('pointsScored', [0])), 1)
        away_last3_pa = sum(away_last3.get('pointsAllowed', [0])) / max(len(away_last3.get('pointsAllowed', [0])), 1)

        features = {
            # Home team features
            'home_winPct': game['homeTeam']['winPct'],
            'home_ppg': game['homeTeam']['ppg'],
            'home_pag': game['homeTeam']['pag'],
            'home_yards_pg': game['homeTeam']['yardsPerGame'],
            'home_yards_allowed_pg': game['homeTeam']['yardsAllowedPerGame'],
            'home_turnover_diff': game['homeTeam']['turnoverDiff'],

            # Away team features
            'away_winPct': game['awayTeam']['winPct'],
            'away_ppg': game['awayTeam']['ppg'],
            'away_pag': game['awayTeam']['pag'],
            'away_yards_pg': game['awayTeam']['yardsPerGame'],
            'away_yards_allowed_pg': game['awayTeam']['yardsAllowedPerGame'],
            'away_turnover_diff': game['awayTeam']['turnoverDiff'],

            # Last 3 games
            'home_last3_ppf': home_last3_pf,
            'home_last3_ppa': home_last3_pa,
            'away_last3_ppf': away_last3_pf,
            'away_last3_ppa': away_last3_pa,

            # Rest days
            'home_rest_days': game['homeTeam'].get('restDays', 7),
            'away_rest_days': game['awayTeam'].get('restDays', 7),
            'rest_days_diff': game['matchup'].get('restDaysDiff', 0),

            # Derived features
            'ppg_differential': game['homeTeam']['ppg'] - game['awayTeam']['ppg'],
            'pag_differential': game['awayTeam']['pag'] - game['homeTeam']['pag'],
            'winPct_differential': game['homeTeam']['winPct'] - game['awayTeam']['winPct'],
            'yards_differential': game['homeTeam']['yardsPerGame'] - game['awayTeam']['yardsPerGame'],
            'turnover_differential': game['homeTeam']['turnoverDiff'] - game['awayTeam']['turnoverDiff'],

            # Matchup features
            'is_divisional': 1 if game['matchup']['isDivisional'] else 0,
            'is_conference': 1 if game['matchup']['isConference'] else 0,
            'is_thursday_night': 1 if game['matchup'].get('isThursdayNight', False) else 0,
            'is_monday_night': 1 if game['matchup'].get('isMondayNight', False) else 0,
            'is_sunday_night': 1 if game['matchup'].get('isSundayNight', False) else 0,

            # Weather features
            'temperature': game['weather']['temperature'],
            'wind_speed': game['weather']['windSpeed'],
            'precipitation': game['weather']['precipitation'],
            'is_dome': 1 if game['weather']['isDome'] else 0,
        }

        return features

    def predict_game(self, game):
        """
        Predict a single game and return recommendation.

        Returns:
            dict with prediction details and betting recommendation
        """
        # Extract features
        features = self.extract_features(game)
        X = pd.DataFrame([features])[self.feature_cols]

        # Make prediction
        predicted_spread = self.model.predict(X)[0]

        # Get Vegas line (if available)
        vegas_spread = None
        if 'lines' in game and game['lines']:
            vegas_spread = game['lines'].get('spread')

        # Calculate confidence
        confidence = None
        recommendation = None
        bet_side = None

        if vegas_spread is not None:
            confidence = abs(predicted_spread - vegas_spread)

            # Only recommend bet if confidence exceeds threshold
            if confidence >= self.confidence_threshold:
                if predicted_spread > vegas_spread:
                    # We predict home to win by MORE than Vegas
                    recommendation = 'BET'
                    bet_side = 'HOME'
                else:
                    # We predict home to win by LESS than Vegas (or lose by more)
                    recommendation = 'BET'
                    bet_side = 'AWAY'
            else:
                recommendation = 'PASS'
                bet_side = None

        return {
            'game_id': game.get('gameId'),
            'away_team': game['awayTeam']['name'],
            'home_team': game['homeTeam']['name'],
            'season': game.get('season'),
            'week': game.get('week'),
            'predicted_spread': float(round(predicted_spread, 1)),
            'vegas_spread': float(vegas_spread) if vegas_spread is not None else None,
            'confidence': float(round(confidence, 1)) if confidence is not None else None,
            'recommendation': recommendation,
            'bet_side': bet_side,
            'expected_win_rate': 0.581 if recommendation == 'BET' else None,  # Based on backtest
            'expected_roi': 0.119 if recommendation == 'BET' else None  # Based on backtest
        }

    def predict_multiple_games(self, games):
        """Predict multiple games and return betting recommendations"""
        predictions = []

        for game in games:
            prediction = self.predict_game(game)
            predictions.append(prediction)

        return predictions

    def print_recommendations(self, predictions):
        """Print betting recommendations in a nice format"""
        # Separate into bets and passes
        bets = [p for p in predictions if p['recommendation'] == 'BET']
        passes = [p for p in predictions if p['recommendation'] == 'PASS']

        print(f"\n{'='*80}")
        print(f"BETTING RECOMMENDATIONS (Confidence Threshold: {self.confidence_threshold} points)")
        print(f"{'='*80}")

        if bets:
            print(f"\n🎯 HIGH CONFIDENCE BETS ({len(bets)} games)")
            print(f"Expected Win Rate: 58.1% | Expected ROI: +11.9%")
            print(f"{'-'*80}")

            # Sort by confidence (highest first)
            bets_sorted = sorted(bets, key=lambda x: x['confidence'], reverse=True)

            for bet in bets_sorted:
                print(f"\n{'='*80}")
                print(f"🏈 {bet['away_team']} @ {bet['home_team']}")
                if bet.get('season') and bet.get('week'):
                    print(f"   Season: {bet['season']} | Week: {bet['week']}")

                print(f"\n   Vegas Spread: {bet['home_team']} {bet['vegas_spread']:+.1f}")
                print(f"   Our Prediction: {bet['home_team']} {bet['predicted_spread']:+.1f}")
                print(f"   Confidence: {bet['confidence']:.1f} points")

                print(f"\n   💰 RECOMMENDATION: BET {bet['bet_side']}")
                if bet['bet_side'] == 'HOME':
                    print(f"   → Bet on {bet['home_team']} to cover the spread")
                else:
                    print(f"   → Bet on {bet['away_team']} to cover the spread")

                print(f"\n   📊 Expected Performance:")
                print(f"   • Win Probability: 58.1%")
                print(f"   • Expected ROI: +11.9%")
        else:
            print(f"\n⚠️  NO HIGH CONFIDENCE BETS")
            print(f"No games meet the {self.confidence_threshold}-point confidence threshold.")

        if passes:
            print(f"\n\n❌ PASS ({len(passes)} games)")
            print(f"These games don't meet our confidence threshold:")
            print(f"{'-'*80}")

            for p in passes:
                diff = abs(p['predicted_spread'] - p['vegas_spread']) if p['vegas_spread'] is not None else None
                print(f"• {p['away_team']} @ {p['home_team']}")
                if diff is not None:
                    print(f"  Confidence: {diff:.1f} points (need {self.confidence_threshold}+)")

        print(f"\n{'='*80}")
        print(f"SUMMARY")
        print(f"{'='*80}")
        print(f"Total Games Analyzed: {len(predictions)}")
        print(f"High Confidence Bets: {len(bets)}")
        print(f"Pass: {len(passes)}")

        if bets:
            total_expected_units = len(bets) * 0.119  # Expected ROI per bet
            print(f"\nExpected Value: +{total_expected_units:.1f} units ({len(bets)} bets × 11.9% ROI)")


def main():
    """Main prediction workflow"""
    import argparse

    parser = argparse.ArgumentParser(
        description='NFL Betting Predictions with Confidence Filtering'
    )
    parser.add_argument(
        '--input',
        default='nfl_training_data_with_vegas.json',
        help='Input games JSON file'
    )
    parser.add_argument(
        '--output',
        help='Optional: Save predictions to JSON file'
    )
    parser.add_argument(
        '--threshold',
        type=float,
        help=f'Confidence threshold (default: {CONFIDENCE_THRESHOLD})'
    )

    args = parser.parse_args()

    # Override threshold if specified
    threshold = args.threshold if args.threshold else CONFIDENCE_THRESHOLD

    # Initialize predictor
    predictor = NFLPredictor()
    predictor.confidence_threshold = threshold

    # Load games
    print(f"\nLoading games from {args.input}...")
    with open(args.input, 'r') as f:
        dataset = json.load(f)
        games = dataset['data']

    print(f"✅ Loaded {len(games)} games")

    # Make predictions
    print(f"\nGenerating predictions...")
    predictions = predictor.predict_multiple_games(games)

    # Print recommendations
    predictor.print_recommendations(predictions)

    # Save to file if requested
    if args.output:
        output_data = {
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'model': 'spread_model_20251206_211858.pkl',
                'confidence_threshold': threshold,
                'expected_win_rate': 0.581,
                'expected_roi': 0.119,
                'total_games': len(predictions),
                'high_confidence_bets': len([p for p in predictions if p['recommendation'] == 'BET'])
            },
            'predictions': predictions
        }

        with open(args.output, 'w') as f:
            json.dump(output_data, f, indent=2)

        print(f"\n✅ Predictions saved to {args.output}")


if __name__ == '__main__':
    main()
