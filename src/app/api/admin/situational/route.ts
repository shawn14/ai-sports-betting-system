import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

interface BacktestGame {
  gameId: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeElo: number;
  awayElo: number;
  predictedSpread: number;
  predictedTotal: number;
  actualSpread: number;
  actualTotal: number;
  vegasSpread?: number;
  vegasTotal?: number;
  atsResult?: 'win' | 'loss' | 'push';
  spreadResult?: 'win' | 'loss' | 'push';
}

interface SituationResult {
  name: string;
  description: string;
  games: number;
  atsWins: number;
  atsLosses: number;
  atsPushes: number;
  atsWinPct: number;
  directionalWins: number;
  directionalLosses: number;
  directionalWinPct: number;
}

// NFL divisions for divisional game detection
const DIVISIONS: Record<string, string[]> = {
  'AFC East': ['BUF', 'MIA', 'NE', 'NYJ'],
  'AFC North': ['BAL', 'CIN', 'CLE', 'PIT'],
  'AFC South': ['HOU', 'IND', 'JAX', 'TEN'],
  'AFC West': ['DEN', 'KC', 'LAC', 'LV'],
  'NFC East': ['DAL', 'NYG', 'PHI', 'WAS'],
  'NFC North': ['CHI', 'DET', 'GB', 'MIN'],
  'NFC South': ['ATL', 'CAR', 'NO', 'TB'],
  'NFC West': ['ARI', 'LAR', 'SEA', 'SF'],
};

function getTeamDivision(abbr: string): string | null {
  for (const [division, teams] of Object.entries(DIVISIONS)) {
    if (teams.includes(abbr)) return division;
  }
  return null;
}

function isDivisionalGame(homeTeam: string, awayTeam: string): boolean {
  const homeDivision = getTeamDivision(homeTeam);
  const awayDivision = getTeamDivision(awayTeam);
  return homeDivision !== null && homeDivision === awayDivision;
}

function analyzeSituation(
  name: string,
  description: string,
  games: BacktestGame[],
  filter: (g: BacktestGame) => boolean
): SituationResult {
  const filtered = games.filter(filter);

  let atsWins = 0, atsLosses = 0, atsPushes = 0;
  let directionalWins = 0, directionalLosses = 0;

  for (const game of filtered) {
    // ATS vs Vegas
    if (game.atsResult === 'win') atsWins++;
    else if (game.atsResult === 'loss') atsLosses++;
    else if (game.atsResult === 'push') atsPushes++;

    // Directional
    if (game.spreadResult === 'win') directionalWins++;
    else if (game.spreadResult === 'loss') directionalLosses++;
  }

  const atsTotal = atsWins + atsLosses;
  const directionalTotal = directionalWins + directionalLosses;

  return {
    name,
    description,
    games: filtered.length,
    atsWins,
    atsLosses,
    atsPushes,
    atsWinPct: atsTotal > 0 ? Math.round((atsWins / atsTotal) * 1000) / 10 : 0,
    directionalWins,
    directionalLosses,
    directionalWinPct: directionalTotal > 0 ? Math.round((directionalWins / directionalTotal) * 1000) / 10 : 0,
  };
}

