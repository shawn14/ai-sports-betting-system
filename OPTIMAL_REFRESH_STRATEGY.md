# Optimal Data Refresh Strategy for NFL Betting

## TL;DR

**Don't refresh every 15 minutes!** NFL is event-driven, not continuous.

**Better approach:**
- **Mon-Wed**: Once per day (schedule doesn't change)
- **Thu-Sun**: Every 2-4 hours (odds updates)
- **Game time**: Manual refresh button (user-triggered)

---

## Why Not Every 15 Minutes?

### NFL vs. Stock Market

| Factor | Stock Market | NFL |
|--------|--------------|-----|
| **Trading hours** | 6.5 hrs/day | Games only Thu/Sun/Mon |
| **Data changes** | Every second | Hourly at most |
| **Refresh needed** | Real-time | Batch updates |

**NFL betting is EVENT-DRIVEN:**
- Games happen 3 days per week
- Schedules don't change mid-week
- Odds update slowly (hours, not seconds)
- Scores only change during games

---

## Optimal Refresh Schedule

### Current Schedule (TOO FREQUENT):
- `*/15 * * * *` = Every 15 minutes
- **96 API calls per day**
- **Cost**: $2,880/month on The Odds API
- **Waste**: 90% of calls fetch unchanged data

### Optimized Schedule:

#### Option 1: Every 2 Hours (Recommended)
```json
"schedule": "0 */2 * * *"
```
- **12 API calls per day**
- **Cost**: $360/month
- **88% cost reduction**
- Still fresh enough for betting

#### Option 2: Game Day Aware (Best)
```json
"schedule": "0 8,12,16,20 * * 4,0,1"
```
- **Thursday/Sunday/Monday**: 4 times per day
- **Other days**: 0 times
- **~12 API calls per WEEK**
- **Cost**: $50/month**
- **98% cost reduction**

#### Option 3: Smart Hybrid
- **Mon-Wed**: Once daily at 8am
- **Thu-Sun**: Every 2-3 hours
- **During games**: Manual refresh
- **~20 API calls per week**

---

## Recommended: Every 2-4 Hours + Manual Refresh

### Why This Works:

1. **Odds don't change that fast**
   - Most odds updates happen hours before games
   - Line movements are gradual
   - No need for minute-by-minute updates

2. **User control**
   - Add "Refresh Data" button on pages
   - Users can manually refresh before placing bets
   - Gives them confidence in data freshness

3. **Cost effective**
   - 12 calls/day vs 96 calls/day
   - Same user experience
   - Much lower costs

---

## Implementation: Manual Refresh Button

Add this to Games/Predictions pages:

```tsx
const refreshData = async () => {
  setRefreshing(true);
  try {
    // Call refresh endpoint
    await fetch('/api/refresh-data?secret=' + process.env.NEXT_PUBLIC_REFRESH_TOKEN);

    // Reload cache
    await loadPredictions();

    toast.success('Data refreshed!');
  } catch (error) {
    toast.error('Refresh failed');
  } finally {
    setRefreshing(false);
  }
};

// UI
<button onClick={refreshData}>
  {refreshing ? 'Refreshing...' : 'Refresh Odds'}
</button>
```

---

## When Should Data Refresh?

### High Priority (Refresh Needed):
✅ **Tuesday 8am** - Week schedule published
✅ **Thursday 12pm** - TNF odds open
✅ **Sunday 8am** - Sunday odds final
✅ **Monday 6pm** - MNF odds final

### Low Priority (Can Skip):
❌ **2am Wednesday** - Nothing changes
❌ **Every 15 minutes** - Wasteful
❌ **After games end** - Scores are final

---

## ESPN's Strategy (What We Should Copy)

**ESPN doesn't refresh constantly.** They:

1. **Cache aggressively** (hours, not minutes)
2. **Update on events** (game start/end)
3. **Manual refresh** (pull-to-refresh on mobile)
4. **WebSockets during games** (for live scores)

**We should do the same:**
- Cache for 2-4 hours
- Manual refresh button
- Auto-refresh only when needed

---

## Cost Comparison

### Current (Every 15 min):
- Calls/day: **96**
- Calls/month: **2,880**
- Cost: **$2,880/month** @ $1/call
- Efficiency: **10%** (90% wasted)

### Every 2 Hours:
- Calls/day: **12**
- Calls/month: **360**
- Cost: **$360/month**
- Efficiency: **70%**
- **Savings: $2,520/month**

### Game Days Only (Thu/Sun/Mon, 4x/day):
- Calls/week: **12**
- Calls/month: **~50**
- Cost: **$50/month**
- Efficiency: **95%**
- **Savings: $2,830/month**

---

## Recommended Implementation

### Phase 1: Reduce to Every 2 Hours (Done ✅)
```json
"schedule": "0 */2 * * *"
```

### Phase 2: Add Manual Refresh Button
- Let users refresh on-demand
- Show "Last updated: X minutes ago"
- Rate limit to prevent abuse

### Phase 3: Smart Schedule (Future)
- Only refresh on game days
- Detect if games are scheduled
- Skip refreshes when no games

---

## Cache Expiry Strategy

**Current:** 30 minutes TTL

**Better:**
- **Mon-Wed**: 24 hours TTL (nothing changes)
- **Thu-Sun**: 2 hours TTL (odds active)
- **During games**: 15 minutes TTL (scores updating)
- **After games**: 12 hours TTL (results final)

This matches actual data volatility!

---

## Bottom Line

**Every 15 minutes is overkill for NFL.**

**Better approach:**
1. ✅ Refresh every 2-4 hours
2. ✅ Add manual refresh button
3. ✅ Cache for longer during off-days
4. ✅ Save 90% on API costs

**Result:**
- Same user experience
- Much lower costs
- More efficient system
