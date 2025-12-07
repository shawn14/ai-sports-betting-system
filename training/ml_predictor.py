#!/usr/bin/env python3
"""
ML Prediction Service
Uses trained XGBoost models to predict NFL game outcomes
"""

import json
import joblib
import numpy as np
from datetime import datetime
import sys
import os

class MLPredictor:
    """Wrapper for trained ML models"""

    def __init__(self, spread_model_path=None, total_model_path=None, features_path=None):
        """Load trained models"""

        # Auto-find latest models if not specified
        if spread_model_path is None:
            spread_model_path = self._find_latest_model('spread_model')
        if total_model_path is None:
            total_model_path = self._find_latest_model('total_model')
        if features_path is None:
            features_path = self._find_latest_model('feature_columns', ext='.json')

        print(f"Loading models...")
        print(f"  Spread: {spread_model_path}")
        print(f"  Total: {total_model_path}")
        print(f"  Features: {features_path}")

        self.spread_model = joblib.load(spread_model_path)
        self.total_model = joblib.load(total_model_path)

        with open(features_path, 'r') as f:
            self.feature_list = json.load(f)['features']

        print(f"✅ Models loaded successfully!")
        print(f"   Features: {len(self.feature_list)}")

    def _find_latest_model(self, prefix, ext='.pkl'):
        """Find the most recent model file"""
        files = [f for f in os.listdir('.') if f.startswith(prefix) and f.endswith(ext)]
        if not files:
            raise FileNotFoundError(f"No {prefix} model found")
        return sorted(files)[-1]  # Get most recent

    def predict(self, game_data):
        """
        Make prediction for a single game

        game_data should contain:
        {
            'homeTeam': {'winPct': 0.625, 'ppg': 24.5, ...},
            'awayTeam': {'winPct': 0.500, 'ppg': 21.3, ...},
            'matchup': {'isDivisional': False, ...},
            'weather': {'temperature': 72, 'windSpeed': 5, ...}
        }
        """

        # Extract features in the exact order the model expects
        features = self._extract_features(game_data)

        # Predict
        predicted_spread = self.spread_model.predict([features])[0]
        predicted_total = self.total_model.predict([features])[0]

        # Calculate individual scores from spread and total
        # spread = home - away
        # total = home + away
        # Solving: home = (total + spread) / 2, away = (total - spread) / 2
        predicted_home_score = (predicted_total + predicted_spread) / 2
        predicted_away_score = (predicted_total - predicted_spread) / 2

        return {
            'predicted_spread': round(predicted_spread, 1),
            'predicted_total': round(predicted_total, 1),
            'predicted_home_score': round(predicted_home_score, 1),
            'predicted_away_score': round(predicted_away_score, 1),
            'predicted_winner': 'home' if predicted_spread > 0 else 'away',
            'model_confidence': self._calculate_confidence(predicted_spread, predicted_total)
        }

    def _extract_features(self, game_data):
        """Extract features in correct order (33 features for Phase 1)"""
        home = game_data['homeTeam']
        away = game_data['awayTeam']
        matchup = game_data['matchup']
        weather = game_data['weather']

        # Calculate Phase 1: Last 3 games averages
        home_last3 = home.get('last3Games', {})
        away_last3 = away.get('last3Games', {})

        home_last3_pf = sum(home_last3.get('pointsScored', [0,0,0])) / 3
        home_last3_pa = sum(home_last3.get('pointsAllowed', [0,0,0])) / 3
        away_last3_pf = sum(away_last3.get('pointsScored', [0,0,0])) / 3
        away_last3_pa = sum(away_last3.get('pointsAllowed', [0,0,0])) / 3

        features = [
            # Team stats (12 features)
            home['winPct'],
            home['ppg'],
            home['pag'],
            home['yardsPerGame'],
            home['yardsAllowedPerGame'],
            home['turnoverDiff'],

            away['winPct'],
            away['ppg'],
            away['pag'],
            away['yardsPerGame'],
            away['yardsAllowedPerGame'],
            away['turnoverDiff'],

            # Phase 1: Last 3 games (4 features)
            home_last3_pf,
            home_last3_pa,
            away_last3_pf,
            away_last3_pa,

            # Phase 1: Rest days (3 features)
            home.get('restDays', 7),
            away.get('restDays', 7),
            matchup.get('restDaysDiff', 0),

            # Derived features (5 features)
            home['ppg'] - away['ppg'],  # ppg_differential
            away['pag'] - home['pag'],  # pag_differential (lower is better)
            home['winPct'] - away['winPct'],  # winPct_differential
            home['yardsPerGame'] - away['yardsPerGame'],  # yards_differential
            home['turnoverDiff'] - away['turnoverDiff'],  # turnover_differential

            # Matchup flags (2 features)
            1 if matchup['isDivisional'] else 0,
            1 if matchup['isConference'] else 0,

            # Phase 1: Prime time (3 features)
            1 if matchup.get('isThursdayNight', False) else 0,
            1 if matchup.get('isMondayNight', False) else 0,
            1 if matchup.get('isSundayNight', False) else 0,

            # Weather (4 features)
            weather['temperature'],
            weather['windSpeed'],
            weather['precipitation'],
            1 if weather['isDome'] else 0
        ]

        return features

    def _calculate_confidence(self, spread, total):
        """
        Calculate confidence score based on prediction strength
        Higher spreads and more extreme totals = higher confidence
        """
        # Confidence increases with spread magnitude
        spread_confidence = min(abs(spread) / 14.0, 1.0) * 100  # 14 point spread = 100% confident

        # Confidence for totals (extreme values are more confident)
        total_deviation = abs(total - 45)  # 45 is average NFL total
        total_confidence = min(total_deviation / 15.0, 1.0) * 100

        # Average the two
        confidence = (spread_confidence * 0.7 + total_confidence * 0.3)

        # Scale to 50-95 range (never show 100% or <50%)
        confidence = 50 + (confidence * 0.45)

        return round(confidence, 1)

    def compare_to_vegas(self, prediction, vegas_spread, vegas_total=None):
        """
        Compare ML prediction to Vegas lines
        Returns edge analysis
        """
        spread_edge = prediction['predicted_spread'] - vegas_spread

        result = {
            'ml_spread': prediction['predicted_spread'],
            'vegas_spread': vegas_spread,
            'spread_edge': round(spread_edge, 1),
            'edge_direction': 'home' if spread_edge > 0 else 'away',
            'edge_magnitude': abs(round(spread_edge, 1)),
            'betting_recommendation': self._get_recommendation(spread_edge)
        }

        if vegas_total:
            total_edge = prediction['predicted_total'] - vegas_total
            result['ml_total'] = prediction['predicted_total']
            result['vegas_total'] = vegas_total
            result['total_edge'] = round(total_edge, 1)
            result['total_recommendation'] = 'OVER' if total_edge > 3 else 'UNDER' if total_edge < -3 else 'PASS'

        return result

    def _get_recommendation(self, edge):
        """Determine betting recommendation based on edge"""
        abs_edge = abs(edge)

        if abs_edge >= 4:
            return 'STRONG BET'
        elif abs_edge >= 2.5:
            return 'GOOD BET'
        elif abs_edge >= 1.5:
            return 'SLIGHT EDGE'
        else:
            return 'NO EDGE'