export async function GET() {
  try {
    const blobInfo = await head('prediction-matrix-data.json');
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'No blob data found' }, { status: 404 });
    }

    const response = await fetch(blobInfo.url);
    const blobData = await response.json();
    const games: BacktestGame[] = blobData.backtest?.results || [];

    // Only analyze games with Vegas data
    const gamesWithVegas = games.filter(g => g.vegasSpread !== undefined && g.vegasSpread !== null);

    const situations: SituationResult[] = [];

    // By spread size
    situations.push(analyzeSituation(
      'Small Spreads (≤3)',
      'Games where Vegas spread is 3 or less',
      gamesWithVegas,
      g => Math.abs(g.vegasSpread!) <= 3
    ));

    situations.push(analyzeSituation(
      'Medium Spreads (3.5-6.5)',
      'Games where Vegas spread is between 3.5 and 6.5',
      gamesWithVegas,
      g => Math.abs(g.vegasSpread!) > 3 && Math.abs(g.vegasSpread!) <= 6.5
    ));

    situations.push(analyzeSituation(
      'Large Spreads (≥7)',
      'Games where Vegas spread is 7 or more',
      gamesWithVegas,
      g => Math.abs(g.vegasSpread!) >= 7
    ));

    // By our edge size
    situations.push(analyzeSituation(
      'Small Edge (<2 pts)',
      'Our predicted spread within 2 points of Vegas',
      gamesWithVegas,
      g => Math.abs(g.predictedSpread - g.vegasSpread!) < 2
    ));

    situations.push(analyzeSituation(
      'Medium Edge (2-5 pts)',
      'Our predicted spread 2-5 points from Vegas',
      gamesWithVegas,
      g => {
        const edge = Math.abs(g.predictedSpread - g.vegasSpread!);
        return edge >= 2 && edge < 5;
      }
    ));

    situations.push(analyzeSituation(
      'Large Edge (≥5 pts)',
      'Our predicted spread 5+ points from Vegas',
      gamesWithVegas,
      g => Math.abs(g.predictedSpread - g.vegasSpread!) >= 5
    ));

    // Favorites vs Underdogs
    situations.push(analyzeSituation(
      'Betting Favorites',
      'Games where we pick the favorite (align with Vegas)',
      gamesWithVegas,
      g => (g.predictedSpread < 0 && g.vegasSpread! < 0) || (g.predictedSpread > 0 && g.vegasSpread! > 0)
    ));

    situations.push(analyzeSituation(
      'Betting Underdogs',
      'Games where we pick the underdog (opposite of Vegas)',
      gamesWithVegas,
      g => (g.predictedSpread < 0 && g.vegasSpread! > 0) || (g.predictedSpread > 0 && g.vegasSpread! < 0)
    ));

    // Divisional games
    situations.push(analyzeSituation(
      'Divisional Games',
      'Games between teams in same division',
      gamesWithVegas,
      g => isDivisionalGame(g.homeTeam, g.awayTeam)
    ));

    situations.push(analyzeSituation(
      'Non-Divisional Games',
      'Games between teams in different divisions',
      gamesWithVegas,
      g => !isDivisionalGame(g.homeTeam, g.awayTeam)
    ));

    // By Elo difference
    situations.push(analyzeSituation(
      'Elo Mismatch (>100)',
      'Games with large Elo difference',
      gamesWithVegas,
      g => Math.abs(g.homeElo - g.awayElo) > 100
    ));

    situations.push(analyzeSituation(
      'Elo Close (≤100)',
      'Games with close Elo ratings',
      gamesWithVegas,
      g => Math.abs(g.homeElo - g.awayElo) <= 100
    ));

    // By week (early vs late season)
    situations.push(analyzeSituation(
      'Early Season (Wks 1-6)',
      'First 6 weeks when Elo is less calibrated',
      gamesWithVegas,
      g => g.week <= 6
    ));

    situations.push(analyzeSituation(
      'Mid Season (Wks 7-12)',
      'Middle of season',
      gamesWithVegas,
      g => g.week >= 7 && g.week <= 12
    ));

    situations.push(analyzeSituation(
      'Late Season (Wks 13+)',
      'End of season when Elo is well-calibrated',
      gamesWithVegas,
      g => g.week >= 13
    ));

    // O/U situations
    situations.push(analyzeSituation(
      'O/U Edge ≥4 pts',
      'Our total prediction differs from Vegas by 4+ points',
      gamesWithVegas.filter(g => g.vegasTotal && g.vegasTotal > 0),
      g => Math.abs(g.predictedTotal - g.vegasTotal!) >= 4
    ));

    situations.push(analyzeSituation(
      'O/U Edge <4 pts',
      'Our total prediction within 4 points of Vegas',
      gamesWithVegas.filter(g => g.vegasTotal && g.vegasTotal > 0),
      g => Math.abs(g.predictedTotal - g.vegasTotal!) < 4
    ));

    // Sort by ATS win percentage
    situations.sort((a, b) => b.atsWinPct - a.atsWinPct);

    // Find combinations that might hit 60%
    const above60 = situations.filter(s => s.atsWinPct >= 60 && s.games >= 10);
    const above55 = situations.filter(s => s.atsWinPct >= 55 && s.games >= 15);

    return NextResponse.json({
      totalGames: games.length,
      gamesWithVegas: gamesWithVegas.length,
      situations,
      above60pct: above60,
      above55pct: above55,
      recommendation: above60.length > 0
        ? `Found ${above60.length} situations hitting 60%+! Consider filtering to these games only.`
        : above55.length > 0
        ? `Best situations hit ${Math.max(...above55.map(s => s.atsWinPct))}%. Need more data or additional filters for 60%.`
        : 'Need more games with Vegas data to find 60%+ situations.',
    });
  } catch (error) {
    console.error('Situational analysis error:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
