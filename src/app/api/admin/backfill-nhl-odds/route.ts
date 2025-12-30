import { NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';
import { saveDocsBatch } from '@/services/firestore-admin-store';
import { SportKey } from '@/services/firestore-types';

const NHL_BLOB_NAME = 'nhl-prediction-data.json';
const sport: SportKey = 'nhl';

interface BacktestResult {
  gameId: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  predictedSpread: number;
  predictedTotal: number;
  homeWinProb: number;
  actualHomeScore: number;
  actualAwayScore: number;
  actualSpread: number;
  actualTotal: number;
  vegasSpread?: number;
  vegasTotal?: number;
  atsResult?: 'win' | 'loss' | 'push';
  ouVegasResult?: 'win' | 'loss' | 'push';
  [key: string]: unknown;
}

interface ESPNOddsResponse {
  items?: Array<{
    spread?: number;
    overUnder?: number;
    details?: string;
  }>;
}

async function fetchESPNOdds(gameId: string): Promise<{ spread: number; total: number } | null> {
  try {
    const url = `https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/events/${gameId}/competitions/${gameId}/odds`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;

    const data: ESPNOddsResponse = await res.json();
    const odds = data.items?.[0];

    if (odds?.spread !== undefined && odds?.overUnder !== undefined) {
      return {
        spread: odds.spread,
        total: odds.overUnder,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '200');
  const dryRun = searchParams.get('dryRun') === 'true';

  try {
    // Fetch current blob data using head to get the proper URL
    const blobInfo = await head(NHL_BLOB_NAME);
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'NHL blob not found' }, { status: 404 });
    }

    const blobRes = await fetch(blobInfo.url, { cache: 'no-store' });
    if (!blobRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch blob' }, { status: 500 });
    }

    const blobData = await blobRes.json();
    const results: BacktestResult[] = blobData.backtest?.results || [];

    // Find games without Vegas odds (2024-2025 season)
    const gamesWithoutOdds = results.filter(r => {
      if (r.vegasSpread !== undefined && r.vegasSpread !== null) return false;
      // Include current season games (Oct 2024 - Jun 2025)
      const gameDate = new Date(r.gameTime);
      const seasonStart = new Date('2024-10-01');
      return gameDate >= seasonStart;
    });

    console.log(`Found ${gamesWithoutOdds.length} games without odds, will process up to ${limit}`);

    const toProcess = gamesWithoutOdds.slice(0, limit);
    let updated = 0;
    let failed = 0;
    const updates: Array<{ gameId: string; spread: number; total: number }> = [];

    // Fetch odds for each game
    for (const game of toProcess) {
      const odds = await fetchESPNOdds(game.gameId);

      if (odds) {
        updates.push({ gameId: game.gameId, ...odds });
        updated++;

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        failed++;
      }

      // Log progress every 10 games
      if ((updated + failed) % 10 === 0) {
        console.log(`Progress: ${updated} updated, ${failed} failed out of ${updated + failed}`);
      }
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        totalWithoutOdds: gamesWithoutOdds.length,
        processed: toProcess.length,
        wouldUpdate: updated,
        failed,
        sample: updates.slice(0, 5),
      });
    }

    // Apply updates to results
    const updatesMap = new Map(updates.map(u => [u.gameId, u]));

    for (const result of results) {
      const update = updatesMap.get(result.gameId);
      if (update) {
        result.vegasSpread = update.spread;
        result.vegasTotal = update.total;

        // Recalculate ATS result
        const predictedSpread = result.predictedSpread;
        const actualSpread = result.actualSpread;
        const pickHome = predictedSpread < update.spread;

        if (pickHome) {
          result.atsResult = actualSpread < update.spread ? 'win' :
                            actualSpread > update.spread ? 'loss' : 'push';
        } else {
          result.atsResult = actualSpread > update.spread ? 'win' :
                            actualSpread < update.spread ? 'loss' : 'push';
        }

        // Recalculate O/U result
        const predictedTotal = result.predictedTotal;
        const actualTotal = result.actualTotal;
        const pickOver = predictedTotal > update.total;

        if (pickOver) {
          result.ouVegasResult = actualTotal > update.total ? 'win' :
                                actualTotal < update.total ? 'loss' : 'push';
        } else {
          result.ouVegasResult = actualTotal < update.total ? 'win' :
                                actualTotal > update.total ? 'loss' : 'push';
        }
      }
    }

    // Recalculate backtest summary from all results
    let spreadWins = 0, spreadLosses = 0, spreadPushes = 0;
    let mlWins = 0, mlLosses = 0;
    let ouWins = 0, ouLosses = 0, ouPushes = 0;
    let hcSpreadWins = 0, hcSpreadLosses = 0, hcSpreadPushes = 0;
    let hcMlWins = 0, hcMlLosses = 0;
    let hcOuWins = 0, hcOuLosses = 0, hcOuPushes = 0;

    for (const r of results) {
      if (r.vegasSpread === undefined) continue;

      // ATS
      if (r.atsResult === 'win') spreadWins++;
      else if (r.atsResult === 'loss') spreadLosses++;
      else if (r.atsResult === 'push') spreadPushes++;

      // ML
      if (r.mlResult === 'win') mlWins++;
      else if (r.mlResult === 'loss') mlLosses++;

      // O/U
      if (r.ouVegasResult === 'win' || r.ouResult === 'win') ouWins++;
      else if (r.ouVegasResult === 'loss' || r.ouResult === 'loss') ouLosses++;
      else if (r.ouVegasResult === 'push' || r.ouResult === 'push') ouPushes++;

      // High conviction (spreadEdge >= 1.5)
      const isHighConviction = r.isHighConviction || (r.spreadEdge !== undefined && Math.abs(r.spreadEdge as number) >= 1.5);
      if (isHighConviction) {
        if (r.atsResult === 'win') hcSpreadWins++;
        else if (r.atsResult === 'loss') hcSpreadLosses++;
        else if (r.atsResult === 'push') hcSpreadPushes++;

        if (r.mlResult === 'win') hcMlWins++;
        else if (r.mlResult === 'loss') hcMlLosses++;

        if (r.ouVegasResult === 'win' || r.ouResult === 'win') hcOuWins++;
        else if (r.ouVegasResult === 'loss' || r.ouResult === 'loss') hcOuLosses++;
        else if (r.ouVegasResult === 'push' || r.ouResult === 'push') hcOuPushes++;
      }
    }

    const totalGamesWithOdds = spreadWins + spreadLosses + spreadPushes;
    const hcTotal = hcSpreadWins + hcSpreadLosses + hcSpreadPushes;

    blobData.backtest.summary = {
      totalGames: totalGamesWithOdds,
      spread: {
        wins: spreadWins,
        losses: spreadLosses,
        pushes: spreadPushes,
        winPct: totalGamesWithOdds > 0 ? Math.round((spreadWins / (spreadWins + spreadLosses)) * 1000) / 10 : 0,
      },
      moneyline: {
        wins: mlWins,
        losses: mlLosses,
        winPct: mlWins + mlLosses > 0 ? Math.round((mlWins / (mlWins + mlLosses)) * 1000) / 10 : 0,
      },
      overUnder: {
        wins: ouWins,
        losses: ouLosses,
        pushes: ouPushes,
        winPct: ouWins + ouLosses > 0 ? Math.round((ouWins / (ouWins + ouLosses)) * 1000) / 10 : 0,
      },
    };

    blobData.backtest.highConvictionSummary = {
      spread: {
        wins: hcSpreadWins,
        losses: hcSpreadLosses,
        pushes: hcSpreadPushes,
        winPct: hcTotal > 0 ? Math.round((hcSpreadWins / (hcSpreadWins + hcSpreadLosses)) * 1000) / 10 : 0,
      },
      moneyline: {
        wins: hcMlWins,
        losses: hcMlLosses,
        winPct: hcMlWins + hcMlLosses > 0 ? Math.round((hcMlWins / (hcMlWins + hcMlLosses)) * 1000) / 10 : 0,
      },
      overUnder: {
        wins: hcOuWins,
        losses: hcOuLosses,
        pushes: hcOuPushes,
        winPct: hcOuWins + hcOuLosses > 0 ? Math.round((hcOuWins / (hcOuWins + hcOuLosses)) * 1000) / 10 : 0,
      },
    };

    // Update blob
    blobData.backtest.results = results;

    await put(NHL_BLOB_NAME, JSON.stringify(blobData), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log(`Recalculated backtest: ATS ${blobData.backtest.summary.spread.winPct}% (${spreadWins}-${spreadLosses}-${spreadPushes})`);
    console.log(`High conviction: PL ${blobData.backtest.highConvictionSummary.spread.winPct}%`);

    // Save to Firestore oddsLocks so nhl-sync picks it up
    const oddsDocs = updates.map(u => ({
      id: u.gameId,
      data: {
        vegasSpread: u.spread,
        vegasTotal: u.total,
        openingSpread: u.spread,
        openingTotal: u.total,
        capturedAt: new Date().toISOString(),
        backfilled: true,
      },
    }));
    await saveDocsBatch(sport, 'oddsLocks', oddsDocs);

    // Count how many now have odds
    const withOddsAfter = results.filter(r => r.vegasSpread !== undefined).length;

    return NextResponse.json({
      success: true,
      totalResults: results.length,
      hadOddsBefore: results.length - gamesWithoutOdds.length,
      processed: toProcess.length,
      updated,
      failed,
      hasOddsNow: withOddsAfter,
      remaining: gamesWithoutOdds.length - updated,
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
