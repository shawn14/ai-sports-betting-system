import { NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

interface HistoricalOdds {
  vegasSpread: number;
  vegasTotal: number;
  capturedAt: string;
}

interface BlobState {
  generated: string;
  teams: unknown[];
  processedGameIds: string[];
  historicalOdds: Record<string, HistoricalOdds>;
  games: unknown[];
  recentGames: unknown[];
  backtest: {
    summary: unknown;
    results: Array<{
      gameId: string;
      gameTime: string;
      homeTeam: string;
      awayTeam: string;
      week: number;
    }>;
  };
}

// Team name variants for matching
const TEAM_NAME_VARIANTS: Record<string, string[]> = {
  'Arizona Cardinals': ['Cardinals', 'Arizona', 'ARI'],
  'Atlanta Falcons': ['Falcons', 'Atlanta', 'ATL'],
  'Baltimore Ravens': ['Ravens', 'Baltimore', 'BAL'],
  'Buffalo Bills': ['Bills', 'Buffalo', 'BUF'],
  'Carolina Panthers': ['Panthers', 'Carolina', 'CAR'],
  'Chicago Bears': ['Bears', 'Chicago', 'CHI'],
  'Cincinnati Bengals': ['Bengals', 'Cincinnati', 'CIN'],
  'Cleveland Browns': ['Browns', 'Cleveland', 'CLE'],
  'Dallas Cowboys': ['Cowboys', 'Dallas', 'DAL'],
  'Denver Broncos': ['Broncos', 'Denver', 'DEN'],
  'Detroit Lions': ['Lions', 'Detroit', 'DET'],
  'Green Bay Packers': ['Packers', 'Green Bay', 'GB'],
  'Houston Texans': ['Texans', 'Houston', 'HOU'],
  'Indianapolis Colts': ['Colts', 'Indianapolis', 'IND'],
  'Jacksonville Jaguars': ['Jaguars', 'Jacksonville', 'JAX'],
  'Kansas City Chiefs': ['Chiefs', 'Kansas City', 'KC'],
  'Las Vegas Raiders': ['Raiders', 'Las Vegas', 'LV'],
  'Los Angeles Chargers': ['Chargers', 'LA Chargers', 'LAC'],
  'Los Angeles Rams': ['Rams', 'LA Rams', 'LAR'],
  'Miami Dolphins': ['Dolphins', 'Miami', 'MIA'],
  'Minnesota Vikings': ['Vikings', 'Minnesota', 'MIN'],
  'New England Patriots': ['Patriots', 'New England', 'NE'],
  'New Orleans Saints': ['Saints', 'New Orleans', 'NO'],
  'New York Giants': ['Giants', 'NY Giants', 'NYG'],
  'New York Jets': ['Jets', 'NY Jets', 'NYJ'],
  'Philadelphia Eagles': ['Eagles', 'Philadelphia', 'PHI'],
  'Pittsburgh Steelers': ['Steelers', 'Pittsburgh', 'PIT'],
  'San Francisco 49ers': ['49ers', 'San Francisco', 'SF'],
  'Seattle Seahawks': ['Seahawks', 'Seattle', 'SEA'],
  'Tampa Bay Buccaneers': ['Buccaneers', 'Tampa Bay', 'TB'],
  'Tennessee Titans': ['Titans', 'Tennessee', 'TEN'],
  'Washington Commanders': ['Commanders', 'Washington', 'WAS'],
};

function matchesTeam(oddsTeamName: string, ourAbbr: string): boolean {
  for (const [fullName, variants] of Object.entries(TEAM_NAME_VARIANTS)) {
    if (oddsTeamName.includes(fullName) || fullName.includes(oddsTeamName)) {
      if (variants.includes(ourAbbr)) return true;
    }
    // Also check if odds team name contains any variant
    for (const variant of variants) {
      if (oddsTeamName.includes(variant) && variants.includes(ourAbbr)) {
        return true;
      }
    }
  }
  return false;
}

interface OddsAPIEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: Array<{
    key: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

async function fetchHistoricalOdds(date: string, apiKey: string): Promise<OddsAPIEvent[]> {
  const url = `${ODDS_API_BASE}/historical/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=spreads,totals&oddsFormat=american&date=${date}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Historical odds fetch failed for ${date}: ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

function getConsensusFromBookmakers(event: OddsAPIEvent): { spread: number; total: number } | null {
  const spreads: number[] = [];
  const totals: number[] = [];

  for (const bookmaker of event.bookmakers) {
    const spreadMarket = bookmaker.markets.find(m => m.key === 'spreads');
    const totalMarket = bookmaker.markets.find(m => m.key === 'totals');

    if (spreadMarket) {
      const homeSpread = spreadMarket.outcomes.find(o => o.name === event.home_team);
      if (homeSpread?.point !== undefined) {
        spreads.push(homeSpread.point);
      }
    }

    if (totalMarket) {
      const over = totalMarket.outcomes.find(o => o.name === 'Over');
      if (over?.point !== undefined && over.point > 0) {
        totals.push(over.point);
      }
    }
  }

  if (spreads.length === 0 || totals.length === 0) return null;

  const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const avgTotal = totals.reduce((a, b) => a + b, 0) / totals.length;

  return {
    spread: Math.round(avgSpread * 2) / 2,
    total: Math.round(avgTotal * 2) / 2,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get('week');
  const limitParam = searchParams.get('limit');

  const apiKey = process.env.NEXT_PUBLIC_ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Odds API key not configured' }, { status: 500 });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    // 1. Read existing blob
    log('Reading blob data...');
    const blobInfo = await head('prediction-matrix-data.json');
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'No blob data found' }, { status: 404 });
    }

    const response = await fetch(blobInfo.url);
    const blobData: BlobState = await response.json();

    const historicalOdds = blobData.historicalOdds || {};
    const games = blobData.backtest?.results || [];

    log(`Found ${games.length} games, ${Object.keys(historicalOdds).length} already have odds`);

    // 2. Filter games that need odds
    let gamesToFetch = games.filter(g => !historicalOdds[g.gameId]);

    if (weekParam) {
      const week = parseInt(weekParam);
      gamesToFetch = gamesToFetch.filter(g => g.week === week);
      log(`Filtering to week ${week}: ${gamesToFetch.length} games`);
    }

    if (limitParam) {
      const limit = parseInt(limitParam);
      gamesToFetch = gamesToFetch.slice(0, limit);
      log(`Limiting to ${limit} games`);
    }

    log(`Need to fetch odds for ${gamesToFetch.length} games`);

    // 3. Group games by date
    const gamesByDate = new Map<string, typeof gamesToFetch>();
    for (const game of gamesToFetch) {
      const gameDate = new Date(game.gameTime);
      // Use date at noon to capture games that day
      const dateKey = `${gameDate.toISOString().split('T')[0]}T12:00:00Z`;

      if (!gamesByDate.has(dateKey)) {
        gamesByDate.set(dateKey, []);
      }
      gamesByDate.get(dateKey)!.push(game);
    }

    log(`Fetching odds for ${gamesByDate.size} unique dates`);

    // 4. Fetch historical odds for each date
    let fetchedCount = 0;
    let matchedCount = 0;
    let apiCalls = 0;

    for (const [date, dateGames] of gamesByDate) {
      log(`Fetching odds for ${date} (${dateGames.length} games)...`);

      const events = await fetchHistoricalOdds(date, apiKey);
      apiCalls++;
      fetchedCount += events.length;

      log(`  Got ${events.length} events from API`);

      // Match events to our games
      for (const game of dateGames) {
        for (const event of events) {
          const homeMatch = matchesTeam(event.home_team, game.homeTeam);
          const awayMatch = matchesTeam(event.away_team, game.awayTeam);

          if (homeMatch && awayMatch) {
            const consensus = getConsensusFromBookmakers(event);
            if (consensus) {
              historicalOdds[game.gameId] = {
                vegasSpread: consensus.spread,
                vegasTotal: consensus.total,
                capturedAt: new Date().toISOString(),
              };
              matchedCount++;
              log(`  Matched: ${game.awayTeam} @ ${game.homeTeam} → Spread: ${consensus.spread}, Total: ${consensus.total}`);
            }
            break;
          }
        }
      }

      // Rate limit - wait 1 second between API calls
      if (gamesByDate.size > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    log(`Matched ${matchedCount} games with historical odds`);
    log(`Total historical odds records: ${Object.keys(historicalOdds).length}`);

    // 5. Update blob with new historical odds
    blobData.historicalOdds = historicalOdds;
    blobData.generated = new Date().toISOString();

    const jsonString = JSON.stringify(blobData);
    log(`Uploading updated blob (${Math.round(jsonString.length / 1024)}KB)...`);

    await put('prediction-matrix-data.json', jsonString, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    log('Done!');

    return NextResponse.json({
      success: true,
      stats: {
        totalGames: games.length,
        gamesNeededOdds: gamesToFetch.length,
        apiCalls,
        eventsFound: fetchedCount,
        matchedGames: matchedCount,
        totalHistoricalOdds: Object.keys(historicalOdds).length,
      },
      logs,
    });
  } catch (error) {
    console.error('Historical odds fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch historical odds',
      message: error instanceof Error ? error.message : 'Unknown error',
      logs,
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
