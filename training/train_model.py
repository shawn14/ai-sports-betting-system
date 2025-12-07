#!/usr/bin/env python3
"""
NFL Betting ML Training Script
Trains XGBoost models optimized for ATS (Against The Spread) accuracy and ROI
"""

import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from datetime import datetime

# Set style for visualizations
sns.set_style('darkgrid')
plt.rcParams['figure.figsize'] = (12, 8)


def load_training_data(json_path):
    """Load and parse the training dataset from JSON"""
    print(f"Loading training data from {json_path}...")

    with open(json_path, 'r') as f:
        dataset = json.load(f)

    print(f"Dataset metadata:")
    print(f"  Seasons: {dataset['metadata']['seasons']}")
    print(f"  Total Games: {dataset['metadata']['totalGames']}")
    print(f"  Features: {len(dataset['metadata']['features'])}")
    print(f"  Version: {dataset['metadata']['version']}")

    return dataset


def create_features_dataframe(data_points):
    """Convert training data points to pandas DataFrame with features"""
    print("\nExtracting features from training data...")

    records = []
    for game in data_points:
        # Calculate Phase 1: Last 3 games averages
        home_last3 = game['homeTeam'].get('last3Games', {})
        away_last3 = game['awayTeam'].get('last3Games', {})

        home_last3_pf = sum(home_last3.get('pointsScored', [0])) / max(len(home_last3.get('pointsScored', [0])), 1)
        home_last3_pa = sum(home_last3.get('pointsAllowed', [0])) / max(len(home_last3.get('pointsAllowed', [0])), 1)
        away_last3_pf = sum(away_last3.get('pointsScored', [0])) / max(len(away_last3.get('pointsScored', [0])), 1)
        away_last3_pa = sum(away_last3.get('pointsAllowed', [0])) / max(len(away_last3.get('pointsAllowed', [0])), 1)

        # Extract all features into flat structure
        record = {
            'gameId': game['gameId'],
            'season': game['season'],
            'week': game['week'],

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

            # Phase 1: Last 3 games features
            'home_last3_ppf': home_last3_pf,
            'home_last3_ppa': home_last3_pa,
            'away_last3_ppf': away_last3_pf,
            'away_last3_ppa': away_last3_pa,

            # Phase 1: Rest days features
            'home_rest_days': game['homeTeam'].get('restDays', 7),
            'away_rest_days': game['awayTeam'].get('restDays', 7),
            'rest_days_diff': game['matchup'].get('restDaysDiff', 0),

            # Derived features
            'ppg_differential': game['homeTeam']['ppg'] - game['awayTeam']['ppg'],
            'pag_differential': game['awayTeam']['pag'] - game['homeTeam']['pag'],  # Lower is better
            'winPct_differential': game['homeTeam']['winPct'] - game['awayTeam']['winPct'],
            'yards_differential': game['homeTeam']['yardsPerGame'] - game['awayTeam']['yardsPerGame'],
            'turnover_differential': game['homeTeam']['turnoverDiff'] - game['awayTeam']['turnoverDiff'],

            # Matchup features
            'is_divisional': 1 if game['matchup']['isDivisional'] else 0,
            'is_conference': 1 if game['matchup']['isConference'] else 0,

            # Phase 1: Prime time features
            'is_thursday_night': 1 if game['matchup'].get('isThursdayNight', False) else 0,
            'is_monday_night': 1 if game['matchup'].get('isMondayNight', False) else 0,
            'is_sunday_night': 1 if game['matchup'].get('isSundayNight', False) else 0,

            # Weather features
            'temperature': game['weather']['temperature'],
            'wind_speed': game['weather']['windSpeed'],
            'precipitation': game['weather']['precipitation'],
            'is_dome': 1 if game['weather']['isDome'] else 0,
        }

        # Add EPA and advanced metrics if available
        if 'advanced_metrics' in game:
            adv = game['advanced_metrics']

            # EPA metrics (8 features)
            record['home_epa_per_play'] = adv['home']['epa_per_play']
            record['away_epa_per_play'] = adv['away']['epa_per_play']
            record['home_epa_allowed'] = adv['home']['epa_allowed_per_play']
            record['away_epa_allowed'] = adv['away']['epa_allowed_per_play']
            record['home_success_rate'] = adv['home']['success_rate']
            record['away_success_rate'] = adv['away']['success_rate']
            record['home_explosive_rate'] = adv['home']['explosive_rate']
            record['away_explosive_rate'] = adv['away']['explosive_rate']

            # QB metrics (2 features)
            record['home_qb_epa'] = adv['home']['qb_epa']
            record['away_qb_epa'] = adv['away']['qb_epa']

            # Home/away splits (4 features)
            record['home_home_record'] = adv['home']['home_record_pct']
            record['home_away_record'] = adv['home']['away_record_pct']
            record['away_home_record'] = adv['away']['home_record_pct']
            record['away_away_record'] = adv['away']['away_record_pct']

            # Strength of schedule (2 features)
            record['home_sos'] = adv['home']['strength_of_schedule']
            record['away_sos'] = adv['away']['strength_of_schedule']

            # Derived EPA features (5 features)
            record['epa_differential'] = record['home_epa_per_play'] - record['away_epa_per_play']
            record['qb_epa_differential'] = record['home_qb_epa'] - record['away_qb_epa']
            record['home_advantage_diff'] = record['home_home_record'] - record['away_away_record']
            record['sos_differential'] = record['home_sos'] - record['away_sos']
            record['success_rate_diff'] = record['home_success_rate'] - record['away_success_rate']
        else:
            # Default values if EPA data not available (early season games)
            record['home_epa_per_play'] = 0.0
            record['away_epa_per_play'] = 0.0
            record['home_epa_allowed'] = 0.0
            record['away_epa_allowed'] = 0.0
            record['home_success_rate'] = 0.5
            record['away_success_rate'] = 0.5
            record['home_explosive_rate'] = 0.1
            record['away_explosive_rate'] = 0.1
            record['home_qb_epa'] = 0.0
            record['away_qb_epa'] = 0.0
            record['home_home_record'] = 0.5
            record['home_away_record'] = 0.5
            record['away_home_record'] = 0.5
            record['away_away_record'] = 0.5
            record['home_sos'] = 0.5
            record['away_sos'] = 0.5
            record['epa_differential'] = 0.0
            record['qb_epa_differential'] = 0.0
            record['home_advantage_diff'] = 0.0
            record['sos_differential'] = 0.0
            record['success_rate_diff'] = 0.0

        # Target variables (outcomes)
        record.update({
            # Target variables (outcomes)
            'actual_spread': game['outcome']['actualSpread'],  # home - away (negative = away won by more)
            'actual_total': game['outcome']['actualTotal'],    # home + away
            'home_score': game['outcome']['homeScore'],
            'away_score': game['outcome']['awayScore'],
            'home_won': 1 if game['outcome']['homeWon'] else 0,
        })

        # Add betting lines if available
        if 'lines' in game and game['lines']:
            record['spread_line'] = game['lines'].get('spread', 0)
            record['total_line'] = game['lines'].get('total', 0)
        else:
            record['spread_line'] = 0
            record['total_line'] = 0

        records.append(record)

    df = pd.DataFrame(records)
    print(f"Created DataFrame with {len(df)} games and {len(df.columns)} columns")

    return df


