#!/usr/bin/env python3
"""
Batch Prediction Script
Processes all 832 historical games through ML models to generate predictions and calculate accuracy
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
    """Load 832 games from training data JSON"""
    print(f"📂 Loading training data from: {json_path}")

    with open(json_path, 'r') as f:
        data = json.load(f)

    games = data['data']
    print(f"✅ Loaded {len(games)} games")
    print(f"   Seasons: {min(g['season'] for g in games)} - {max(g['season'] for g in games)}")
    print(f"   Weeks: {min(g['week'] for g in games)} - {max(g['week'] for g in games)}")

    return games


def convert_to_predictor_format(training_game):
    """
    Convert training data format to ML predictor input format

    Training format has: homeTeam, awayTeam, matchup, weather, outcome
    Predictor needs: homeTeam, awayTeam, matchup, weather (same structure!)
    """
    # The formats are already compatible! Just pass through
    return {
        'homeTeam': training_game['homeTeam'],
        'awayTeam': training_game['awayTeam'],
        'matchup': training_game['matchup'],
        'weather': training_game['weather']
    }


def calculate_accuracy(prediction, actual_outcome):
    """
    Calculate prediction accuracy metrics vs actual outcome

    Returns:
    - spread_error: Absolute error in spread prediction
    - total_error: Absolute error in total prediction
    - winner_correct: Did we predict the winner correctly?
    - spread_covered: Did the predicted spread beat the actual spread? (ATS)
    - home_score_error: Absolute error in home team score
    - away_score_error: Absolute error in away team score
    """

    # Spread error
    spread_error = abs(prediction['predicted_spread'] - actual_outcome['actualSpread'])

    # Total error
    actual_total = actual_outcome['homeScore'] + actual_outcome['awayScore']
    total_error = abs(prediction['predicted_total'] - actual_total)

    # Winner prediction
    predicted_home_wins = prediction['predicted_winner'] == 'home'
    actual_home_wins = actual_outcome['homeWon']
    winner_correct = (predicted_home_wins == actual_home_wins)

    # ATS (Against The Spread)
    # If we predicted home by more than actual spread, we would have bet home and lost
    # If we predicted home by less than actual spread, we would have bet away and won
    # This is a simplified check - real ATS needs Vegas line comparison
    spread_covered = (
        (prediction['predicted_spread'] > 0 and actual_outcome['actualSpread'] > 0) or
        (prediction['predicted_spread'] < 0 and actual_outcome['actualSpread'] < 0)
    )

    # Individual score errors
    home_score_error = abs(prediction['predicted_home_score'] - actual_outcome['homeScore'])
    away_score_error = abs(prediction['predicted_away_score'] - actual_outcome['awayScore'])

    return {
        'spread_error': round(spread_error, 2),
        'total_error': round(total_error, 2),
        'winner_correct': winner_correct,
        'spread_covered': spread_covered,
        'home_score_error': round(home_score_error, 2),
        'away_score_error': round(away_score_error, 2)
    }


def batch_predict_all_games(training_data, predictor):
    """
    Loop through 832 games and predict each one
    Returns list of results with predictions and accuracy metrics
    """
    print(f"\n🔮 Starting batch predictions on {len(training_data)} games...")

    results = []
    errors = []

    for idx, game in enumerate(training_data):
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

            # Progress update every 100 games
            if (idx + 1) % 100 == 0:
                print(f"   Processed {idx + 1}/{len(training_data)} games...")

        except Exception as e:
            error_msg = f"Error on game {game['gameId']} ({game['awayTeam']['name']} @ {game['homeTeam']['name']}): {str(e)}"
            errors.append(error_msg)
            print(f"   ⚠️  {error_msg}")

    print(f"\n✅ Batch predictions complete!")
    print(f"   Successful: {len(results)}")
    print(f"   Errors: {len(errors)}")

    if errors:
        print(f"\n❌ Errors encountered:")
        for error in errors[:10]:  # Show first 10 errors
            print(f"   - {error}")

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

    # Spread covered (ATS-like)
    spread_covered = sum(1 for r in results if r['accuracy']['spread_covered'])
    ats_rate = (spread_covered / total_games) * 100

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
        'ats_rate_pct': round(ats_rate, 2),
        'avg_home_score_error': round(avg_home_score_error, 2),
        'avg_away_score_error': round(avg_away_score_error, 2),
        'winner_correct_count': winner_correct,
        'spread_covered_count': spread_covered
    }


def export_to_json(results, stats, errors, output_path):
    """Save batch predictions to JSON for Firebase import"""

    output_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_games': len(results),
            'total_errors': len(errors),
            'model_version': 'xgboost_v1',
            'data_source': 'nfl_training_data_2024_2023_2022_2021'
        },
        'summary_stats': stats,
        'predictions': results,
        'errors': errors
    }

    print(f"\n💾 Saving results to: {output_path}")

    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2, cls=NumpyEncoder)

    # Get file size
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"✅ File saved successfully! ({file_size_mb:.2f} MB)")

    return output_path


def print_summary_report(stats):
    """Print a nice summary report"""

    print("\n" + "="*70)
    print("📊 BATCH PREDICTION SUMMARY")
    print("="*70)

    print(f"\n🎯 Overall Performance:")
    print(f"   Total Games:           {stats['total_games']}")
    print(f"   Winner Accuracy:       {stats['winner_accuracy_pct']:.2f}% ({stats['winner_correct_count']}/{stats['total_games']})")
    print(f"   ATS Rate:              {stats['ats_rate_pct']:.2f}% ({stats['spread_covered_count']}/{stats['total_games']})")

    print(f"\n📏 Prediction Errors (MAE):")
    print(f"   Spread Error:          {stats['avg_spread_error']:.2f} points")
    print(f"   Total Error:           {stats['avg_total_error']:.2f} points")
    print(f"   Home Score Error:      {stats['avg_home_score_error']:.2f} points")
    print(f"   Away Score Error:      {stats['avg_away_score_error']:.2f} points")

    print(f"\n💡 Profitability Analysis:")
    ats_pct = stats['ats_rate_pct']
    breakeven = 52.38

    if ats_pct >= 54:
        profit_status = "🟢 PROFITABLE"
    elif ats_pct >= breakeven:
        profit_status = "🟡 BREAKEVEN"
    else:
        profit_status = "🔴 LOSING"

    print(f"   Status: {profit_status}")
    print(f"   Breakeven: {breakeven}% (to beat -110 vig)")

    if ats_pct > breakeven:
        # Calculate approximate ROI
        edge = ats_pct - breakeven
        roi_estimate = edge * 2  # Rough estimate: 1% edge ≈ 2% ROI
        print(f"   Edge: +{edge:.2f}%")
        print(f"   Est. ROI: ~{roi_estimate:.1f}%")

    print("\n" + "="*70)


def main():
    """Main execution"""

    if len(sys.argv) < 2:
        print("Usage: python batch_predict.py <training_data.json> [output.json]")
        print("\nExample:")
        print("  python batch_predict.py ~/Desktop/nfl_training_data_2024_2023_2022_2021_1765055408002.json")
        sys.exit(1)

    # Input/output paths
    training_data_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'batch_predictions_832_games.json'

    print("="*70)
    print("🚀 NFL BATCH PREDICTION SYSTEM")
    print("="*70)
    print(f"Input:  {training_data_path}")
    print(f"Output: {output_path}")
    print("="*70)

    try:
        # Step 1: Load training data
        training_data = load_training_data(training_data_path)

        # Step 2: Initialize ML predictor
        print(f"\n🤖 Initializing ML predictor...")
        predictor = MLPredictor()

        # Step 3: Batch predict all games
        results, errors = batch_predict_all_games(training_data, predictor)

        # Step 4: Calculate summary statistics
        print(f"\n📊 Calculating summary statistics...")
        stats = calculate_summary_stats(results)

        # Step 5: Export to JSON
        export_to_json(results, stats, errors, output_path)

        # Step 6: Print summary report
        print_summary_report(stats)

        print(f"\n✅ All done! Results saved to: {output_path}")
        print(f"📌 Next step: Import to Firebase using import_to_firebase.py")

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
