import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

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
  date?: string;
}

interface TeamData {
  abbreviation: string;
  eloRating: number;
  ppg: number;
  ppgAllowed: number;
  wins: number;
  losses: number;
  streak?: number;
  homeRecord?: string;
  awayRecord?: string;
}

interface FactorResult {
  factor: string;
  value: string;
  wins: number;
  losses: number;
  pushes: number;
  winPct: number;
  games: number;
}

function getATSResult(game: BacktestResult, pickHome: boolean): 'win' | 'loss' | 'push' {
  if (game.vegasSpread === undefined) return 'push';

  const actualMargin = game.actualHomeScore - game.actualAwayScore;
  const homeCovered = actualMargin > game.vegasSpread;
  const awayCovered = actualMargin < game.vegasSpread;

  if (pickHome) {
    if (homeCovered) return 'win';
    if (awayCovered) return 'loss';
    return 'push';
  } else {
    if (awayCovered) return 'win';
    if (homeCovered) return 'loss';
    return 'push';
  }
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
    const teams: TeamData[] = blobData.teams || [];

    const withOdds = results.filter(r => r.vegasSpread !== undefined);

    // Build team lookup
    const teamMap = new Map<string, TeamData>();
    for (const t of teams) {
      teamMap.set(t.abbreviation, t);
    }

    // ============================================
    // FACTOR ANALYSIS
    // ============================================

    const factorResults: Record<string, FactorResult[]> = {};

    // Helper to add result
    const addResult = (category: string, value: string, result: 'win' | 'loss' | 'push') => {
      if (!factorResults[category]) factorResults[category] = [];
      let entry = factorResults[category].find(f => f.value === value);
      if (!entry) {
        entry = { factor: category, value, wins: 0, losses: 0, pushes: 0, winPct: 0, games: 0 };
        factorResults[category].push(entry);
      }
      if (result === 'win') entry.wins++;
      else if (result === 'loss') entry.losses++;
      else entry.pushes++;
    };

    // Analyze each game
    for (const game of withOdds) {
      const eloDiff = game.homeElo - game.awayElo;
      const spreadDiff = game.predictedSpread - game.vegasSpread!;
      const pickHome = game.predictedSpread < game.vegasSpread!;
      const result = getATSResult(game, pickHome);

      // 1. Spread Edge Size (our spread vs Vegas)
      const absEdge = Math.abs(spreadDiff);
      if (absEdge < 1) addResult('spreadEdge', '0-1 pts', result);
      else if (absEdge < 2) addResult('spreadEdge', '1-2 pts', result);
      else if (absEdge < 3) addResult('spreadEdge', '2-3 pts', result);
      else if (absEdge < 5) addResult('spreadEdge', '3-5 pts', result);
      else if (absEdge < 7) addResult('spreadEdge', '5-7 pts', result);
      else addResult('spreadEdge', '7+ pts', result);

      // 2. Elo Difference
      const absElo = Math.abs(eloDiff);
      if (absElo < 30) addResult('eloDiff', '0-30', result);
      else if (absElo < 60) addResult('eloDiff', '30-60', result);
      else if (absElo < 100) addResult('eloDiff', '60-100', result);
      else if (absElo < 150) addResult('eloDiff', '100-150', result);
      else addResult('eloDiff', '150+', result);

      // 3. Vegas Spread Size
      const absVegasSpread = Math.abs(game.vegasSpread!);
      if (absVegasSpread <= 2) addResult('vegasSpreadSize', '0-2', result);
      else if (absVegasSpread <= 4) addResult('vegasSpreadSize', '2.5-4', result);
      else if (absVegasSpread <= 6) addResult('vegasSpreadSize', '4.5-6', result);
      else if (absVegasSpread <= 8) addResult('vegasSpreadSize', '6.5-8', result);
      else if (absVegasSpread <= 10) addResult('vegasSpreadSize', '8.5-10', result);
      else addResult('vegasSpreadSize', '10.5+', result);

      // 4. Favorite vs Underdog pick
      const vegasFavorite = game.vegasSpread! < 0 ? 'home' : 'away';
      const wePick = pickHome ? 'home' : 'away';
      if (wePick === vegasFavorite) addResult('pickType', 'Pick Favorite', result);
      else addResult('pickType', 'Pick Underdog', result);

      // 5. Elo agrees with Vegas?
      const eloFavorite = eloDiff > 0 ? 'home' : 'away';
      const eloAgreesVegas = eloFavorite === vegasFavorite;
      addResult('eloAgreesVegas', eloAgreesVegas ? 'Elo agrees with Vegas' : 'Elo disagrees with Vegas', result);

      // 6. Our pick agrees with Elo favorite?
      const pickAgreesElo = (pickHome && eloDiff > 0) || (!pickHome && eloDiff < 0);
      addResult('pickAgreesElo', pickAgreesElo ? 'Pick agrees with Elo' : 'Pick against Elo', result);

      // 7. Direction of edge (picking team to cover MORE or cover LESS than Vegas says)
      // If pickHome and spreadDiff < 0, we think home will do BETTER than Vegas (beat the spread more)
      // If pickHome and spreadDiff > 0, we think home will do WORSE but still cover
      if (pickHome) {
        if (spreadDiff < -3) addResult('edgeDirection', 'Strong home edge (3+ pts)', result);
        else if (spreadDiff < 0) addResult('edgeDirection', 'Moderate home edge', result);
        else addResult('edgeDirection', 'Weak/contrary signal', result);
      } else {
        if (spreadDiff > 3) addResult('edgeDirection', 'Strong away edge (3+ pts)', result);
        else if (spreadDiff > 0) addResult('edgeDirection', 'Moderate away edge', result);
        else addResult('edgeDirection', 'Weak/contrary signal', result);
      }

      // 8. Home win probability
      if (game.homeWinProb < 0.35) addResult('homeWinProb', '0-35%', result);
      else if (game.homeWinProb < 0.45) addResult('homeWinProb', '35-45%', result);
      else if (game.homeWinProb < 0.55) addResult('homeWinProb', '45-55%', result);
      else if (game.homeWinProb < 0.65) addResult('homeWinProb', '55-65%', result);
      else addResult('homeWinProb', '65%+', result);

      // 9. Pick direction
      addResult('pickDirection', pickHome ? 'Pick Home' : 'Pick Away', result);

      // 10. Home team (which teams do we predict well?)
      addResult('homeTeam', game.homeTeam, result);

      // 11. Away team
      addResult('awayTeam', game.awayTeam, result);

      // 12. Combined conviction: spread edge + elo gap alignment
      const hasSpreadEdge = absEdge >= 2;
      const hasEloGap = absElo >= 50;
      const eloSupportsOurPick = pickAgreesElo;

      let conviction = 0;
      if (hasSpreadEdge) conviction++;
      if (hasEloGap && eloSupportsOurPick) conviction++;
      if (absEdge >= 4) conviction++;
      if (absElo >= 100 && eloSupportsOurPick) conviction++;

      addResult('convictionScore', `${conviction} factors`, result);

      // 13. Combined filter: Only games where we have 3+ edge and Elo supports
      if (absEdge >= 3 && eloSupportsOurPick) {
        addResult('highConviction', '3+ edge + Elo aligned', result);
      }
      if (absEdge >= 4 && eloSupportsOurPick) {
        addResult('highConviction', '4+ edge + Elo aligned', result);
      }
      if (absEdge >= 5 && eloSupportsOurPick) {
        addResult('highConviction', '5+ edge + Elo aligned', result);
      }
      if (absEdge >= 3 && eloSupportsOurPick && absElo >= 75) {
        addResult('highConviction', '3+ edge + Elo 75+ aligned', result);
      }
      if (absEdge >= 4 && eloSupportsOurPick && absElo >= 100) {
        addResult('highConviction', '4+ edge + Elo 100+ aligned', result);
      }
    }

    // Calculate win percentages
    for (const category of Object.keys(factorResults)) {
      for (const entry of factorResults[category]) {
        entry.games = entry.wins + entry.losses;
        entry.winPct = entry.games > 0 ? Math.round((entry.wins / entry.games) * 1000) / 10 : 0;
      }
      // Sort by win percentage
      factorResults[category].sort((a, b) => b.winPct - a.winPct);
    }

    // Find best situations (55%+ with 20+ games)
    const bestSituations: FactorResult[] = [];
    for (const category of Object.keys(factorResults)) {
      for (const entry of factorResults[category]) {
        if (entry.winPct >= 53 && entry.games >= 30) {
          bestSituations.push(entry);
        }
      }
    }
    bestSituations.sort((a, b) => b.winPct - a.winPct);

    // Find worst situations
    const worstSituations: FactorResult[] = [];
    for (const category of Object.keys(factorResults)) {
      for (const entry of factorResults[category]) {
        if (entry.winPct <= 47 && entry.games >= 30) {
          worstSituations.push(entry);
        }
      }
    }
    worstSituations.sort((a, b) => a.winPct - b.winPct);

    return NextResponse.json({
      gamesAnalyzed: withOdds.length,

      factorAnalysis: factorResults,

      bestSituations: bestSituations.slice(0, 20),
      worstSituations: worstSituations.slice(0, 20),

      summary: {
        totalFactorsAnalyzed: Object.keys(factorResults).length,
        bestSituationsFound: bestSituations.length,
        worstSituationsFound: worstSituations.length,
      },

      recommendation: 'Look at highConviction and convictionScore for best filters',
    });

  } catch (error) {
    console.error('Deep ATS analysis error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
