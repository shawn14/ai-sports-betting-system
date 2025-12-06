# Analytics & Performance Tracking Guide

## Overview

The Analytics page tracks your prediction model's performance by comparing what you predicted versus what actually happened in completed NFL games.

## Access

Visit: **http://localhost:3001/analytics**

## Key Metrics Tracked

### 1. Winner Prediction Accuracy
- **What it measures**: How often you correctly predicted which team would win
- **Target**: 60%+ is excellent, 55%+ is good
- **Formula**: Correct predictions / Total predictions

### 2. Against the Spread (ATS) Record
- **What it measures**: How well your predictions would perform betting the spread
- **Target**: 52.4%+ to break even (with -110 odds), 55%+ is profitable
- **Formula**: Games where predicted winner covered / Total games
- **Record Format**: Wins-Losses-Pushes (e.g., 8-5-1)

### 3. Score Prediction Accuracy
- **Average Error**: How far off your score predictions are
  - Home Team Error
  - Away Team Error
  - Total Points Error
- **Median Error**: Middle value (less affected by outliers)
- **Target**: ±4 points or less is very good

### 4. Return on Investment (ROI)
- **What it measures**: Profitability if you bet on every prediction
- **Target**: 5%+ ROI is profitable, 10%+ is excellent
- **Formula**: (Total Profit / Total Wagered) × 100
- **Units**: Standardized measure (1 unit = $100)

## Analytics Features

### Recent Results Section

Shows your last 10 predictions with:

**Predicted Score**
```
Away Team: 24
Home Team: 21
Confidence: 68%
```

**Actual Score**
```
Away Team: 27
Home Team: 20
Error: ±2.0 pts
```

**Outcome Indicators**
- ✓ Green checkmark = Correct prediction
- ✗ Red X = Incorrect prediction
- Spread result (covered or not)
- Total result (over/under)
- Profit/Loss for that game

### Confidence Level Breakdown

Analyzes how well your model performs at different confidence levels:

```
90-100%: 75% accuracy (4 games)
80-89%:  67% accuracy (12 games)
70-79%:  58% accuracy (25 games)
60-69%:  52% accuracy (18 games)
```

**What to look for:**
- Higher confidence should = higher accuracy
- If 90%+ confidence has <70% accuracy, model is overconfident
- If 60-69% confidence has >60% accuracy, model is underconfident

### Profitability Analysis

Breaks down profit/loss by bet type:

**Spread Bets**
- Based on predicted winner covering the spread
- Standard -110 odds ($110 to win $100)

**Moneyline Bets**
- Based on picking the winner straight up
- Odds vary based on favorite/underdog

**Total Bets**
- Based on predicted total vs actual total
- Over/Under betting

### Score Accuracy Metrics

**Average vs Median**
- **Average**: Mean error across all predictions
- **Median**: Middle value (better for identifying consistent performance)

If median is much lower than average, you have a few really bad predictions skewing the data.

## Understanding the Results

### Good Performance Indicators

✅ **Winner Accuracy 60%+**
- You're picking winners better than the betting market

✅ **ATS Accuracy 54%+**
- You have a statistical edge against the spread
- Profitable long-term

✅ **Average Score Error <5 points**
- Your score predictions are very accurate
- Helps with totals betting

✅ **Positive ROI**
- Your predictions are making money
- Any positive ROI is beating the house

### Warning Signs

⚠️ **Winner Accuracy <52%**
- Barely better than a coin flip
- Model needs improvement

⚠️ **ATS Accuracy <50%**
- Losing money against the spread
- Need to refine predictions

⚠️ **Average Score Error >7 points**
- Scores are too far off
- Check prediction factors

⚠️ **Negative ROI**
- Losing money overall
- Don't bet real money until this improves

## How the System Works

### For Completed Games:

1. **Fetch completed games** from ESPN API
2. **Generate what prediction would have been** using historical team stats
3. **Compare predicted score to actual score**
4. **Calculate outcomes**:
   - Did we pick the right winner?
   - Would spread bet have won?
   - Was total over/under correct?
5. **Calculate profit/loss** based on standard betting odds
6. **Aggregate all results** into performance metrics

### Prediction Result Calculation

```typescript
Predicted: Chiefs 27, Bills 24 (Chiefs -3)
Actual:    Chiefs 31, Bills 28 (Chiefs -3)

✓ Winner Correct: Yes (Chiefs won)
✓ Spread Covered: Yes (Chiefs won by 3)
✗ Score Error: ±4 points total (predicted 51, actual 59)
  Total: Over (predicted 51, actual 59)
```

## Best Practices

### 1. Track Over Time
- Don't judge performance on 5-10 games
- Need at least 30-50 games for meaningful data
- Track season-long performance

### 2. Focus on ATS Accuracy
- Most important metric for betting profitability
- Need 52.4% to break even with -110 juice
- 55%+ = very profitable

### 3. Calibrate Confidence
- Check if your confidence matches actual accuracy
- If 80% confident games only hit 60%, you're overconfident
- Adjust thresholds accordingly

### 4. Analyze Errors
- Look at games with biggest score errors
- Identify patterns (home/away, divisional, weather, etc.)
- Improve prediction model based on findings

### 5. Track ROI, Not Just Wins
- A 60% win rate with bad odds can lose money
- A 52% win rate with good odds can make money
- ROI is the ultimate measure

## Example Analysis

### Strong Model Performance
```
Total Games: 48
Winner Accuracy: 63.2% (30-18)
ATS Record: 26-20-2 (56.5%)
Avg Score Error: ±4.2 points
ROI: +8.7%
Units: +4.2

Analysis: Excellent model! Profitable across all bet types.
Recommendation: Bet with confidence on high-conviction picks.
```

### Needs Improvement
```
Total Games: 48
Winner Accuracy: 54.2% (26-22)
ATS Record: 22-24-2 (47.8%)
Avg Score Error: ±6.8 points
ROI: -4.3%
Units: -2.1

Analysis: Model not beating the market.
Recommendation: DO NOT BET. Refine model first.
```

## Future Enhancements

- [ ] Week-by-week performance tracking
- [ ] Performance by team
- [ ] Performance by game situation (divisional, primetime, etc.)
- [ ] Performance by weather conditions
- [ ] Performance by betting market (favorite vs underdog)
- [ ] Export results to CSV/Excel
- [ ] Compare multiple prediction models
- [ ] Machine learning model training on results

## Tips for Improving Model

1. **Analyze Best Predictions**
   - What factors were present?
   - Can you weight them higher?

2. **Analyze Worst Predictions**
   - What did you miss?
   - Add new factors (injuries, motivation, etc.)

3. **Backtesting**
   - Test model on previous seasons
   - See if it would have been profitable

4. **Factor Tuning**
   - Adjust weights on prediction factors
   - Test different combinations

5. **Additional Data**
   - Add advanced stats (EPA, DVOA, Success Rate)
   - Include injury reports
   - Factor in betting line movement

---

**Remember**: Even the best sports bettors only hit 55-60% against the spread. Small edges add up to big profits over time with proper bankroll management!
