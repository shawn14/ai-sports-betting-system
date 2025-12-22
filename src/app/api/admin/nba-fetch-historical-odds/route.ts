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
    }>;
  };
}

// Map our abbreviation to possible Odds API team name matches
const ABBR_TO_TEAM: Record<string, string[]> = {
  'ATL': ['Atlanta Hawks', 'Hawks', 'Atlanta'],
  'BOS': ['Boston Celtics', 'Celtics', 'Boston'],
  'BKN': ['Brooklyn Nets', 'Nets', 'Brooklyn'],
  'CHA': ['Charlotte Hornets', 'Hornets', 'Charlotte'],
  'CHI': ['Chicago Bulls', 'Bulls', 'Chicago'],
  'CLE': ['Cleveland Cavaliers', 'Cavaliers', 'Cleveland', 'Cavs'],
  'DAL': ['Dallas Mavericks', 'Mavericks', 'Dallas', 'Mavs'],
  'DEN': ['Denver Nuggets', 'Nuggets', 'Denver'],
  'DET': ['Detroit Pistons', 'Pistons', 'Detroit'],
  'GS': ['Golden State Warriors', 'Warriors', 'Golden State'],
  'GSW': ['Golden State Warriors', 'Warriors', 'Golden State'],
  'HOU': ['Houston Rockets', 'Rockets', 'Houston'],
  'IND': ['Indiana Pacers', 'Pacers', 'Indiana'],
  'LAC': ['Los Angeles Clippers', 'LA Clippers', 'Clippers'],
  'LAL': ['Los Angeles Lakers', 'LA Lakers', 'Lakers'],
  'MEM': ['Memphis Grizzlies', 'Grizzlies', 'Memphis'],
  'MIA': ['Miami Heat', 'Heat', 'Miami'],
  'MIL': ['Milwaukee Bucks', 'Bucks', 'Milwaukee'],
  'MIN': ['Minnesota Timberwolves', 'Timberwolves', 'Minnesota', 'Wolves'],
  'NO': ['New Orleans Pelicans', 'Pelicans', 'New Orleans'],
  'NOP': ['New Orleans Pelicans', 'Pelicans', 'New Orleans'],
  'NY': ['New York Knicks', 'Knicks', 'New York'],
  'NYK': ['New York Knicks', 'Knicks', 'New York'],
  'OKC': ['Oklahoma City Thunder', 'Thunder', 'Oklahoma City'],
  'ORL': ['Orlando Magic', 'Magic', 'Orlando'],
  'PHI': ['Philadelphia 76ers', '76ers', 'Philadelphia', 'Sixers'],
  'PHX': ['Phoenix Suns', 'Suns', 'Phoenix'],
  'POR': ['Portland Trail Blazers', 'Trail Blazers', 'Portland', 'Blazers'],
  'SAC': ['Sacramento Kings', 'Kings', 'Sacramento'],
  'SA': ['San Antonio Spurs', 'Spurs', 'San Antonio'],
  'SAS': ['San Antonio Spurs', 'Spurs', 'San Antonio'],
  'TOR': ['Toronto Raptors', 'Raptors', 'Toronto'],
  'UTA': ['Utah Jazz', 'Jazz', 'Utah'],
  'WAS': ['Washington Wizards', 'Wizards', 'Washington'],
  'WSH': ['Washington Wizards', 'Wizards', 'Washington'],
};

function matchesTeam(oddsTeamName: string, ourAbbr: string): boolean {
  const possibleNames = ABBR_TO_TEAM[ourAbbr];
  if (!possibleNames) return false;

  const oddsLower = oddsTeamName.toLowerCase();
  return possibleNames.some(name =>
    oddsLower.includes(name.toLowerCase()) || name.toLowerCase().includes(oddsLower)
  );
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
  const url = `${ODDS_API_BASE}/historical/sports/basketball_nba/odds/?apiKey=${apiKey}&regions=us&markets=spreads,totals&oddsFormat=american&date=${date}`;

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
  const limitParam = searchParams.get('limit');
  const startDateParam = searchParams.get('startDate'); // Format: YYYY-MM-DD

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
    // 1. Read existing NBA blob
    log('Reading NBA blob data...');
    const blobInfo = await head('nba-prediction-data.json');
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'No NBA blob data found' }, { status: 404 });
    }

    const response = await fetch(blobInfo.url);
    const blobData: BlobState = await response.json();

    const historicalOdds = blobData.historicalOdds || {};
    const games = blobData.backtest?.results || [];

    log(`Found ${games.length} games, ${Object.keys(historicalOdds).length} already have odds`);

    // 2. Filter games that need odds
    let gamesToFetch = games.filter(g => !historicalOdds[g.gameId]);

    // Optional: filter by start date
    if (startDateParam) {
      const startDate = new Date(startDateParam);
      gamesToFetch = gamesToFetch.filter(g => new Date(g.gameTime) >= startDate);
      log(`Filtering from ${startDateParam}: ${gamesToFetch.length} games`);
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

    await put('nba-prediction-data.json', jsonString, {
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
