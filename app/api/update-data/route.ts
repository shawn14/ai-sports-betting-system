import { NextResponse } from 'next/server';
import { NFLAPI } from '@/lib/api/nfl';
import { OddsAPI } from '@/lib/api/odds';
import { WeatherAPI } from '@/lib/api/weather';
import { MatrixHelper } from '@/lib/models/matrixHelper';
import { FirestoreService } from '@/lib/firebase/firestore';

/**
 * Background Data Update API Route
 *
 * This endpoint updates all predictions and caches them in Firebase.
 * Call this endpoint:
 * - Every 15-30 minutes via cron job
 * - Manually when user clicks "Refresh Data"
 *
 * Usage:
 * - Automated: Set up cron job to call: POST /api/update-data
 * - Manual: Call from UI with refresh button
 */
export async function POST(request: Request) {
  try {
    console.log('🔄 Starting data update...');
    const startTime = Date.now();

    // Get current season and week
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();
    console.log(`📅 Current: ${season} Season, Week ${week}`);

    // Fetch all games for the week
    const weekGames = await NFLAPI.getWeekGames(season, week);
    console.log(`🏈 Found ${weekGames.length} games`);

    // Fetch betting odds
    let oddsData: any[] = [];
    try {
      oddsData = await OddsAPI.getNFLOdds();
      console.log(`💰 Fetched odds for ${oddsData.length} games`);
    } catch (error) {
      console.error('⚠️  Error fetching odds:', error);
    }

    // Generate predictions for each game
    const results = {
      updated: 0,
      errors: 0,
      games: [] as any[]
    };

    // Check if standings data is available
    const hasStandings = await MatrixHelper.hasStandingsData(season, week);
    if (!hasStandings) {
      console.error(`⚠️  Missing standings data for ${season} week ${week}`);
      return NextResponse.json(
        {
          success: false,
          error: `Missing standings data for ${season} week ${week}. Please run: npm run scrape-standings ${season} ${week}`,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    for (const game of weekGames) {
      try {
        if (game.status === 'scheduled') {
          // Find betting lines
          let bettingLines;
          const gameOdds = oddsData.find((o: any) => {
            const matchHome = o.home_team?.toLowerCase().includes(game.homeTeam.name.toLowerCase()) ||
                             o.home_team?.toLowerCase().includes(game.homeTeam.abbreviation.toLowerCase());
            const matchAway = o.away_team?.toLowerCase().includes(game.awayTeam.name.toLowerCase()) ||
                             o.away_team?.toLowerCase().includes(game.awayTeam.abbreviation.toLowerCase());
            return matchHome && matchAway;
          });

          if (gameOdds) {
            bettingLines = OddsAPI.transformToBettingLines(gameOdds);
          }

          // Generate prediction using Matrix system
          const prediction = await MatrixHelper.predictGame(
            game,
            season,
            week,
            'balanced',
            bettingLines
          );

          // Save to Firebase (this creates the cache)
          await FirestoreService.saveGame(game);
          await FirestoreService.savePrediction(prediction);
          if (bettingLines && bettingLines.length > 0) {
            await FirestoreService.saveBettingLines(game.id, bettingLines);
          }

          results.updated++;
          results.games.push({
            id: game.id,
            matchup: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`,
            confidence: prediction.confidence,
            recommendation: prediction.recommendation
          });

          console.log(`✅ Updated: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
        }
      } catch (error) {
        console.error(`❌ Error processing game ${game.id}:`, error);
        results.errors++;
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✨ Data update complete in ${duration}ms`);
    console.log(`   Updated: ${results.updated} games`);
    console.log(`   Errors: ${results.errors} games`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      season,
      week,
      duration,
      stats: {
        total: weekGames.length,
        updated: results.updated,
        errors: results.errors
      },
      games: results.games
    });

  } catch (error) {
    console.error('❌ Fatal error in data update:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check last update status
 */
export async function GET() {
  try {
    // Get metadata from Firebase about last update
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();

    // This would query Firebase for the most recent prediction timestamp
    // For now, return basic info
    return NextResponse.json({
      season,
      week,
      message: 'Use POST to trigger data update'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get update status' },
      { status: 500 }
    );
  }
}
