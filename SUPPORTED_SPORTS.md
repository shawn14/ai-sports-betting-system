# The Odds API - Supported Sports

Your Odds API key supports dozens of sports! Here's what's available:

## Available Sports

### American Football
- `americanfootball_nfl` - NFL (Currently implemented ✓)
- `americanfootball_ncaaf` - NCAA College Football

### Basketball
- `basketball_nba` - NBA
- `basketball_ncaab` - NCAA College Basketball
- `basketball_wnba` - WNBA
- `basketball_euroleague` - Euroleague Basketball

### Baseball
- `baseball_mlb` - MLB

### Soccer (Football)
- `soccer_epl` - English Premier League
- `soccer_uefa_champs_league` - UEFA Champions League
- `soccer_spain_la_liga` - Spanish La Liga
- `soccer_italy_serie_a` - Italian Serie A
- `soccer_germany_bundesliga` - German Bundesliga
- `soccer_france_ligue_one` - French Ligue 1
- `soccer_efl_champ` - English Championship
- `soccer_usa_mls` - MLS
- `soccer_brazil_campeonato` - Brazilian Serie A
- `soccer_mexico_ligamx` - Liga MX
- And many more leagues...

### Hockey
- `icehockey_nhl` - NHL

### Tennis
- `tennis_atp_french_open` - ATP French Open
- `tennis_atp_us_open` - ATP US Open
- `tennis_atp_wimbledon` - ATP Wimbledon
- `tennis_wta_french_open` - WTA French Open
- And more...

### Combat Sports
- `mma_mixed_martial_arts` - MMA (UFC, Bellator, etc.)
- `boxing_boxing` - Boxing

### Golf
- `golf_pga_championship` - PGA Championship
- `golf_masters` - The Masters
- `golf_us_open` - US Open

### Other Sports
- `aussierules_afl` - Australian Rules Football
- `cricket_test_match` - Cricket Test Matches
- `rugbyleague_nrl` - Rugby League NRL
- `baseball_mlb` - MLB

## How to Get Full List

You can get the complete current list by making a request to:
```
https://api.the-odds-api.com/v4/sports/?apiKey=YOUR_KEY
```

## How to Add Other Sports to Your System

### Quick Example: Add NBA

1. **Create NBA API file** (`lib/api/nba.ts`):
```typescript
// Similar to nfl.ts but for NBA
export class NBAAPI {
  static async getGames() {
    // Fetch from ESPN NBA API or similar
  }
}
```

2. **Update Odds API call**:
```typescript
// In lib/api/odds.ts
static async getNBAOdds() {
  return this.request('/sports/basketball_nba/odds', {
    regions: 'us',
    markets: 'h2h,spreads,totals',
    oddsFormat: 'american',
  });
}
```

3. **Create NBA prediction model**:
```typescript
// Different factors for basketball
// - Home court advantage (less than NFL)
// - Back-to-back games
// - Travel/rest
// - Pace of play
```

4. **Create NBA pages**:
- `/app/nba/page.tsx` - Games list
- `/app/nba/predictions/page.tsx` - Predictions

## Multi-Sport System Architecture

Here's how you could expand this to a multi-sport betting platform:

```
nfl-betting-system/
├── app/
│   ├── nfl/              # NFL section
│   ├── nba/              # NBA section
│   ├── mlb/              # MLB section
│   ├── soccer/           # Soccer section
│   └── dashboard/        # Multi-sport dashboard
├── lib/
│   ├── api/
│   │   ├── nfl.ts
│   │   ├── nba.ts
│   │   ├── mlb.ts
│   │   └── odds.ts       # Universal odds fetcher
│   └── models/
│       ├── nfl-predictor.ts
│       ├── nba-predictor.ts
│       └── base-predictor.ts  # Shared logic
```

## API Rate Limits

**Free Tier:**
- 500 requests per month
- Covers all sports combined

**Paid Tiers:**
- Starter: $25/mo - 5,000 requests
- Pro: $75/mo - 25,000 requests
- Enterprise: Custom pricing

## Data Available Per Sport

For most sports, you get:
- **Moneyline** (H2H - Head to Head)
- **Spreads** (Point spread/handicap)
- **Totals** (Over/Under)
- **Player Props** (additional markets - premium)
- **Futures** (season-long bets - additional endpoint)

## Sport-Specific Considerations

### NBA
- Faster scoring = different modeling
- Player injuries have HUGE impact
- Back-to-back games matter
- Home court less important than NFL

### MLB
- Starting pitchers are critical
- Weather impacts more (wind, rain)
- Moneyline more common than spread
- Run line = -1.5/+1.5 (static)

### Soccer
- Lower scoring = harder to predict
- 3-way lines (Win/Draw/Win)
- Asian handicaps
- Both teams to score

### NHL
- Puck line = -1.5/+1.5 (like MLB)
- Goaltender matchups critical
- Special teams (PP/PK) important

## Example: Adding NBA Support

If you want me to add NBA betting to this system, I can:

1. Create NBA data fetchers (ESPN NBA API)
2. Build NBA prediction model with:
   - Offensive/Defensive ratings
   - Pace of play analysis
   - Home court advantage
   - Back-to-back penalties
   - Star player impact
3. Create NBA pages (games, predictions, analytics)
4. Add to the navigation

Would take about 30-60 minutes to implement!

## Testing Other Sports

You can test if odds are available for a sport right now:

```bash
curl "https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=63e9e5682a42fb5568c8f3aa7f4ae11e&regions=us&markets=h2h,spreads,totals"
```

Replace `basketball_nba` with any sport code above.

---

**Want me to add another sport to your betting system?** Let me know which one and I'll build it out!
