#!/usr/bin/env python3
"""
Test Set Predictions
Predict only on the held-out test set (last 20% of games)
to get true out-of-sample performance
"""

import json
import sys
import os
import numpy as np
from datetime import datetime
from ml_predictor import MLPredictor


class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder for numpy types"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


def load_training_data(json_path):
    """Load training data JSON"""
    print(f"📂 Loading training data from: {json_path}")

    with open(json_path, 'r') as f:
        data = json.load(f)

    games = data['data']
    print(f"✅ Loaded {len(games)} total games")

    return games


def split_train_test(games, test_split=0.2):
    """
    Split games temporally (last 20% for testing)
    Matches the split used in train_model.py
    """
    total_games = len(games)
    train_size = int(total_games * (1 - test_split))

    train_games = games[:train_size]
    test_games = games[train_size:]

    print(f"\n📊 Data Split:")
    print(f"   Training: {len(train_games)} games (indices 0-{train_size-1})")
    print(f"   Test: {len(test_games)} games (indices {train_size}-{total_games-1})")

    return train_games, test_games


def convert_to_predictor_format(training_game):
    """Convert training data format to ML predictor input format"""
    return {
        'homeTeam': training_game['homeTeam'],
        'awayTeam': training_game['awayTeam'],
        'matchup': training_game['matchup'],
        'weather': training_game['weather']
    }


def calculate_accuracy(prediction, actual_outcome):
    """Calculate prediction accuracy metrics vs actual outcome"""

    # Spread error
    spread_error = abs(prediction['predicted_spread'] - actual_outcome['actualSpread'])

    # Total error
    actual_total = actual_outcome['homeScore'] + actual_outcome['awayScore']
    total_error = abs(prediction['predicted_total'] - actual_total)

    # Winner prediction
    predicted_home_wins = prediction['predicted_winner'] == 'home'
    actual_home_wins = actual_outcome['homeWon']
    winner_correct = (predicted_home_wins == actual_home_wins)

    # Individual score errors
    home_score_error = abs(prediction['predicted_home_score'] - actual_outcome['homeScore'])
    away_score_error = abs(prediction['predicted_away_score'] - actual_outcome['awayScore'])

    return {
        'spread_error': round(spread_error, 2),
        'total_error': round(total_error, 2),
        'winner_correct': winner_correct,
        'home_score_error': round(home_score_error, 2),
        'away_score_error': round(away_score_error, 2)
    }


def predict_test_set(test_games, predictor):
    """Predict only on test set games"""
    print(f"\n🔮 Predicting on {len(test_games)} test games...")

    results = []
    errors = []

    for idx, game in enumerate(test_games):
        try:
            # Convert to predictor format
            input_data = convert_to_predictor_format(game)

            # Generate prediction
            prediction = predictor.predict(input_data)

            # Calculate accuracy vs actual outcome
            accuracy = calculate_accuracy(prediction, game['outcome'])

            # Build result object
            result = {
                'gameId': game['gameId'],
                'season': game['season'],
                'week': game['week'],
                'homeTeam': game['homeTeam']['name'],
                'awayTeam': game['awayTeam']['name'],

                # Prediction
                'prediction': prediction,

                # Actual outcome
                'actual': {
                    'homeScore': game['outcome']['homeScore'],
                    'awayScore': game['outcome']['awayScore'],
                    'actualSpread': game['outcome']['actualSpread'],
                    'actualTotal': game['outcome']['homeScore'] + game['outcome']['awayScore'],
                    'homeWon': game['outcome']['homeWon']
                },

                # Accuracy metrics
                'accuracy': accuracy
            }

            results.append(result)

            # Progress update
            if (idx + 1) % 50 == 0:
                print(f"   Processed {idx + 1}/{len(test_games)} games...")

        except Exception as e:
            error_msg = f"Error on game {game['gameId']}: {str(e)}"
            errors.append(error_msg)
            print(f"   ⚠️  {error_msg}")

    print(f"\n✅ Test predictions complete!")
    print(f"   Successful: {len(results)}")
    print(f"   Errors: {len(errors)}")

    return results, errors


