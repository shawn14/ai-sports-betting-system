import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';
import { getAdminDb } from '@/lib/firebase-admin';

const NBA_BLOB_NAME = 'nba-prediction-data.json';

interface BacktestResult {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  predictedSpread: number;
  predictedTotal: number;
  homeWinProb: number;
  homeElo: number;
  awayElo: number;
  vegasSpread?: number;
  vegasTotal?: number;
  actualHomeScore: number;
  actualAwayScore: number;
  actualSpread: number;
  actualTotal: number;
}

interface FilterConfig {
  name: string;
  // Which side to pick
  onlyPickFavorite?: boolean;
  onlyPickUnderdog?: boolean;
  // Spread size filters
  maxVegasSpread?: number;
  minVegasSpread?: number;
  // Edge size filters
  maxEdge?: number;
  minEdge?: number;
  // Elo alignment
  requireEloAlignment?: boolean;
  // Teams to avoid
  avoidHomeTeams?: string[];
  avoidAwayTeams?: string[];
  // Elo gap
  minEloGap?: number;
  maxEloGap?: number;
}

interface FilterResult {
  config: FilterConfig;
  wins: number;
  losses: number;
  pushes: number;
  winPct: number;
  games: number;
  roi: number; // Assuming -110 odds
}

function testFilter(games: BacktestResult[], config: FilterConfig): FilterResult {
  let wins = 0, losses = 0, pushes = 0;

  for (const game of games) {
    if (game.vegasSpread === undefined) continue;

    const eloDiff = game.homeElo - game.awayElo;
    const spreadDiff = game.predictedSpread - game.vegasSpread;
    const absEdge = Math.abs(spreadDiff);
    const absVegasSpread = Math.abs(game.vegasSpread);

    // Determine who we pick and who Vegas favors
    const pickHome = game.predictedSpread < game.vegasSpread;
    const vegasFavorite = game.vegasSpread < 0 ? 'home' : 'away';
    const wePick = pickHome ? 'home' : 'away';
    const pickingFavorite = wePick === vegasFavorite;

    // Apply filters
    if (config.onlyPickFavorite && !pickingFavorite) continue;
    if (config.onlyPickUnderdog && pickingFavorite) continue;

    if (config.maxVegasSpread !== undefined && absVegasSpread > config.maxVegasSpread) continue;
    if (config.minVegasSpread !== undefined && absVegasSpread < config.minVegasSpread) continue;

    if (config.maxEdge !== undefined && absEdge > config.maxEdge) continue;
    if (config.minEdge !== undefined && absEdge < config.minEdge) continue;

    if (config.requireEloAlignment) {
      const eloFavorite = eloDiff > 0 ? 'home' : 'away';
      const pickAgreesElo = wePick === eloFavorite;
      if (!pickAgreesElo) continue;
    }

    if (config.avoidHomeTeams?.includes(game.homeTeam)) continue;
    if (config.avoidAwayTeams?.includes(game.awayTeam)) continue;

    const absEloGap = Math.abs(eloDiff);
    if (config.minEloGap !== undefined && absEloGap < config.minEloGap) continue;
    if (config.maxEloGap !== undefined && absEloGap > config.maxEloGap) continue;

    // Calculate result - correct formula: margin + spread > 0 means home covered
    const actualMargin = game.actualHomeScore - game.actualAwayScore;
    const coverMargin = actualMargin + game.vegasSpread;
    const homeCovered = coverMargin > 0;
    const awayCovered = coverMargin < 0;

    if (pickHome) {
      if (homeCovered) wins++;
      else if (awayCovered) losses++;
      else pushes++;
    } else {
      if (awayCovered) wins++;
      else if (homeCovered) losses++;
      else pushes++;
    }
  }

  const totalGames = wins + losses;
  const winPct = totalGames > 0 ? (wins / totalGames) * 100 : 0;
  // ROI at -110 odds: (wins * 100 - losses * 110) / (totalGames * 110) * 100
  const roi = totalGames > 0 ? ((wins * 100 - losses * 110) / (totalGames * 110)) * 100 : 0;

  return {
    config,
    wins,
    losses,
    pushes,
    winPct: Math.round(winPct * 10) / 10,
    games: totalGames,
    roi: Math.round(roi * 10) / 10,
  };
}