def prepare_training_data(df):
    """Prepare feature matrix X and target variables y"""
    print("\nPreparing training data...")

    # Feature columns (everything except targets and metadata)
    # Total: 54 features (33 original + 21 new EPA features)
    feature_cols = [
        # Team stats (12 features)
        'home_winPct', 'home_ppg', 'home_pag', 'home_yards_pg', 'home_yards_allowed_pg', 'home_turnover_diff',
        'away_winPct', 'away_ppg', 'away_pag', 'away_yards_pg', 'away_yards_allowed_pg', 'away_turnover_diff',

        # Phase 1: Last 3 games (4 features)
        'home_last3_ppf', 'home_last3_ppa',
        'away_last3_ppf', 'away_last3_ppa',

        # Phase 1: Rest days (3 features)
        'home_rest_days', 'away_rest_days', 'rest_days_diff',

        # Derived features (5 features)
        'ppg_differential', 'pag_differential', 'winPct_differential', 'yards_differential', 'turnover_differential',

        # Matchup flags (2 features)
        'is_divisional', 'is_conference',

        # Phase 1: Prime time (3 features)
        'is_thursday_night', 'is_monday_night', 'is_sunday_night',

        # Weather (4 features)
        'temperature', 'wind_speed', 'precipitation', 'is_dome',

        # EPA metrics (8 features)
        'home_epa_per_play', 'away_epa_per_play',
        'home_epa_allowed', 'away_epa_allowed',
        'home_success_rate', 'away_success_rate',
        'home_explosive_rate', 'away_explosive_rate',

        # QB metrics (2 features)
        'home_qb_epa', 'away_qb_epa',

        # Home/away splits (4 features)
        'home_home_record', 'home_away_record',
        'away_home_record', 'away_away_record',

        # Strength of schedule (2 features)
        'home_sos', 'away_sos',

        # Derived EPA features (5 features)
        'epa_differential', 'qb_epa_differential',
        'home_advantage_diff', 'sos_differential', 'success_rate_diff'
    ]

    X = df[feature_cols].copy()

    # Target variables
    y_spread = df['actual_spread']  # For spread prediction
    y_total = df['actual_total']    # For total prediction
    y_winner = df['home_won']       # For win probability

    # Handle any NaN values
    X = X.fillna(0)

    print(f"Features: {X.shape}")
    print(f"Feature columns: {list(X.columns)}")
    print(f"\nTarget variables:")
    print(f"  Spread range: {y_spread.min():.1f} to {y_spread.max():.1f}")
    print(f"  Total range: {y_total.min():.1f} to {y_total.max():.1f}")
    print(f"  Home win rate: {y_winner.mean():.1%}")

    return X, y_spread, y_total, y_winner, feature_cols


