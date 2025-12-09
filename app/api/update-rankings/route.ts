import { NextRequest, NextResponse } from 'next/server';
import { RankingsService } from '@/lib/services/rankingsService';
import { NFLAPI } from '@/lib/api/nfl';

/**
 * API route to manually trigger rankings update
 * Call this after games complete to refresh rankings
 */
export async function POST(request: NextRequest) {
  try {
    // Get current season and week
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();

    console.log(`Updating rankings for ${season} week ${week}...`);

    // Force recalculation of rankings
    const teams = await RankingsService.calculateAndCacheRankings(season, week);

    return NextResponse.json({
      success: true,
      message: `Rankings updated for ${season} week ${week}`,
      teamsUpdated: teams.length,
      season,
      week,
      topTeams: teams.slice(0, 5).map(t => ({ team: t.team, tsr: t.tsr, rank: t.rank }))
    });
  } catch (error) {
    console.error('Error updating rankings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update rankings'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check when rankings were last updated
 */
export async function GET(request: NextRequest) {
  try {
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();
    const rankings = await RankingsService.getCachedRankings(season, week);

    if (!rankings) {
      return NextResponse.json({
        cached: false,
        message: 'No cached rankings found. Call POST to generate.'
      });
    }

    return NextResponse.json({
      cached: true,
      season,
      week,
      teamsCount: rankings.length,
      topTeam: rankings[0]
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check rankings' },
      { status: 500 }
    );
  }
}