def main():
    """CLI interface for making predictions"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python ml_predictor.py <game_data.json>")
        print("  python ml_predictor.py --test")
        sys.exit(1)

    # Initialize predictor
    predictor = MLPredictor()

    if sys.argv[1] == '--test':
        # Test with sample data
        print("\n" + "="*60)
        print("TESTING ML PREDICTOR")
        print("="*60)

        sample_game = {
            'homeTeam': {
                'name': 'Kansas City Chiefs',
                'winPct': 0.714,
                'ppg': 26.8,
                'pag': 19.2,
                'yardsPerGame': 375.5,
                'yardsAllowedPerGame': 325.3,
                'turnoverDiff': 0.5
            },
            'awayTeam': {
                'name': 'Buffalo Bills',
                'winPct': 0.643,
                'ppg': 25.1,
                'pag': 21.4,
                'yardsPerGame': 368.2,
                'yardsAllowedPerGame': 340.1,
                'turnoverDiff': 0.3
            },
            'matchup': {
                'isDivisional': False,
                'isConference': True
            },
            'weather': {
                'temperature': 35,
                'windSpeed': 12,
                'precipitation': 0,
                'isDome': False
            }
        }

        prediction = predictor.predict(sample_game)

        print(f"\nGame: {sample_game['awayTeam']['name']} @ {sample_game['homeTeam']['name']}")
        print(f"\nML Prediction:")
        print(f"  Spread: {prediction['predicted_spread']:+.1f} (home)")
        print(f"  Total: {prediction['predicted_total']:.1f}")
        print(f"  Score: {sample_game['awayTeam']['name']} {prediction['predicted_away_score']:.0f}, {sample_game['homeTeam']['name']} {prediction['predicted_home_score']:.0f}")
        print(f"  Winner: {prediction['predicted_winner'].upper()}")
        print(f"  Confidence: {prediction['model_confidence']:.1f}%")

        # Compare to sample Vegas line
        vegas_spread = -2.5  # Chiefs -2.5
        vegas_total = 47.5

        comparison = predictor.compare_to_vegas(prediction, vegas_spread, vegas_total)

        print(f"\nVegas Comparison:")
        print(f"  Vegas Spread: {vegas_spread:+.1f}")
        print(f"  ML Edge: {comparison['spread_edge']:+.1f} points")
        print(f"  Recommendation: {comparison['betting_recommendation']}")
        print(f"  Vegas Total: {vegas_total}")
        print(f"  Total Edge: {comparison['total_edge']:+.1f}")
        print(f"  Total Rec: {comparison['total_recommendation']}")

    else:
        # Load game data from JSON
        with open(sys.argv[1], 'r') as f:
            game_data = json.load(f)

        prediction = predictor.predict(game_data)

        # Output as JSON for easy integration
        print(json.dumps(prediction, indent=2))


if __name__ == '__main__':
    main()
