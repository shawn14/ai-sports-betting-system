import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.NEXT_PUBLIC_ODDS_API_KEY;

// Fetch odds from ESPN (free, no API key needed)
async function getESPNOdds() {
  try {
    const response = await axios.get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    const games = response.data.events || [];

    return games.map((event: any) => {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors || [];
      const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
      const awayTeam = competitors.find((c: any) => c.homeAway === 'away');

      // Extract odds if available
      const odds = competition?.odds?.[0];

      // Use spread and overUnder directly from ESPN API
      const spread = parseFloat(odds?.spread) || null;
      const overUnder = parseFloat(odds?.overUnder) || null;

      return {
        id: event.id,
        gameId: event.id, // Add gameId field for easier matching
        sport_key: 'americanfootball_nfl',
        home_team: homeTeam?.team?.displayName,
        away_team: awayTeam?.team?.displayName,
        bookmakers: odds && spread !== null ? [{
          key: 'espn',
          title: 'ESPN',
          markets: [
            {
              key: 'spreads',
              outcomes: [
                {
                  name: homeTeam?.team?.displayName,
                  point: spread,
                  price: -110
                },
                {
                  name: awayTeam?.team?.displayName,
                  point: -spread,
                  price: -110
                }
              ]
            },
            ...(overUnder ? [{
              key: 'totals',
              outcomes: [{
                name: 'Over',
                point: overUnder,
                price: -110
              }]
            }] : [])
          ]
        }] : []
      };
    }).filter((game: any) => game.bookmakers.length > 0);
  } catch (error) {
    console.error('ESPN API Error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  // Try The Odds API FIRST (paid, has historical data)
  if (API_KEY) {
    try {
      console.log('Fetching odds from The Odds API (paid)...');
      const response = await axios.get(`${ODDS_API_BASE}/sports/americanfootball_nfl/odds`, {
        params: {
          apiKey: API_KEY,
          regions: 'us',
          markets: 'h2h,spreads,totals',
          oddsFormat: 'american',
          dateFormat: 'iso',
        },
      });

      console.log(`✅ Got ${response.data.length} games from The Odds API`);
      return NextResponse.json(response.data);
    } catch (error: any) {
      console.error('The Odds API Error:', error.response?.data || error.message);
      console.log('⚠️ The Odds API failed, falling back to ESPN...');
    }
  }

  // Fall back to ESPN (free, but only has upcoming games)
  console.log('Fetching odds from ESPN...');
  const espnOdds = await getESPNOdds();

  if (espnOdds.length > 0) {
    console.log(`✅ Got ${espnOdds.length} games from ESPN`);
    return NextResponse.json(espnOdds);
  }

  // Return empty array if both APIs fail
  console.log('❌ Both APIs failed - returning empty array (no odds available)');
  return NextResponse.json([]);
}
