/**
 * Generate Game Intelligence for Upcoming Games
 * Called by cron job every 2 hours on game days to generate
 * injury/weather/news intelligence ~1 hour before kickoff
 */

import { NextRequest, NextResponse } from 'next/server';
import { NFLAPI } from '@/lib/api/nfl';
import { upsertDocument, getDocument } from '@/lib/firebase/restClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for processing multiple games

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  console.log('🎯 Generate game intelligence cron job triggered');

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();
    console.log(`📅 Processing: ${season} Week ${week}`);

    // Fetch all games for current week
    const games = await NFLAPI.getWeekGames(season, week);
    console.log(`✅ Found ${games.length} games this week`);

    const now = new Date();
    const eligibleGames = [];

    // Filter games that are:
    // 1. Scheduled (not completed or in progress)
    // 2. Starting within next 60-90 minutes
    for (const game of games) {
      if (game.status !== 'scheduled') {
        continue;
      }

      const gameTime = new Date(game.gameTime);
      const minutesUntilKickoff = (gameTime.getTime() - now.getTime()) / (1000 * 60);

      // Check if game is within 60-90 minute window
      if (minutesUntilKickoff >= 60 && minutesUntilKickoff <= 90) {
        // Check if intelligence already cached
        const cached = await getDocument('game_intelligence_cache', game.id);
        if (!cached) {
          eligibleGames.push({ ...game, minutesUntilKickoff });
        } else {
          console.log(`ℹ️  Intelligence already cached for ${game.awayTeam.name} @ ${game.homeTeam.name}`);
        }
      }
    }

    console.log(`🎲 ${eligibleGames.length} games eligible for intelligence generation`);

    let intelligenceGenerated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Generate intelligence for each eligible game
    for (const game of eligibleGames) {
      try {
        console.log(`🔍 Generating intelligence for ${game.awayTeam.name} @ ${game.homeTeam.name} (${Math.round(game.minutesUntilKickoff)} min until kickoff)`);

        // Call the game intelligence API
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/game-intelligence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            homeTeam: game.homeTeam.name,
            awayTeam: game.awayTeam.name,
            gameDate: game.gameTime.toISOString(),
            location: game.venue || `${game.homeTeam.name} stadium`
          })
        });

        if (!response.ok) {
          throw new Error(`Game intelligence API returned ${response.status}`);
        }

        const { intelligence } = await response.json();

        // Save to Firestore cache
        await upsertDocument('game_intelligence_cache', game.id, {
          gameId: game.id,
          season,
          week,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name,
          gameTime: game.gameTime.toISOString(),
          intelligence,
          minutesBeforeKickoff: Math.round(game.minutesUntilKickoff),
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(game.gameTime.getTime() + 24 * 60 * 60 * 1000).toISOString() // Expires 24 hours after game
        });

        intelligenceGenerated++;
        console.log(`✅ Intelligence cached for game ${game.id}`);

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (gameError: any) {
        console.error(`❌ Error processing game ${game.id}:`, gameError.message);
        errors.push(`Game ${game.id}: ${gameError.message}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      season,
      week,
      summary: {
        totalGames: games.length,
        eligibleGames: eligibleGames.length,
        intelligenceGenerated,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
