import { NextResponse } from 'next/server';
import { head, put } from '@vercel/blob';

interface BacktestResult {
  gameId: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  actualHomeScore: number;
  actualAwayScore: number;
}

interface EspnSummary {
  header?: {
    competitions?: Array<{
      competitors?: Array<{
        homeAway?: 'home' | 'away';
        team?: { abbreviation?: string };
        linescores?: Array<{ displayValue?: string }>;
      }>;
    }>;
  };
}

const QUARTERS = 4;
const CALIBRATION_BLOB = 'nba-pace-calibration.json';

function getSeasonYearFromDate(date: Date): number {
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  return month >= 9 ? year + 1 : year;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

async function fetchLinescores(gameId: string): Promise<{
  home: number[];
  away: number[];
} | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data: EspnSummary = await response.json();
    const competition = data.header?.competitions?.[0];
    const competitors = competition?.competitors || [];
    const home = competitors.find(c => c.homeAway === 'home');
    const away = competitors.find(c => c.homeAway === 'away');
    if (!home?.linescores || !away?.linescores) return null;

    const homeScores = home.linescores.map(ls => Number.parseInt(ls.displayValue || '0', 10));
    const awayScores = away.linescores.map(ls => Number.parseInt(ls.displayValue || '0', 10));

    if (homeScores.length < QUARTERS || awayScores.length < QUARTERS) return null;
    return {
      home: homeScores.slice(0, QUARTERS),
      away: awayScores.slice(0, QUARTERS),
    };
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number.parseInt(searchParams.get('limit') || '200', 10);
  const delayParam = Number.parseInt(searchParams.get('delayMs') || '75', 10);
  const seasonParam = Number.parseInt(searchParams.get('seasonYear') || '', 10);
  const seasonYear = Number.isFinite(seasonParam)
    ? seasonParam
    : getSeasonYearFromDate(new Date());

  const logs: string[] = [];
  const log = (message: string) => {
    console.log(message);
    logs.push(message);
  };

  try {
    const blobInfo = await head('nba-prediction-data.json');
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'NBA blob not found' }, { status: 404 });
    }

    const blobRes = await fetch(blobInfo.url, { cache: 'no-store' });
    if (!blobRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch NBA blob' }, { status: 500 });
    }

    const blobData = await blobRes.json();
    const results: BacktestResult[] = blobData.backtest?.results || [];
    const seasonGames = results.filter(game => {
      const gameDate = new Date(game.gameTime);
      return getSeasonYearFromDate(gameDate) === seasonYear;
    });
    const gamesToProcess = seasonGames.slice(0, limitParam);

    log(`Season ${seasonYear}: ${seasonGames.length} games available`);
    log(`Processing ${gamesToProcess.length} games`);

    const leagueQuarterTotals = Array(QUARTERS).fill(0);
    let leagueGameCount = 0;
    const teamQuarterTotals = new Map<string, { totals: number[]; games: number }>();
    const gameSamples: Array<{
      gameId: string;
      homeTeam: string;
      awayTeam: string;
      totals: number[];
      homeScores: number[];
      awayScores: number[];
      actualTotal: number;
    }> = [];

    for (const game of gamesToProcess) {
      const linescores = await fetchLinescores(game.gameId);
      if (!linescores) continue;
      const homeTotals = linescores.home;
      const awayTotals = linescores.away;

      const quarterTotals = homeTotals.map((score, idx) => score + (awayTotals[idx] || 0));
      if (quarterTotals.length !== QUARTERS) continue;

      for (let i = 0; i < QUARTERS; i++) {
        leagueQuarterTotals[i] += quarterTotals[i];
      }
      leagueGameCount += 1;

      const trackTeam = (abbr: string, scores: number[]) => {
        const existing = teamQuarterTotals.get(abbr) || { totals: Array(QUARTERS).fill(0), games: 0 };
        for (let i = 0; i < QUARTERS; i++) {
          existing.totals[i] += scores[i] || 0;
        }
        existing.games += 1;
        teamQuarterTotals.set(abbr, existing);
      };

      trackTeam(game.homeTeam, homeTotals);
      trackTeam(game.awayTeam, awayTotals);

      gameSamples.push({
        gameId: game.gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        totals: quarterTotals,
        homeScores: homeTotals,
        awayScores: awayTotals,
        actualTotal: game.actualHomeScore + game.actualAwayScore,
      });

      if (delayParam > 0) {
        await new Promise(resolve => setTimeout(resolve, delayParam));
      }
    }

    if (leagueGameCount === 0) {
      return NextResponse.json({ error: 'No games with quarter data' }, { status: 400 });
    }

    const leagueAvgQuarter = leagueQuarterTotals.map(total => total / leagueGameCount);
    const teamAvgQuarter = new Map<string, number[]>();
    for (const [abbr, data] of teamQuarterTotals) {
      if (data.games > 0) {
        teamAvgQuarter.set(abbr, data.totals.map(total => total / data.games));
      }
    }

    const gapBins = [
      { label: 'close', min: 0, max: 4 },
      { label: 'small', min: 5, max: 9 },
      { label: 'medium', min: 10, max: 14 },
      { label: 'large', min: 15, max: Infinity },
    ];

    const checkpoints = [
      { label: 'Q1', minutes: 12, index: 0 },
      { label: 'HALF', minutes: 24, index: 1 },
      { label: 'Q3', minutes: 36, index: 2 },
    ];

    const resultsByMethod: Record<string, Record<string, { mae: number; medianAE: number }>> = {
      naive: {},
      leagueQuarter: {},
      teamQuarter: {},
    };

    const gapMultipliers: Record<string, Record<string, { avg: number; samples: number }>> = {
      Q1: {},
      HALF: {},
      Q3: {},
    };
    for (const checkpoint of checkpoints) {
      gapMultipliers[checkpoint.label] = Object.fromEntries(
        gapBins.map(bin => [bin.label, { avg: 1, samples: 0 }])
      );
    }

    for (const checkpoint of checkpoints) {
      const naiveErrors: number[] = [];
      const leagueErrors: number[] = [];
      const teamErrors: number[] = [];

      for (const game of gameSamples) {
        const pointsSoFar = game.totals.slice(0, checkpoint.index + 1).reduce((sum, val) => sum + val, 0);
        const minutesElapsed = checkpoint.minutes;

        const naiveTotal = (pointsSoFar / minutesElapsed) * 48;
        naiveErrors.push(Math.abs(naiveTotal - game.actualTotal));

        const leagueRemaining = leagueAvgQuarter.slice(checkpoint.index + 1).reduce((sum, val) => sum + val, 0);
        const leagueTotal = pointsSoFar + leagueRemaining;
        leagueErrors.push(Math.abs(leagueTotal - game.actualTotal));

        const homeAvg = teamAvgQuarter.get(game.homeTeam);
        const awayAvg = teamAvgQuarter.get(game.awayTeam);
        if (homeAvg && awayAvg) {
          const homeRemaining = homeAvg.slice(checkpoint.index + 1).reduce((sum, val) => sum + val, 0);
          const awayRemaining = awayAvg.slice(checkpoint.index + 1).reduce((sum, val) => sum + val, 0);
          const remainingTotals = homeRemaining + awayRemaining;
          const teamTotal = pointsSoFar + remainingTotals;
          teamErrors.push(Math.abs(teamTotal - game.actualTotal));

          const actualRemaining = game.actualTotal - pointsSoFar;
          const expectedRemaining = homeRemaining + awayRemaining;
          if (expectedRemaining > 0) {
            const homePartial = game.homeScores.slice(0, checkpoint.index + 1).reduce((sum, val) => sum + val, 0);
            const awayPartial = game.awayScores.slice(0, checkpoint.index + 1).reduce((sum, val) => sum + val, 0);
            const scoreGap = Math.abs(homePartial - awayPartial);
            const bin = gapBins.find(b => scoreGap >= b.min && scoreGap <= b.max) || gapBins[gapBins.length - 1];
            const multiplier = actualRemaining / expectedRemaining;
            const slot = gapMultipliers[checkpoint.label][bin.label];
            slot.avg = (slot.avg * slot.samples + multiplier) / (slot.samples + 1);
            slot.samples += 1;
          }
        }
      }

      resultsByMethod.naive[checkpoint.label] = {
        mae: Math.round((naiveErrors.reduce((sum, val) => sum + val, 0) / Math.max(1, naiveErrors.length)) * 10) / 10,
        medianAE: Math.round(median(naiveErrors) * 10) / 10,
      };
      resultsByMethod.leagueQuarter[checkpoint.label] = {
        mae: Math.round((leagueErrors.reduce((sum, val) => sum + val, 0) / Math.max(1, leagueErrors.length)) * 10) / 10,
        medianAE: Math.round(median(leagueErrors) * 10) / 10,
      };
      resultsByMethod.teamQuarter[checkpoint.label] = {
        mae: Math.round((teamErrors.reduce((sum, val) => sum + val, 0) / Math.max(1, teamErrors.length)) * 10) / 10,
        medianAE: Math.round(median(teamErrors) * 10) / 10,
      };
    }

    const calibrationPayload = {
      generated: new Date().toISOString(),
      seasonYear,
      leagueAvgQuarter,
      teamAvgQuarter: Object.fromEntries(teamAvgQuarter),
      gapMultipliers,
    };

    await put(CALIBRATION_BLOB, JSON.stringify(calibrationPayload), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({
      success: true,
      seasonYear,
      processedGames: gameSamples.length,
      leagueGames: leagueGameCount,
      methods: resultsByMethod,
      calibrationBlob: CALIBRATION_BLOB,
    });
  } catch (error) {
    console.error('Pace calibration error:', error);
    return NextResponse.json({ error: 'Failed to compute pace calibration' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
