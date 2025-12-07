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

      return {
        id: event.id,
        sport_key: 'americanfootball_nfl',
        home_team: homeTeam?.team?.displayName,
        away_team: awayTeam?.team?.displayName,
        bookmakers: odds ? [{
          key: 'espn',
          title: 'ESPN',
          markets: [{
            key: 'spreads',
            outcomes: [
              {
                name: homeTeam?.team?.displayName,
                point: parseFloat(odds.details?.split(' ')[1]) || 0,
                price: -110
              },
              {
                name: awayTeam?.team?.displayName,
                point: -(parseFloat(odds.details?.split(' ')[1]) || 0),
                price: -110
              }
            ]
          }]
        }] : []
      };
    }).filter((game: any) => game.bookmakers.length > 0);
  } catch (error) {
    console.error('ESPN API Error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  // Try ESPN first (free, no API key needed)
  console.log('Fetching odds from ESPN...');
  const espnOdds = await getESPNOdds();

  if (espnOdds.length > 0) {
    console.log(`✅ Got ${espnOdds.length} games from ESPN`);
    return NextResponse.json(espnOdds);
  }

  // Fall back to The Odds API if ESPN fails
  try {
    console.log('ESPN failed, trying The Odds API...');
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

    // Return empty array if both APIs fail - NO MOCK DATA
    console.log('❌ Both APIs failed - returning empty array (no odds available)');
    return NextResponse.json([]);
  }
}