export async function GET() {
  try {
    const blobInfo = await head(NBA_BLOB_NAME);
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'NBA blob not found' }, { status: 404 });
    }

    const blobRes = await fetch(blobInfo.url, { cache: 'no-store' });
    const blobData = await blobRes.json();
    const results: BacktestResult[] = blobData.backtest?.results || [];

    const withOdds = results.filter(r => r.vegasSpread !== undefined);

    // Teams that historically hurt our predictions
    const badHomeTeams = ['OKC', 'MIN', 'HOU', 'DEN', 'CLE', 'NY'];
    const badAwayTeams = ['UTAH', 'CHA', 'SAC', 'NO'];

    // Test many filter combinations
    const filters: FilterConfig[] = [
      // Baseline - no filters
      { name: 'No filters (baseline)' },

      // Key insight: Pick Favorite only
      { name: 'Pick Favorite only', onlyPickFavorite: true },
      { name: 'Pick Favorite + spread <= 6', onlyPickFavorite: true, maxVegasSpread: 6 },
      { name: 'Pick Favorite + spread <= 4', onlyPickFavorite: true, maxVegasSpread: 4 },
      { name: 'Pick Favorite + spread <= 3', onlyPickFavorite: true, maxVegasSpread: 3 },

      // Pick Favorite + Edge filters
      { name: 'Pick Favorite + edge <= 3', onlyPickFavorite: true, maxEdge: 3 },
      { name: 'Pick Favorite + edge <= 2', onlyPickFavorite: true, maxEdge: 2 },
      { name: 'Pick Favorite + edge <= 1', onlyPickFavorite: true, maxEdge: 1 },

      // Pick Favorite + Elo alignment
      { name: 'Pick Favorite + Elo aligned', onlyPickFavorite: true, requireEloAlignment: true },
      { name: 'Pick Fav + Elo aligned + spread <= 6', onlyPickFavorite: true, requireEloAlignment: true, maxVegasSpread: 6 },

      // Combined filters
      { name: 'Pick Fav + spread <= 4 + edge <= 2', onlyPickFavorite: true, maxVegasSpread: 4, maxEdge: 2 },
      { name: 'Pick Fav + spread <= 6 + edge <= 3', onlyPickFavorite: true, maxVegasSpread: 6, maxEdge: 3 },
      { name: 'Pick Fav + Elo aligned + edge <= 2', onlyPickFavorite: true, requireEloAlignment: true, maxEdge: 2 },

      // Avoid bad teams
      { name: 'Pick Fav + avoid bad teams', onlyPickFavorite: true, avoidHomeTeams: badHomeTeams, avoidAwayTeams: badAwayTeams },
      { name: 'Pick Fav + spread <= 6 + avoid bad', onlyPickFavorite: true, maxVegasSpread: 6, avoidHomeTeams: badHomeTeams, avoidAwayTeams: badAwayTeams },

      // Elo gap filters
      { name: 'Pick Fav + Elo gap >= 50', onlyPickFavorite: true, minEloGap: 50 },
      { name: 'Pick Fav + Elo gap >= 100', onlyPickFavorite: true, minEloGap: 100 },
      { name: 'Pick Fav + Elo gap <= 100', onlyPickFavorite: true, maxEloGap: 100 },

      // Small spread focus (where we do best)
      { name: 'Spread <= 2 only', maxVegasSpread: 2 },
      { name: 'Pick Fav + spread <= 2', onlyPickFavorite: true, maxVegasSpread: 2 },

      // Aggressive combinations for 60%+
      { name: '60% target: Fav + spread 2-6 + edge <= 2', onlyPickFavorite: true, minVegasSpread: 2, maxVegasSpread: 6, maxEdge: 2 },
      { name: '60% target: Fav + Elo aligned + avoid bad', onlyPickFavorite: true, requireEloAlignment: true, avoidHomeTeams: badHomeTeams, avoidAwayTeams: badAwayTeams },
      { name: '60% target: Fav + spread <= 4 + Elo aligned', onlyPickFavorite: true, maxVegasSpread: 4, requireEloAlignment: true },

      // Best possible combinations
      { name: 'BEST: Fav + spread <= 6 + Elo aligned + avoid bad', onlyPickFavorite: true, maxVegasSpread: 6, requireEloAlignment: true, avoidHomeTeams: badHomeTeams, avoidAwayTeams: badAwayTeams },
      { name: 'BEST: Fav + spread <= 4 + Elo aligned + avoid bad', onlyPickFavorite: true, maxVegasSpread: 4, requireEloAlignment: true, avoidHomeTeams: badHomeTeams, avoidAwayTeams: badAwayTeams },
      { name: 'BEST: Fav + spread <= 4 + edge <= 2 + avoid bad', onlyPickFavorite: true, maxVegasSpread: 4, maxEdge: 2, avoidHomeTeams: badHomeTeams, avoidAwayTeams: badAwayTeams },
    ];

    const results_filtered: FilterResult[] = [];
    for (const filter of filters) {
      const result = testFilter(withOdds, filter);
      if (result.games >= 10) { // Only include if enough games
        results_filtered.push(result);
      }
    }

    // Sort by win percentage
    results_filtered.sort((a, b) => b.winPct - a.winPct);

    // Find best filter that hits 60%+ with decent volume
    const best60Plus = results_filtered.filter(r => r.winPct >= 60 && r.games >= 20);
    const best55Plus = results_filtered.filter(r => r.winPct >= 55 && r.games >= 30);

    // Get best overall
    const bestOverall = results_filtered[0];

    // Store winning strategies in Firestore
    const strategiesToStore = {
      timestamp: new Date().toISOString(),
      gamesAnalyzed: withOdds.length,
      bestStrategies: results_filtered.slice(0, 10).map(r => ({
        name: r.config.name,
        winPct: r.winPct,
        record: `${r.wins}-${r.losses}`,
        games: r.games,
        roi: r.roi,
        config: r.config,
      })),
      recommended: bestOverall ? {
        name: bestOverall.config.name,
        config: bestOverall.config,
        winPct: bestOverall.winPct,
        games: bestOverall.games,
      } : null,
      badTeams: {
        avoidHomeTeams: badHomeTeams,
        avoidAwayTeams: badAwayTeams,
      },
    };

    // Save to Firestore
    const db = getAdminDb();
    await db.collection('nbaStrategies').doc('convictionFilters').set(strategiesToStore);

    return NextResponse.json({
      gamesAnalyzed: withOdds.length,

      allResults: results_filtered.map(r => ({
        name: r.config.name,
        winPct: r.winPct,
        record: `${r.wins}-${r.losses}-${r.pushes}`,
        games: r.games,
        roi: `${r.roi}%`,
      })),

      best60Plus: best60Plus.map(r => ({
        name: r.config.name,
        winPct: r.winPct,
        record: `${r.wins}-${r.losses}`,
        games: r.games,
        config: r.config,
      })),

      best55Plus: best55Plus.map(r => ({
        name: r.config.name,
        winPct: r.winPct,
        record: `${r.wins}-${r.losses}`,
        games: r.games,
        config: r.config,
      })),

      recommended: {
        strategy: bestOverall?.config,
        performance: {
          winPct: bestOverall?.winPct,
          record: `${bestOverall?.wins}-${bestOverall?.losses}`,
          games: bestOverall?.games,
          roi: `${bestOverall?.roi}%`,
        },
      },

      storedToFirestore: true,

      nextSteps: [
        '1. Apply recommended filter to NBA predictions',
        '2. Only show "Best Bets" for games matching conviction filter',
        '3. Track live performance going forward',
      ],
    });

  } catch (error) {
    console.error('Conviction optimizer error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