def temporal_train_test_split(df, X, y_spread, y_total, y_winner, test_size=0.2):
    """
    Split data temporally (train on past, test on future)
    This is critical for time-series data like sports games
    """
    print(f"\nSplitting data temporally (train on past, test on future)...")

    # Sort by season and week
    df_sorted = df.sort_values(['season', 'week']).reset_index(drop=True)
    split_idx = int(len(df_sorted) * (1 - test_size))

    train_idx = df_sorted.index[:split_idx]
    test_idx = df_sorted.index[split_idx:]

    X_train = X.iloc[train_idx]
    X_test = X.iloc[test_idx]

    y_spread_train = y_spread.iloc[train_idx]
    y_spread_test = y_spread.iloc[test_idx]

    y_total_train = y_total.iloc[train_idx]
    y_total_test = y_total.iloc[test_idx]

    y_winner_train = y_winner.iloc[train_idx]
    y_winner_test = y_winner.iloc[test_idx]

    print(f"Training set: {len(train_idx)} games ({train_idx.min()} to {train_idx.max()})")
    print(f"Test set: {len(test_idx)} games ({test_idx.min()} to {test_idx.max()})")

    return X_train, X_test, y_spread_train, y_spread_test, y_total_train, y_total_test, y_winner_train, y_winner_test


