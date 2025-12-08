# ESPN Free API - Available Data We're NOT Using

Based on analysis of the free ESPN NFL API endpoints, here's what data is available that we're currently **not** using in our model.

## ✅ Currently Available in Free ESPN API

### 1. **Home/Away Record Splits** (HIGH VALUE)
From the Team API endpoint:
```json
"record": {
  "items": [
    {"type": "total", "summary": "6-7"},
    {"type": "home", "summary": "5-2", "stats": [...]},
    {"type": "road", "summary": "1-5", "stats": [...]}
  ]
}
```

**Available Fields:**
- Home Win %
- Road Win %
- Home PPG (`avgPointsFor` from home record)
- Road PPG
- Home PAG (`avgPointsAgainst` from home record)
- Road PAG

**Why it matters:** Chiefs are 5-2 at home but 1-5 on the road - that's a HUGE difference we're missing.

### 2. **Game Leaders** (MEDIUM-HIGH VALUE)
From the Scoreboard API:
```json
"leaders": [
  {
    "name": "passingYards",
    "leaders": [{
      "displayValue": "20/39, 256 YDS, 3 TD",
      "value": 256.0,
      "athlete": {...}
    }]
  },
  {
    "name": "rushingYards",
    "leaders": [{...}]
  },
  {
    "name": "receivingYards",
    "leaders": [{...}]
  }
]
```

**Available Fields:**
- Top passer yards per game
- Top rusher yards per game
- Top receiver yards per game
- Can parse TD/INT from displayValue string

**Why it matters:** Individual player performance, especially QB, is more predictive than team averages.

### 3. **Quarter-by-Quarter Scoring** (LOW-MEDIUM VALUE)
From the Scoreboard API:
```json
"linescores": [
  {"value": 3.0, "period": 1},
  {"value": 13.0, "period": 2},
  {"value": 7.0, "period": 3},
  {"value": 0.0, "period": 4}
]
```

**Available Fields:**
- 1st half scoring average
- 2nd half scoring average
- 4th quarter scoring (clutch performance)

**Why it matters:** Some teams start slow, some finish strong. Could help predict final score margins.

### 4. **Additional Team Stats** (MEDIUM VALUE)
From Team API record stats:
```json
"stats": [
  {"name": "avgPointsAgainst", "value": 19.38},
  {"name": "avgPointsFor", "value": 24.23},
  {"name": "differential", "value": 63.0},
  {"name": "streak", "value": -2.0},
  {"name": "divisionWinPercent", "value": 0.333}
]
```

**Available Fields:**
- Current streak (win/loss)
- Division win %
- Total point differential

**Why it matters:** Streaks and divisional performance can indicate team momentum.

### 5. **Venue Information** (ALREADY CAPTURED)
```json
"venue": {
  "indoor": true,
  "fullName": "Ford Field"
}
```

We already capture dome/indoor status in weather data. ✅

## ❌ NOT Available in Free ESPN API

These would be valuable but require paid APIs or web scraping:

- **QB Rating / Passer Rating** - Not directly available
- **3rd Down Conversion %** - Not in basic API
- **Red Zone Efficiency** - Not in basic API
- **Sacks Per Game** - Not in basic API
- **Time of Possession** - Not in basic API
- **Injury Reports** - Not reliably available
- **Individual Player Availability** - No roster status in scoreboard
- **Advanced Defensive Stats** - Not in basic API

## 🎯 Recommended Additions (Free API Only)

### Priority 1: Home/Away Splits
**Complexity:** Easy
**Impact:** High
**Fields to Add:**
- `home_win_pct_at_home`
- `home_win_pct_on_road`
- `away_win_pct_at_home`
- `away_win_pct_on_road`

**Reasoning:** This is the single biggest gap. A team being 5-2 at home vs 1-5 on road is crucial context.

### Priority 2: Current Streak
**Complexity:** Easy
**Impact:** Medium
**Fields to Add:**
- `home_current_streak` (positive = wins, negative = losses)
- `away_current_streak`

**Reasoning:** Momentum matters. Teams on 5-game win streaks play differently.

### Priority 3: Game Leaders (Historical Averages)
**Complexity:** Medium (requires collecting leader data over time)
**Impact:** Medium-High
**Fields to Add:**
- `home_top_passer_avg_yards`
- `away_top_passer_avg_yards`
- `home_top_rusher_avg_yards`
- `away_top_rusher_avg_yards`

**Reasoning:** Would need to build historical database of game leaders, then average them. Approximates QB/RB1 performance.

### Priority 4: First Half vs Second Half Splits
**Complexity:** Medium (requires historical linescore analysis)
**Impact:** Low-Medium
**Fields to Add:**
- `home_first_half_ppg`
- `home_second_half_ppg`
- `away_first_half_ppg`
- `away_second_half_ppg`

**Reasoning:** Could identify teams that start slow or finish strong.

## 📊 Implementation Plan

### Phase 1: Quick Wins (Home/Away Splits + Streak)
1. Modify data collection to fetch team detail endpoint
2. Extract home/road records and streaks
3. Add 6 new features to model
4. Retrain and validate

**Estimated Impact:** +1-2% win rate improvement

### Phase 2: Historical Game Leaders
1. Build database of game leaders over past seasons
2. Calculate rolling averages for top passer/rusher
3. Add 4 new features
4. Retrain and validate

**Estimated Impact:** +0.5-1.5% win rate improvement

### Phase 3: Scoring Pattern Analysis
1. Analyze historical linescore data
2. Calculate half-by-half averages
3. Add 4 new features
4. Retrain and validate

**Estimated Impact:** +0.5-1% win rate improvement

## 🚫 What We Can't Get (Without Paid APIs)

To get these, we'd need:
- **Stats Perform API** ($$$) - Advanced stats, player tracking
- **SportRadar API** ($$$) - Detailed play-by-play, advanced metrics
- **Pro Football Reference scraping** - Free but legally gray area
- **ESPN scraping** - Against ToS, could get blocked

## ✅ Next Steps

1. Start with **Phase 1** (Home/Away + Streak) - easiest, highest ROI
2. Update training data collection script
3. Retrain model with new features
4. Validate on 2024 data to see improvement
5. If successful, move to Phase 2

**Key Insight:** We can realistically add ~10 new features from the free ESPN API that could improve our win rate by 2-4% without any paid services.
