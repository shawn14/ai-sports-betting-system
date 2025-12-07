import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.NEXT_PUBLIC_ODDS_API_KEY;

/**
 * Fetch historical odds for a completed game
 * This is expensive (10 credits vs 1 for live odds) so only use as fallback
 *
 * Query params:
 * - gameId: The game ID from ESPN/NFL API
 * - gameTime: ISO timestamp of when the game started
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameId = searchParams.get('gameId');
  const gameTime = searchParams.get('gameTime');

  if (!gameId || !gameTime) {
    return NextResponse.json({ error: 'Missing gameId or gameTime' }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 500 });
  }

  try {
    console.log(`🔍 Fetching historical odds for game ${gameId} at ${gameTime} (costs 10 credits)`);

    // The Odds API historical endpoint requires a timestamp close to when the game started
    // We'll query for odds 1 hour before game time to get closing lines
    const gameDate = new Date(gameTime);
    const queryTime = new Date(gameDate.getTime() - 60 * 60 * 1000); // 1 hour before game
    const isoTime = queryTime.toISOString();

    const response = await axios.get(
      `${ODDS_API_BASE}/historical/sports/americanfootball_nfl/odds`,
      {
        params: {
          apiKey: API_KEY,
          regions: 'us',
          markets: 'spreads',
          oddsFormat: 'american',
          dateFormat: 'iso',
          date: isoTime,
        },
      }
    );

    // Find the game in the response
    const games = response.data;
    const game = games.find((g: any) => g.id === gameId);

    if (!game) {
      console.log(`❌ Game ${gameId} not found in historical odds`);
      return NextResponse.json({ error: 'Game not found in historical data' }, { status: 404 });
    }

    console.log(`✅ Found historical odds for game ${gameId}`);
    return NextResponse.json(game);
  } catch (error: any) {
    console.error('Historical Odds API Error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to fetch historical odds', details: error.message },
      { status: 500 }
    );
  }
}