def train_spread_model(X_train, y_train, X_test, y_test):
    """Train XGBoost model for spread prediction"""
    print("\n" + "="*60)
    print("TRAINING SPREAD PREDICTION MODEL")
    print("="*60)

    # XGBoost parameters optimized for spread prediction
    params = {
        'objective': 'reg:squarederror',
        'max_depth': 5,
        'learning_rate': 0.1,
        'n_estimators': 500,
        'min_child_weight': 3,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42,
        'eval_metric': 'mae'
    }

    print(f"Training with parameters: {params}")

    model = xgb.XGBRegressor(**params)

    # Train with early stopping
    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=50
    )

    # Predictions
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)

    # Evaluate
    train_mae = mean_absolute_error(y_train, train_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
    test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))

    print(f"\n📊 Spread Model Performance:")
    print(f"  Train MAE: {train_mae:.2f} points")
    print(f"  Test MAE: {test_mae:.2f} points")
    print(f"  Train RMSE: {train_rmse:.2f} points")
    print(f"  Test RMSE: {test_rmse:.2f} points")

    return model, test_pred


def train_total_model(X_train, y_train, X_test, y_test):
    """Train XGBoost model for total (over/under) prediction"""
    print("\n" + "="*60)
    print("TRAINING TOTAL PREDICTION MODEL")
    print("="*60)

    params = {
        'objective': 'reg:squarederror',
        'max_depth': 4,
        'learning_rate': 0.1,
        'n_estimators': 400,
        'min_child_weight': 3,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42,
        'eval_metric': 'mae'
    }

    print(f"Training with parameters: {params}")

    model = xgb.XGBRegressor(**params)

    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=50
    )

    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)

    train_mae = mean_absolute_error(y_train, train_pred)
    test_mae = mean_absolute_error(y_test, test_pred)
    train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
    test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))

    print(f"\n📊 Total Model Performance:")
    print(f"  Train MAE: {train_mae:.2f} points")
    print(f"  Test MAE: {test_mae:.2f} points")
    print(f"  Train RMSE: {train_rmse:.2f} points")
    print(f"  Test RMSE: {test_rmse:.2f} points")

    return model, test_pred


def calculate_ats_metrics(y_true_spread, y_pred_spread, spread_lines=None):
    """
    Calculate ATS (Against The Spread) betting metrics
    This is the key metric for profitable betting
    """
    print("\n" + "="*60)
    print("BETTING PERFORMANCE (ATS)")
    print("="*60)

    if spread_lines is None or len(spread_lines) == 0:
        # If no betting lines, use model predictions vs actual
        print("No betting lines available - showing prediction accuracy only")
        correct = np.abs(y_true_spread - y_pred_spread) <= 3  # Within 3 points
        accuracy = correct.mean()
        print(f"  Predictions within 3 points: {accuracy:.1%}")
        return

    # Calculate ATS performance
    correct_ats = 0
    total_bets = 0
    units_won = 0

    # Convert to numpy arrays to avoid indexing issues
    actual_spreads = y_true_spread.values if hasattr(y_true_spread, 'values') else y_true_spread
    predicted_spreads = y_pred_spread if isinstance(y_pred_spread, np.ndarray) else y_pred_spread.values

    for i in range(len(actual_spreads)):
        if spread_lines[i] == 0:
            continue  # Skip games without lines

        actual = actual_spreads[i]
        predicted = predicted_spreads[i]
        line = spread_lines[i]

        # Our pick based on model prediction vs line
        our_pick = 'home' if predicted > line else 'away'

        # Actual result vs line
        home_covered = actual > line
        away_covered = actual < line
        push = abs(actual - line) < 0.5

        if push:
            continue  # Pushes don't count

        total_bets += 1

        # Did we pick correctly?
        if our_pick == 'home' and home_covered:
            correct_ats += 1
            units_won += 1  # Win 1 unit (+100 at -110 odds)
        elif our_pick == 'away' and away_covered:
            correct_ats += 1
            units_won += 1
        else:
            units_won -= 1.1  # Lose 1.1 units (vig)

    if total_bets == 0:
        print("No betting lines available for ATS calculation")
        return

    ats_accuracy = correct_ats / total_bets
    roi = (units_won / (total_bets * 1.1)) * 100  # ROI considering vig

    print(f"  Total Bets: {total_bets}")
    print(f"  Correct ATS: {correct_ats}")
    print(f"  ATS Win Rate: {ats_accuracy:.1%}")
    print(f"  Units Won/Lost: {units_won:+.1f}")
    print(f"  ROI: {roi:+.1f}%")
    print(f"\n  💡 Target: 52.4% ATS = breakeven, 54%+ = profitable")

    if ats_accuracy >= 0.54:
        print(f"  🎉 EXCELLENT! This model beats the spread at a profitable rate!")
    elif ats_accuracy >= 0.524:
        print(f"  ✅ GOOD! This model is around breakeven or slightly profitable")
    else:
        print(f"  ⚠️  Model needs improvement to be profitable")

    return {
        'ats_accuracy': ats_accuracy,
        'total_bets': total_bets,
        'units_won': units_won,
        'roi': roi
    }


