#!/usr/bin/env python3
"""
Calculate true ATS (Against The Spread) performance
Combines model predictions with historical Vegas spreads
"""

import json

def calculate_ats_performance():
    """
    Calculate ATS win rate by comparing predictions to Vegas spreads
    """
    print("="*70)
    print("📊 CALCULATING TRUE ATS PERFORMANCE")
    print("="*70)

    # Load predictions
    print("\n📂 Loading predictions...")
    with open('2025_season_predictions.json', 'r') as f:
        pred_data = json.load(f)

    predictions = pred_data['predictions']
    print(f"✅ Loaded {len(predictions)} predictions")

    # Load Vegas spreads
    print("\n📂 Loading Vegas spreads...")
    with open('nfl_training_data_2025_with_vegas.json', 'r') as f:
        vegas_data = json.load(f)

    # Create lookup by game ID
    vegas_spreads = {}
    for game in vegas_data['data']:
        if 'lines' in game and game['lines']:
            vegas_spreads[game['gameId']] = {
                'spread': game['lines']['spread'],
                'total': game['lines']['total']
            }

    print(f"✅ Loaded Vegas spreads for {len(vegas_spreads)} games")

    # Match predictions to Vegas spreads
    matched = 0
    ats_wins = 0
    ats_losses = 0
    ats_pushes = 0

    detailed_results = []

    for pred in predictions:
        if not pred['completed']:
            continue  # Skip upcoming games

        game_id = pred['game_id']

        if game_id not in vegas_spreads:
            continue  # Skip if no Vegas spread available

        matched += 1

        # Get values
        predicted_spread = pred['predicted_spread']
        vegas_spread = vegas_spreads[game_id]['spread']
        actual_spread = pred['actual_spread']

        # Calculate ATS result
        # If we predict home team to cover (beat Vegas spread)
        # Vegas spread is from home team perspective (+ = home favored)
        # Predicted spread is from home team perspective

        # Model prediction vs Vegas
        model_home_cover = predicted_spread > vegas_spread

        # Actual result vs Vegas
        actual_home_cover = actual_spread > vegas_spread

        # Did we pick the right side?
        if abs(actual_spread - vegas_spread) < 0.5:
            # Push
            ats_pushes += 1
            result = "PUSH"
        elif model_home_cover == actual_home_cover:
            # Win
            ats_wins += 1
            result = "WIN"
        else:
            # Loss
            ats_losses += 1
            result = "LOSS"

        detailed_results.append({
            'game_id': game_id,
            'week': pred['week'],
            'matchup': f"{pred['away_team']} @ {pred['home_team']}",
            'predicted_spread': predicted_spread,
            'vegas_spread': vegas_spread,
            'actual_spread': actual_spread,
            'result': result,
            'home_score': pred['actual_home_score'],
            'away_score': pred['actual_away_score']
        })

    # Calculate metrics
    total_bets = ats_wins + ats_losses + ats_pushes
    win_rate = (ats_wins / (ats_wins + ats_losses) * 100) if (ats_wins + ats_losses) > 0 else 0

    # ROI calculation (assuming -110 odds)
    # Win: +$100, Loss: -$110
    total_wagered = (ats_wins + ats_losses) * 110
    profit = (ats_wins * 100) - (ats_losses * 110)
    roi = (profit / total_wagered * 100) if total_wagered > 0 else 0

    # Breakeven at -110 is 52.38%
    breakeven = 52.38
    edge = win_rate - breakeven

    # Display results
    print("\n" + "="*70)
    print("📈 ATS PERFORMANCE RESULTS")
    print("="*70)

    print(f"\nTotal Matched Games: {matched}")
    print(f"Total Bets: {total_bets}")
    print(f"\nATS Record: {ats_wins}-{ats_losses}-{ats_pushes}")
    print(f"ATS Win Rate: {win_rate:.2f}%")
    print(f"Breakeven (at -110): {breakeven}%")
    print(f"Edge: {edge:+.2f}%")
    print(f"\nEstimated ROI: {roi:+.2f}%")
    print(f"Estimated Profit (per $110 unit): ${profit:+.0f}")

    # Statistical significance
    # Binomial test: is this significantly better than 50%?
    try:
        from scipy import stats
        # Use binomtest (newer) or binom_test (older) depending on scipy version
        if hasattr(stats, 'binomtest'):
            result = stats.binomtest(ats_wins, ats_wins + ats_losses, 0.5, alternative='greater')
            p_value = result.pvalue
        else:
            p_value = stats.binom_test(ats_wins, ats_wins + ats_losses, 0.5, alternative='greater')

        print(f"\nStatistical Significance (vs 50%): p = {p_value:.4f}")
        if p_value < 0.05:
            print("✅ Statistically significant edge (p < 0.05)")
        else:
            print("⚠️  Not statistically significant (need more data)")
    except Exception as e:
        print(f"\n⚠️  Could not calculate statistical significance: {e}")
        p_value = None

    # Show some example bets
    print("\n" + "="*70)
    print("📋 SAMPLE RESULTS (First 10)")
    print("="*70)

    for i, res in enumerate(detailed_results[:10]):
        print(f"\nWeek {res['week']}: {res['matchup']}")
        print(f"  Model: {res['predicted_spread']:+.1f} | Vegas: {res['vegas_spread']:+.1f} | Actual: {res['actual_spread']:+.1f}")
        print(f"  Score: {res['away_score']}-{res['home_score']} | Result: {res['result']}")

    # Save detailed results
    output = {
        'metadata': {
            'total_matched': matched,
            'total_bets': total_bets
        },
        'performance': {
            'ats_wins': ats_wins,
            'ats_losses': ats_losses,
            'ats_pushes': ats_pushes,
            'win_rate': win_rate,
            'breakeven': breakeven,
            'edge': edge,
            'roi': roi,
            'profit_per_110_unit': profit,
            'p_value': float(p_value) if p_value is not None else None,
            'statistically_significant': bool(p_value < 0.05) if p_value is not None else None
        },
        'detailed_results': detailed_results
    }

    with open('ats_performance_2025.json', 'w') as f:
        json.dump(output, f, indent=2)

    print("\n" + "="*70)
    print(f"💾 Saved detailed results to ats_performance_2025.json")
    print("="*70)

    return output

if __name__ == '__main__':
    try:
        from scipy import stats
    except ImportError:
        print("⚠️  scipy not installed, skipping statistical significance test")
        print("   Install with: pip install scipy")
        import sys
        sys.exit(1)

    calculate_ats_performance()
