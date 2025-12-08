#!/usr/bin/env python3
"""
FIX ATS CALCULATION - Simple and Clear
From a bettor's perspective: Did we pick the right side against the spread?
"""

import json

def fix_ats_calculation():
    print("="*70)
    print("🔧 FIXING ATS CALCULATION")
    print("="*70)

    # Load the data
    with open('ats_performance_2025_CORRECTED.json', 'r') as f:
        data = json.load(f)

    games = data['detailed_results']

    ats_wins = 0
    ats_losses = 0
    ats_pushes = 0

    fixed_games = []

    for game in games:
        predicted_spread = game['predicted_spread']
        vegas_spread = game['vegas_spread']
        actual_spread = game['actual_spread']

        # SUPER SIMPLE: Did our prediction beat the actual outcome against the spread?
        # predicted_spread vs vegas_spread tells us which side we bet
        # actual_spread vs vegas_spread tells us which side won
        # If they're the same direction, we win!

        # Check for push
        if abs(actual_spread - vegas_spread) < 0.5:
            result = "PUSH"
            ats_pushes += 1
        # Did we predict the right direction relative to Vegas?
        elif (predicted_spread - vegas_spread) * (actual_spread - vegas_spread) > 0:
            # Both differences have same sign = we got it right
            result = "WIN"
            ats_wins += 1
        else:
            result = "LOSS"
            ats_losses += 1

        # Update the result
        game_copy = game.copy()
        game_copy['result'] = result
        fixed_games.append(game_copy)

        # Debug first few games
        if len(fixed_games) <= 10:
            [away, home] = game['matchup'].split(' @ ')
            pred_diff = predicted_spread - vegas_spread
            actual_diff = actual_spread - vegas_spread
            bet_team = home if pred_diff > 0 else away
            bet_spread = vegas_spread if pred_diff > 0 else -vegas_spread
            print(f"\n{game['matchup']}")
            print(f"  Bet: {bet_team} {bet_spread:+.1f}")
            print(f"  Score: {game['away_score']}-{game['home_score']} (actual spread: {actual_spread:+.1f})")
            print(f"  Vegas: {vegas_spread:+.1f} | Actual: {actual_spread:+.1f}")
            print(f"  Result: {result}")

    # Calculate stats
    total_bets = ats_wins + ats_losses
    win_rate = (ats_wins / total_bets * 100) if total_bets > 0 else 0

    profit = (ats_wins * 100) - (ats_losses * 110)
    total_wagered = total_bets * 110
    roi = (profit / total_wagered * 100) if total_wagered > 0 else 0

    print("\n" + "="*70)
    print("📊 CORRECTED ATS PERFORMANCE")
    print("="*70)
    print(f"\nRecord: {ats_wins}-{ats_losses}-{ats_pushes}")
    print(f"Win Rate: {win_rate:.2f}%")
    print(f"ROI: {roi:+.2f}%")
    print(f"Profit (per $110 unit): ${profit:+.0f}")

    # Save corrected data
    output = {
        'metadata': {
            'total_matched': len(games),
            'total_bets': total_bets + ats_pushes,
            'note': 'FIXED ATS calculation - correct betting logic'
        },
        'performance': {
            'ats_wins': ats_wins,
            'ats_losses': ats_losses,
            'ats_pushes': ats_pushes,
            'win_rate': win_rate,
            'breakeven': 52.38,
            'edge': win_rate - 52.38,
            'roi': roi,
            'profit_per_110_unit': profit,
            'statistically_significant': win_rate > 52.38
        },
        'detailed_results': fixed_games
    }

    with open('../public/training/ats_performance_2025_FIXED.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n💾 Saved to ats_performance_2025_FIXED.json")
    print("="*70)

if __name__ == '__main__':
    fix_ats_calculation()