def plot_feature_importance(model, feature_cols, model_name):
    """Plot feature importance"""
    importance = model.feature_importances_
    indices = np.argsort(importance)[::-1][:15]  # Top 15 features

    plt.figure(figsize=(10, 6))
    plt.title(f'{model_name} - Top 15 Most Important Features')
    plt.barh(range(len(indices)), importance[indices])
    plt.yticks(range(len(indices)), [feature_cols[i] for i in indices])
    plt.xlabel('Feature Importance')
    plt.gca().invert_yaxis()
    plt.tight_layout()
    plt.savefig(f'{model_name.lower().replace(" ", "_")}_importance.png', dpi=150)
    print(f"\n📊 Saved feature importance plot: {model_name.lower().replace(' ', '_')}_importance.png")


def save_models(spread_model, total_model, feature_cols):
    """Save trained models"""
    print("\n" + "="*60)
    print("SAVING MODELS")
    print("="*60)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save models
    joblib.dump(spread_model, f'spread_model_{timestamp}.pkl')
    joblib.dump(total_model, f'total_model_{timestamp}.pkl')

    # Save feature columns
    with open(f'feature_columns_{timestamp}.json', 'w') as f:
        json.dump({'features': feature_cols}, f, indent=2)

    print(f"✅ Saved spread_model_{timestamp}.pkl")
    print(f"✅ Saved total_model_{timestamp}.pkl")
    print(f"✅ Saved feature_columns_{timestamp}.json")

    print(f"\n💡 Next steps:")
    print(f"1. Export models to ONNX format for web integration")
    print(f"2. Test models on upcoming games")
    print(f"3. Compare performance vs current rules-based model")


def main(json_path):
    """Main training pipeline"""
    print("\n" + "="*60)
    print("NFL BETTING ML TRAINING PIPELINE")
    print("="*60)

    # Load data
    dataset = load_training_data(json_path)
    df = create_features_dataframe(dataset['data'])

    # Prepare features and targets
    X, y_spread, y_total, y_winner, feature_cols = prepare_training_data(df)

    # Temporal train/test split
    X_train, X_test, y_spread_train, y_spread_test, y_total_train, y_total_test, y_winner_train, y_winner_test = \
        temporal_train_test_split(df, X, y_spread, y_total, y_winner)

    # Train spread model
    spread_model, spread_predictions = train_spread_model(X_train, y_spread_train, X_test, y_spread_test)
    plot_feature_importance(spread_model, feature_cols, 'Spread Model')

    # Train total model
    total_model, total_predictions = train_total_model(X_train, y_total_train, X_test, y_total_test)
    plot_feature_importance(total_model, feature_cols, 'Total Model')

    # Calculate ATS metrics (if betting lines available)
    test_df = df.iloc[X_test.index]
    calculate_ats_metrics(y_spread_test, spread_predictions, test_df['spread_line'].values)

    # Save models
    save_models(spread_model, total_model, feature_cols)

    print("\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("="*60)


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python train_model.py <path_to_json_file>")
        print("Example: python train_model.py nfl_training_data_2024_2023_2022_2021_1765054889500.json")
        sys.exit(1)

    json_path = sys.argv[1]
    main(json_path)
