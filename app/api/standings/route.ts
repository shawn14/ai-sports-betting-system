import { NextResponse } from 'next/server';
import { StandingsCacheService } from '@/lib/firebase/standingsCache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = parseInt(searchParams.get('season') || '2025');
    const week = parseInt(searchParams.get('week') || '15');
    const team = searchParams.get('team');

    if (team) {
      // Get single team standings
      const standings = await StandingsCacheService.getTeamStandings(season, week, team);

      if (!standings) {
        return NextResponse.json(
          { error: 'Standings not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(standings);
    } else {
      // Get all standings
      const standings = await StandingsCacheService.getStandings(season, week);

      if (!standings) {
        return NextResponse.json(
          { error: 'Standings not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(standings);
    }
  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    );
  }
}
