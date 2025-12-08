#!/usr/bin/env python3
"""
Add Over/Under predictions and results to the ATS analysis
"""

import json
import joblib

def add_totals_analysis():
    print("="*70)
    print("🎯 ADDING OVER/UNDER ANALYSIS")
    print("="*70)

    # Load the latest total model
    print("\n📂 Loading total prediction model...")
    total_model = joblib.load('total_model_20251206_211858.pkl')
    with open('feature_columns_20251206_211858.json', 'r') as f:
        feature_list = json.load(f)['features']
    print(f"✅ Loaded model with {len(feature_list)} features")

    # Load training data with Vegas lines
    print("\n📂 Loading training data with Vegas totals...")
    with open('../public/training/nfl_training_data_2025_with_vegas.json', 'r') as f:
        training_data = json.load(f)

    # Load current fixed ATS data
    print("\n📂 Loading current ATS results...")
    with open('../public/training/ats_performance_2025_FIXED.json', 'r') as f:
        ats_data = json.load(f)

    # Create game lookup by ID
    games_by_id = {game['gameId']: game for game in training_data['data']}

    # Track totals performance
    total_wins = 0
    total_losses = 0
    total_pushes = 0

    # Track moneyline performance
    ml_wins = 0
    ml_losses = 0

    # Enhanced results with totals
    enhanced_results = []

    for result in ats_data['detailed_results']:
        game_id = result['game_id']

        if game_id not in games_by_id:
            continue

        game = games_by_id[game_id]

        # Check if we have Vegas total
        if 'lines' not in game or not game['lines'] or 'total' not in game['lines']:
            continue

        vegas_total = game['lines']['total']
        actual_total = game['outcome']['actualTotal']

        # Make prediction using the model
        # Extract features (same as training)
        features = extract_features(game, feature_list)
        predicted_total = total_model.predict([features])[0]

        # Calculate O/U result
        # If predicted_total > vegas_total, we bet OVER
        # If predicted_total < vegas_total, we bet UNDER

        if abs(actual_total - vegas_total) < 0.5:
            ou_result = "PUSH"
            total_pushes += 1
        elif (predicted_total - vegas_total) * (actual_total - vegas_total) > 0:
            # Both differences same sign = correct
            ou_result = "WIN"
            total_wins += 1
        else:
            ou_result = "LOSS"
            total_losses += 1

        # Determine what we bet
        ou_pick = "OVER" if predicted_total > vegas_total else "UNDER"

        # Calculate Moneyline result (straight up winner)
        # predicted_spread > 0 means we pick home, < 0 means we pick away
        predicted_winner = "home" if result['predicted_spread'] > 0 else "away"
        actual_winner = "home" if result['actual_spread'] > 0 else "away"

        if predicted_winner == actual_winner:
            ml_result = "WIN"
            ml_wins += 1
        else:
            ml_result = "LOSS"
            ml_losses += 1

        # Add to result
        enhanced_result = result.copy()
        enhanced_result['predicted_total'] = float(round(predicted_total, 1))
        enhanced_result['vegas_total'] = float(vegas_total)
        enhanced_result['actual_total'] = float(actual_total)
        enhanced_result['ou_pick'] = ou_pick
        enhanced_result['ou_result'] = ou_result
        enhanced_result['ml_pick'] = predicted_winner
        enhanced_result['ml_result'] = ml_result

        enhanced_results.append(enhanced_result)

    # Calculate totals stats
    total_bets = total_wins + total_losses
    ou_win_rate = (total_wins / total_bets * 100) if total_bets > 0 else 0
    ou_profit = (total_wins * 100) - (total_losses * 110)
    ou_roi = (ou_profit / (total_bets * 110) * 100) if total_bets > 0 else 0

    # Calculate moneyline stats
    ml_bets = ml_wins + ml_losses
    ml_win_rate = (ml_wins / ml_bets * 100) if ml_bets > 0 else 0

    print("\n" + "="*70)
    print("📊 OVER/UNDER PERFORMANCE")
    print("="*70)
    print(f"\nRecord: {total_wins}-{total_losses}-{total_pushes}")
    print(f"Win Rate: {ou_win_rate:.2f}%")
    print(f"ROI: {ou_roi:+.2f}%")
    print(f"Profit (per $110 unit): ${ou_profit:+.0f}")

    print("\n" + "="*70)
    print("📊 MONEYLINE PERFORMANCE (Straight Up)")
    print("="*70)
    print(f"\nRecord: {ml_wins}-{ml_losses}")
    print(f"Win Rate: {ml_win_rate:.2f}%")
    print(f"(Moneyline odds vary by game, no standard ROI)")

    # Show examples
    print("\n" + "="*70)
    print("📋 SAMPLE RESULTS (First 5 Games)")
    print("="*70)
    for res in enhanced_results[:5]:
        [away, home] = res['matchup'].split(' @ ')
        print(f"\n{res['matchup']}")
        print(f"  Spread: {res['result']} | O/U: {res['ou_result']} | ML: {res['ml_result']}")
        print(f"  Score: {res['away_score']}-{res['home_score']}")
        winner_team = home if res['ml_pick'] == 'home' else away
        print(f"  Picks: {res['ou_pick']} {res['vegas_total']} | {winner_team} ML")

    # Save enhanced data
    output = {
        'metadata': {
            'total_matched': len(enhanced_results),
            'note': 'Complete analysis: Spreads, Totals (O/U), and Moneyline'
        },
        'spread_performance': ats_data['performance'],
        'total_performance': {
            'ou_wins': total_wins,
            'ou_losses': total_losses,
            'ou_pushes': total_pushes,
            'win_rate': ou_win_rate,
            'roi': ou_roi,
            'profit_per_110_unit': ou_profit
        },
        'moneyline_performance': {
            'ml_wins': ml_wins,
            'ml_losses': ml_losses,
            'win_rate': ml_win_rate
        },
        'detailed_results': enhanced_results
    }

    with open('../public/training/complete_performance_2025.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n💾 Saved to complete_performance_2025.json")
    print("="*70)

def extract_features(game, feature_list):
    """Extract features in the correct order"""
    home = game['homeTeam']
    away = game['awayTeam']
    matchup = game['matchup']
    weather = game['weather']

    # Calculate derived features
    home_last3 = home.get('last3Games', {})
    away_last3 = away.get('last3Games', {})

    home_last3_pf = sum(home_last3.get('pointsScored', [0,0,0])) / 3
    home_last3_pa = sum(home_last3.get('pointsAllowed', [0,0,0])) / 3
    away_last3_pf = sum(away_last3.get('pointsScored', [0,0,0])) / 3
    away_last3_pa = sum(away_last3.get('pointsAllowed', [0,0,0])) / 3

    features = [
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
        home_last3_pf,
        home_last3_pa,
        away_last3_pf,
        away_last3_pa,
        home.get('restDays', 7),
        away.get('restDays', 7),
        matchup.get('restDaysDiff', 0),
        home['ppg'] - away['ppg'],
        away['pag'] - home['pag'],
        home['winPct'] - away['winPct'],
        home['yardsPerGame'] - away['yardsPerGame'],
        home['turnoverDiff'] - away['turnoverDiff'],
        1 if matchup['isDivisional'] else 0,
        1 if matchup['isConference'] else 0,
        1 if matchup.get('isThursdayNight', False) else 0,
        1 if matchup.get('isMondayNight', False) else 0,
        1 if matchup.get('isSundayNight', False) else 0,
        weather['temperature'],
        weather['windSpeed'],
        weather['precipitation'],
        1 if weather['isDome'] else 0,
    ]

    return features

if __name__ == '__main__':
    add_totals_analysis()