def calculate_summary_stats(results):
    """Calculate overall performance statistics"""

    total_games = len(results)

    # Spread metrics
    spread_errors = [r['accuracy']['spread_error'] for r in results]
    avg_spread_error = sum(spread_errors) / len(spread_errors)

    # Total metrics
    total_errors = [r['accuracy']['total_error'] for r in results]
    avg_total_error = sum(total_errors) / len(total_errors)

    # Winner accuracy
    winner_correct = sum(1 for r in results if r['accuracy']['winner_correct'])
    winner_accuracy = (winner_correct / total_games) * 100

    # Score errors
    home_score_errors = [r['accuracy']['home_score_error'] for r in results]
    away_score_errors = [r['accuracy']['away_score_error'] for r in results]
    avg_home_score_error = sum(home_score_errors) / len(home_score_errors)
    avg_away_score_error = sum(away_score_errors) / len(away_score_errors)

    return {
        'total_games': total_games,
        'avg_spread_error': round(avg_spread_error, 2),
        'avg_total_error': round(avg_total_error, 2),
        'winner_accuracy_pct': round(winner_accuracy, 2),
        'avg_home_score_error': round(avg_home_score_error, 2),
        'avg_away_score_error': round(avg_away_score_error, 2),
        'winner_correct_count': winner_correct
    }


def print_summary_report(stats):
    """Print a nice summary report"""

    print("\n" + "="*70)
    print("📊 TEST SET PERFORMANCE (Out-of-Sample)")
    print("="*70)

    print(f"\n🎯 Overall Performance:")
    print(f"   Test Games:            {stats['total_games']}")
    print(f"   Winner Accuracy:       {stats['winner_accuracy_pct']:.2f}% ({stats['winner_correct_count']}/{stats['total_games']})")

    print(f"\n📏 Prediction Errors (MAE):")
    print(f"   Spread Error:          {stats['avg_spread_error']:.2f} points")
    print(f"   Total Error:           {stats['avg_total_error']:.2f} points")
    print(f"   Home Score Error:      {stats['avg_home_score_error']:.2f} points")
    print(f"   Away Score Error:      {stats['avg_away_score_error']:.2f} points")

    print(f"\n💡 Analysis:")
    winner_acc = stats['winner_accuracy_pct']

    if winner_acc >= 60:
        status = "🟢 EXCELLENT"
    elif winner_acc >= 55:
        status = "🟡 GOOD"
    elif winner_acc >= 50:
        status = "🟠 MARGINAL"
    else:
        status = "🔴 POOR"

    print(f"   Status: {status}")
    print(f"   NFL average: ~55% (home team wins)")

    if stats['avg_spread_error'] < 10:
        print(f"   Spread prediction: 🟢 EXCELLENT (<10 pts)")
    elif stats['avg_spread_error'] < 12:
        print(f"   Spread prediction: 🟡 GOOD (<12 pts)")
    else:
        print(f"   Spread prediction: 🔴 NEEDS IMPROVEMENT (>12 pts)")

    print("\n" + "="*70)


def export_to_json(results, stats, errors, output_path):
    """Save test predictions to JSON"""

    output_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'test_games': len(results),
            'total_errors': len(errors),
            'model_version': 'xgboost_phase1_v1',
            'data_type': 'test_set_only'
        },
        'summary_stats': stats,
        'predictions': results,
        'errors': errors
    }

    print(f"\n💾 Saving results to: {output_path}")

    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2, cls=NumpyEncoder)

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"✅ File saved successfully! ({file_size_mb:.2f} MB)")


def main():
    """Main execution"""

    if len(sys.argv) < 2:
        print("Usage: python test_predictions.py <training_data.json> [output.json]")
        print("\nExample:")
        print("  python test_predictions.py nfl_training_data_2024_2023_2022_2021.json")
        sys.exit(1)

    # Input/output paths
    training_data_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'test_set_predictions.json'

    print("="*70)
    print("🧪 TEST SET PREDICTION SYSTEM")
    print("="*70)
    print(f"Input:  {training_data_path}")
    print(f"Output: {output_path}")
    print("="*70)

    try:
        # Step 1: Load data
        all_games = load_training_data(training_data_path)

        # Step 2: Split into train/test (only use test)
        train_games, test_games = split_train_test(all_games, test_split=0.2)

        # Step 3: Initialize ML predictor
        print(f"\n🤖 Initializing ML predictor...")
        predictor = MLPredictor()

        # Step 4: Predict on test set only
        results, errors = predict_test_set(test_games, predictor)

        # Step 5: Calculate summary statistics
        print(f"\n📊 Calculating summary statistics...")
        stats = calculate_summary_stats(results)

        # Step 6: Export to JSON
        export_to_json(results, stats, errors, output_path)

        # Step 7: Print summary report
        print_summary_report(stats)

        print(f"\n✅ All done! Test set results saved to: {output_path}")
        print(f"\n📌 This represents TRUE out-of-sample performance!")
        print(f"   The model was NOT trained on these {len(test_games)} games.")

    except FileNotFoundError as e:
        print(f"\n❌ Error: File not found - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
