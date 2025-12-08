import { NextRequest, NextResponse } from 'next/server';
import { NFLAPI } from '@/lib/api/nfl';
import { OddsAPI } from '@/lib/api/odds';
import { MatrixHelper } from '@/lib/models/matrixHelper';
import { FirestoreService } from '@/lib/firebase/firestore';

/**
 * API Route: Refresh Data
 *
 * This endpoint fetches fresh data from ESPN and The Odds API,
 * runs predictions, and caches everything in Firebase.
 *
 * Call this from a cron job every 15-30 minutes to keep data fresh.
 *
 * Usage:
 * - Vercel Cron: Configure in vercel.json
 * - Manual: GET /api/refresh-data?secret=YOUR_SECRET
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max execution

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Security: Check for secret token
    const authHeader = request.headers.get('authorization');
    const urlSecret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || process.env.API_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}` && urlSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting data refresh...');

    // 1. Get current season/week
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();
    console.log(`📅 Season ${season}, Week ${week}`);

    // 2. Fetch games from ESPN
    const weekGames = await NFLAPI.getWeekGames(season, week);
    // Include all games (scheduled, in_progress, completed) for current week
    const scheduledGames = weekGames; // Don't filter - show all games
    console.log(`🏈 Found ${scheduledGames.length} total games (${weekGames.filter(g => g.status === 'scheduled').length} scheduled, ${weekGames.filter(g => g.status === 'in_progress').length} in progress, ${weekGames.filter(g => g.status === 'completed').length} completed)`);

    // 3. Fetch odds from The Odds API
    let oddsData: any[] = [];
    try {
      oddsData = await OddsAPI.getNFLOdds();
      console.log(`💰 Fetched odds for ${oddsData.length} games`);
    } catch (error) {
      console.error('Failed to fetch odds:', error);
    }

    // 4. Save games to Firebase
    await Promise.all(scheduledGames.map(game => FirestoreService.saveGame(game)));
    console.log(`✅ Saved ${scheduledGames.length} games to Firebase`);

    // 5. Check standings data availability
    const hasStandings = await MatrixHelper.hasStandingsData(season, week);
    if (!hasStandings) {
      console.error(`⚠️  Missing standings data for ${season} week ${week}`);
      return NextResponse.json({
        error: `Missing standings data for ${season} week ${week}. Please run: npm run scrape-standings ${season} ${week}`,
        success: false
      }, { status: 400 });
    }

    // 6. Generate and save predictions using Matrix system
    const predictions = [];
    const oddsCache = new Map();

    for (const game of scheduledGames) {
      try {
        // Find betting lines
        const gameOdds = oddsData.find((o: any) => {
          const matchHome = o.home_team?.toLowerCase().includes(game.homeTeam.name.toLowerCase()) ||
                           o.home_team?.toLowerCase().includes(game.homeTeam.abbreviation.toLowerCase());
          const matchAway = o.away_team?.toLowerCase().includes(game.awayTeam.name.toLowerCase()) ||
                           o.away_team?.toLowerCase().includes(game.awayTeam.abbreviation.toLowerCase());
          return matchHome && matchAway;
        });

        let bettingLines;
        if (gameOdds) {
          bettingLines = OddsAPI.transformToBettingLines(gameOdds);
          oddsCache.set(game.id, gameOdds); // Cache for later
        }

        // Generate prediction using Matrix system
        const prediction = await MatrixHelper.predictGame(
          game,
          season,
          week,
          'balanced',
          bettingLines
        );

        // Save prediction to Firebase
        await FirestoreService.savePrediction(prediction);
        predictions.push(prediction);

        console.log(`✅ Generated prediction for ${game.homeTeam.abbreviation} vs ${game.awayTeam.abbreviation}`);
      } catch (error) {
        console.error(`Failed to generate prediction for game ${game.id}:`, error);
      }
    }

    // 7. Cache odds data separately for quick access
    await saveOddsCache(season, week, oddsData);

    const duration = Date.now() - startTime;
    console.log(`✅ Data refresh complete in ${duration}ms`);

    return NextResponse.json({
      success: true,
      season,
      week,
      gamesCount: scheduledGames.length,
      predictionsCount: predictions.length,
      oddsCount: oddsData.length,
      duration,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Data refresh failed:', error);
    return NextResponse.json({
      error: 'Data refresh failed',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * Save odds data to Firebase for quick access
 */
async function saveOddsCache(season: number, week: number, oddsData: any[]) {
  try {
    const cacheDoc = {
      season,
      week,
      odds: oddsData,
      lastUpdate: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };

    await FirestoreService.saveOddsCache(cacheDoc);
    console.log(`✅ Cached ${oddsData.length} odds entries`);
  } catch (error) {
    console.error('Failed to cache odds:', error);
  }
}
