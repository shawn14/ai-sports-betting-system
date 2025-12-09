import { NextRequest, NextResponse } from 'next/server';
import { RankingsService } from '@/lib/services/rankingsService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const season = parseInt(searchParams.get('season') || '2025');
    const week = parseInt(searchParams.get('week') || '15');

    // Get rankings (from cache or calculate if needed)
    const teams = await RankingsService.getRankings(season, week);

    return NextResponse.json({ teams, season, week });
  } catch (error) {
    console.error('Error getting rankings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get rankings' },
      { status: 500 }
    );
  }
}
