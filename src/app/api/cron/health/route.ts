import { NextResponse } from 'next/server';
import { getSportState } from '@/services/firestore-admin-store';

type HealthSummary = {
  lastSyncAt?: string;
  lastBlobWriteAt?: string;
  lastBlobUrl?: string;
  lastBlobSizeKb?: number;
  season?: number;
  currentWeek?: number;
};

function summarize(state: any): HealthSummary | null {
  if (!state) return null;
  return {
    lastSyncAt: state.lastSyncAt,
    lastBlobWriteAt: state.lastBlobWriteAt,
    lastBlobUrl: state.lastBlobUrl,
    lastBlobSizeKb: state.lastBlobSizeKb,
    season: state.season,
    currentWeek: state.currentWeek,
  };
}

export async function GET() {
  try {
    const [nflState, nbaState] = await Promise.all([
      getSportState('nfl'),
      getSportState('nba'),
    ]);

    return NextResponse.json({
      nfl: summarize(nflState),
      nba: summarize(nbaState),
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to load cron health',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
