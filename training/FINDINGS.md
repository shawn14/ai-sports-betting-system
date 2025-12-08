# ESPN API Enhancement Findings

## Problem Discovered

The free ESPN API has a critical limitation for historical analysis:
- ✅ Provides CURRENT season home/away splits
- ❌ Does NOT provide historical home/away splits per week

### Why This Matters

To train a model on 2021-2024 data, we need to know what each team's home/away record was **at the time of each game**. For example:
- Week 5, 2022: What was the Chiefs' home record through Week 4?
- Week 12, 2023: What was the Eagles' road record through Week 11?

ESPN's free API only shows:
- **Current 2025 season stats** when we query today
- **Final season stats** when we query historical games

We can't get "point-in-time" stats for historical weeks.

## What We Tried

1. **Added home/away split features** to model (6 new features)
   - Result: 0.00% improvement (54.41% → 54.41%)
   - Reason: The data had placeholder values (all 0.5) instead of real splits

2. **Attempted to fetch real splits from ESPN**
   - Limitation: Can only get current season data
   - Can't reconstruct historical week-by-week home/away records

## Alternative Approaches

### Option 1: Calculate Splits from Historical Game Data
Instead of relying on ESPN's API, we could **calculate** home/away splits ourselves from the game results we already have.

**Pros:**
- Accurate point-in-time data
- Complete control over historical accuracy
- No API limitations

**Cons:**
- Requires processing all game results
- More complex data pipeline
- Need to ensure temporal integrity (don't use future games)

### Option 2: Use Features That ARE Available Historically
Focus on data we CAN get from ESPN historically:

**Available from ESPN Scoreboard API (historical):**
- ✅ Final scores (already have)
- ✅ Venue (indoor/outdoor) (already have)
- ✅ Game leaders (passing/rushing/receiving yards)
- ✅ Quarter-by-quarter scoring
- ✅ Conference matchups (already have)

**Could Add:**
- Average QB passing yards (from game leaders over time)
- Average RB rushing yards (from game leaders over time)
- 1st half vs 2nd half scoring patterns
- Scoring by quarter trends

### Option 3: Accept Current Limitations
The model is already performing at **54.4% on 2024 data** with 33 features. This is:
- Above breakeven (52.4%)
- +3.88% ROI
- Profitable long-term

Maybe we don't need more features - we should focus on:
- Better Vegas line integration
- Edge detection refinement
- Bet sizing strategies

## Recommendation

**Option 1: Calculate Home/Away Splits from Historical Data**

This gives us the most accurate data. Here's the approach:

```python
def calculate_home_away_splits(all_games, current_game):
    """
    Calculate home/away win% for a team up to (but not including) current game
    """
    team_id = current_game['homeTeam']['id']
    current_date = current_game['date']

    home_wins = 0
    home_games = 0
    road_wins = 0
    road_games = 0

    for game in all_games:
        if game['date'] >= current_date:
            continue  # Don't use future data

        if game['homeTeam']['id'] == team_id:
            home_games += 1
            if game['outcome']['homeWin']:
                home_wins += 1

        if game['awayTeam']['id'] == team_id:
            road_games += 1
            if game['outcome']['awayWin']:
                road_wins += 1

    home_win_pct = home_wins / home_games if home_games > 0 else 0.5
    road_win_pct = road_wins / road_games if road_games > 0 else 0.5

    return home_win_pct, road_win_pct
```

This approach:
1. Uses only data we already have
2. Maintains temporal integrity
3. Gives accurate point-in-time splits
4. No API limitations

## Next Steps

1. **Implement Option 1**: Create a script to calculate true historical home/away splits
2. **Re-run model comparison** with accurate split data
3. **If improvement > 1%**: Integrate into production
4. **If no improvement**: Focus on other enhancements (bet sizing, edge detection, better totals model)

## Bottom Line

The ESPN API limitation isn't a blocker - we can calculate home/away splits ourselves from historical game data, which is actually MORE accurate than what ESPN would provide anyway.
