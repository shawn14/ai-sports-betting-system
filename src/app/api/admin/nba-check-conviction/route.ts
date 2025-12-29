import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

const NBA_BLOB_NAME = 'nba-prediction-data.json';

export async function GET() {
  try {
    const blobInfo = await head(NBA_BLOB_NAME);
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'NBA blob not found' }, { status: 404 });
    }

    const blobRes = await fetch(blobInfo.url, { cache: 'no-store' });
    const blobData = await blobRes.json();

    const games = blobData.games || [];

    // Check conviction data for each game
    const convictionSummary = games.map((g: any) => ({
      matchup: `${g.game?.awayTeam?.abbreviation || 'TBD'} @ ${g.game?.homeTeam?.abbreviation || 'TBD'}`,
      status: g.game?.status,
      conviction: g.prediction?.conviction,
      isAtsBestBet: g.prediction?.isAtsBestBet,
      vegasSpread: g.prediction?.vegasSpread,
      predictedSpread: g.prediction?.predictedSpread,
    }));

    // Count by conviction level
    const byLevel = {
      elite: games.filter((g: any) => g.prediction?.conviction?.level === 'elite').length,
      high: games.filter((g: any) => g.prediction?.conviction?.level === 'high').length,
      moderate: games.filter((g: any) => g.prediction?.conviction?.level === 'moderate').length,
      low: games.filter((g: any) => g.prediction?.conviction?.level === 'low').length,
      missing: games.filter((g: any) => !g.prediction?.conviction).length,
    };

    const bestBets = games.filter((g: any) => g.prediction?.isAtsBestBet);

    return NextResponse.json({
      totalGames: games.length,
      convictionBreakdown: byLevel,
      bestBetsCount: bestBets.length,
      games: convictionSummary,
      bestBets: bestBets.map((g: any) => ({
        matchup: `${g.game?.awayTeam?.abbreviation} @ ${g.game?.homeTeam?.abbreviation}`,
        conviction: g.prediction?.conviction,
        vegasSpread: g.prediction?.vegasSpread,
      })),
    });

  } catch (error) {
    console.error('Check conviction error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
