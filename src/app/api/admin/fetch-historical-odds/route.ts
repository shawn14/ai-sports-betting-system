import { NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';
import { saveDocsBatch } from '@/services/firestore-admin-store';
import { SportKey } from '@/services/firestore-types';

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

const sport: SportKey = 'nfl';

async function fetchESPNOdds(eventId: string): Promise<{ homeSpread: number; total: number } | null> {
  try {
    const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${eventId}/competitions/${eventId}/odds`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const odds = data.items?.[0];
    if (!odds) return null;

    const homeSpread = odds.spread;
    const total = odds.overUnder;
    if (homeSpread === undefined || total === undefined) return null;

    return { homeSpread, total };
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get('week');
  const limitParam = searchParams.get('limit');

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

    // 3. Fetch historical odds per game via ESPN (no API key)
    let fetchedCount = 0;
    let matchedCount = 0;

    for (const game of gamesToFetch) {
      if (!game.gameId) continue;
      const odds = await fetchESPNOdds(game.gameId);
      fetchedCount++;

      if (odds) {
        historicalOdds[game.gameId] = {
          vegasSpread: odds.homeSpread,
          vegasTotal: odds.total,
          capturedAt: new Date().toISOString(),
        };
        matchedCount++;
      }

      if (fetchedCount % 25 === 0) {
        log(`Processed ${fetchedCount}/${gamesToFetch.length} games...`);
      }

      // Avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
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

    if (matchedCount > 0) {
      const oddsDocs = Object.entries(historicalOdds).map(([gameId, odds]) => ({
        id: gameId,
        data: {
          ...odds,
          gameId,
          sport,
          updatedAt: new Date().toISOString(),
        },
      }));
      await saveDocsBatch(sport, 'oddsLocks', oddsDocs);
    }

    log('Done!');

    return NextResponse.json({
      success: true,
      stats: {
        totalGames: games.length,
        gamesNeededOdds: gamesToFetch.length,
        apiCalls: fetchedCount,
        eventsFound: matchedCount,
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
