import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

const NBA_BLOB_NAME = 'nba-prediction-data.json';
const LEAGUE_AVG_PPG = 112;

interface BacktestResult {
  gameId: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  homeElo: number;
  awayElo: number;
  vegasSpread?: number;
  vegasTotal?: number;
  actualHomeScore: number;
  actualAwayScore: number;
  actualSpread: number;
  actualTotal: number;
}

interface TeamStats {
  ppg: number;
  ppgAllowed: number;
  // Enhanced stats we'll calculate
  pointDiff: number;
  winPct: number;
  homeWinPct: number;
  awayWinPct: number;
  streak: number;
  last10WinPct: number;
}

interface GameContext {
  homeRestDays: number;
  awayRestDays: number;
  homeStreak: number;
  awayStreak: number;
  homeLast10: number;
  awayLast10: number;
}

interface SimParams {
  // Base model params
  statsRegression: number;
  eloToPoints: number;
  homeCourt: number;
  spreadRegression: number;
  eloCap: number;
  // Enhanced params
  pointDiffWeight: number;    // 0 = ignore, 1 = full weight
  streakWeight: number;       // Points per win in streak
  restDaysBonus: number;      // Bonus for extra rest
  recentFormWeight: number;   // Weight for last 10 games
}

interface SimResult {
  params: SimParams;
  ats: { wins: number; losses: number; winPct: number };
  ou: { wins: number; losses: number; winPct: number };
  ml: { wins: number; losses: number; winPct: number };
}

function buildTeamHistory(games: BacktestResult[]): Map<string, BacktestResult[]> {
  // Sort games by date
  const sorted = [...games].sort((a, b) =>
    new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()
  );

  // Build per-team game history
  const history = new Map<string, BacktestResult[]>();

  for (const game of sorted) {
    if (!history.has(game.homeTeam)) history.set(game.homeTeam, []);
    if (!history.has(game.awayTeam)) history.set(game.awayTeam, []);
    history.get(game.homeTeam)!.push(game);
    history.get(game.awayTeam)!.push(game);
  }

  return history;
}

function getTeamStatsAtTime(
  team: string,
  beforeGameTime: Date,
  history: Map<string, BacktestResult[]>
): TeamStats {
  const teamGames = history.get(team) || [];
  const priorGames = teamGames.filter(g =>
    new Date(g.gameTime) < beforeGameTime
  );

  if (priorGames.length === 0) {
    return {
      ppg: LEAGUE_AVG_PPG,
      ppgAllowed: LEAGUE_AVG_PPG,
      pointDiff: 0,
      winPct: 0.5,
      homeWinPct: 0.5,
      awayWinPct: 0.5,
      streak: 0,
      last10WinPct: 0.5,
    };
  }

  let totalPts = 0, totalPtsAllowed = 0;
  let wins = 0, losses = 0;
  let homeWins = 0, homeGames = 0, awayWins = 0, awayGames = 0;

  for (const g of priorGames) {
    const isHome = g.homeTeam === team;
    const teamScore = isHome ? g.actualHomeScore : g.actualAwayScore;
    const oppScore = isHome ? g.actualAwayScore : g.actualHomeScore;
    const won = teamScore > oppScore;

    totalPts += teamScore;
    totalPtsAllowed += oppScore;

    if (won) wins++;
    else losses++;

    if (isHome) {
      homeGames++;
      if (won) homeWins++;
    } else {
      awayGames++;
      if (won) awayWins++;
    }
  }

  // Calculate streak (positive = winning, negative = losing)
  let streak = 0;
  for (let i = priorGames.length - 1; i >= 0; i--) {
    const g = priorGames[i];
    const isHome = g.homeTeam === team;
    const won = isHome
      ? g.actualHomeScore > g.actualAwayScore
      : g.actualAwayScore > g.actualHomeScore;

    if (streak === 0) {
      streak = won ? 1 : -1;
    } else if ((streak > 0 && won) || (streak < 0 && !won)) {
      streak += streak > 0 ? 1 : -1;
    } else {
      break;
    }
  }

  // Last 10 games
  const last10 = priorGames.slice(-10);
  let last10Wins = 0;
  for (const g of last10) {
    const isHome = g.homeTeam === team;
    const won = isHome
      ? g.actualHomeScore > g.actualAwayScore
      : g.actualAwayScore > g.actualHomeScore;
    if (won) last10Wins++;
  }

  return {
    ppg: totalPts / priorGames.length,
    ppgAllowed: totalPtsAllowed / priorGames.length,
    pointDiff: (totalPts - totalPtsAllowed) / priorGames.length,
    winPct: wins / (wins + losses),
    homeWinPct: homeGames > 0 ? homeWins / homeGames : 0.5,
    awayWinPct: awayGames > 0 ? awayWins / awayGames : 0.5,
    streak,
    last10WinPct: last10.length > 0 ? last10Wins / last10.length : 0.5,
  };
}

function getRestDays(
  team: string,
  gameTime: Date,
  history: Map<string, BacktestResult[]>
): number {
  const teamGames = history.get(team) || [];
  const priorGames = teamGames.filter(g =>
    new Date(g.gameTime) < gameTime
  );

  if (priorGames.length === 0) return 3; // Default rest

  const lastGame = priorGames[priorGames.length - 1];
  const lastGameTime = new Date(lastGame.gameTime);
  const diffMs = gameTime.getTime() - lastGameTime.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return Math.min(Math.floor(diffDays), 7); // Cap at 7
}

function simulate(
  games: BacktestResult[],
  history: Map<string, BacktestResult[]>,
  params: SimParams
): SimResult {
  let atsWins = 0, atsLosses = 0;
  let ouWins = 0, ouLosses = 0;
  let mlWins = 0, mlLosses = 0;

  for (const game of games) {
    if (game.vegasSpread === undefined) continue;

    const gameTime = new Date(game.gameTime);
    const homeStats = getTeamStatsAtTime(game.homeTeam, gameTime, history);
    const awayStats = getTeamStatsAtTime(game.awayTeam, gameTime, history);
    const homeRest = getRestDays(game.homeTeam, gameTime, history);
    const awayRest = getRestDays(game.awayTeam, gameTime, history);

    // Regress PPG stats toward league average
    const regress = (stat: number) =>
      stat * (1 - params.statsRegression) + LEAGUE_AVG_PPG * params.statsRegression;

    // Base scores from PPG matchup
    let baseHomeScore = (regress(homeStats.ppg) + regress(awayStats.ppgAllowed)) / 2;
    let baseAwayScore = (regress(awayStats.ppg) + regress(homeStats.ppgAllowed)) / 2;

    // Point differential adjustment (replaces some of PPG logic)
    if (params.pointDiffWeight > 0) {
      const diffAdj = (homeStats.pointDiff - awayStats.pointDiff) * params.pointDiffWeight / 2;
      baseHomeScore += diffAdj;
      baseAwayScore -= diffAdj;
    }

    // Elo adjustment
    const eloDiff = game.homeElo - game.awayElo;
    let eloAdj = (eloDiff * params.eloToPoints) / 2;
    if (params.eloCap > 0) {
      eloAdj = Math.max(-params.eloCap / 2, Math.min(params.eloCap / 2, eloAdj));
    }

    // Streak adjustment
    let streakAdj = 0;
    if (params.streakWeight > 0) {
      streakAdj = (homeStats.streak - awayStats.streak) * params.streakWeight / 2;
    }

    // Rest days adjustment (back-to-back penalty)
    let restAdj = 0;
    if (params.restDaysBonus > 0) {
      const homeRestBonus = homeRest >= 2 ? params.restDaysBonus : (homeRest === 0 ? -params.restDaysBonus : 0);
      const awayRestBonus = awayRest >= 2 ? params.restDaysBonus : (awayRest === 0 ? -params.restDaysBonus : 0);
      restAdj = (homeRestBonus - awayRestBonus) / 2;
    }

    // Recent form adjustment
    let formAdj = 0;
    if (params.recentFormWeight > 0) {
      const homeLast10Edge = (homeStats.last10WinPct - 0.5) * 10; // Convert to -5 to +5 scale
      const awayLast10Edge = (awayStats.last10WinPct - 0.5) * 10;
      formAdj = (homeLast10Edge - awayLast10Edge) * params.recentFormWeight / 2;
    }

    // Final predicted scores
    const predHome = baseHomeScore + eloAdj + streakAdj + restAdj + formAdj + params.homeCourt / 2;
    const predAway = baseAwayScore - eloAdj - streakAdj - restAdj - formAdj + params.homeCourt / 2;

    // Predicted spread (with regression)
    const rawSpread = predAway - predHome;
    const predictedSpread = rawSpread * (1 - params.spreadRegression);

    // Predicted total
    const predictedTotal = predHome + predAway;

    // Win probability (Elo-based, unchanged)
    const adjustedHomeElo = game.homeElo + 48;
    const homeWinProb = 1 / (1 + Math.pow(10, (game.awayElo - adjustedHomeElo) / 400));

    // ATS result
    const pickHome = predictedSpread < game.vegasSpread;
    if (pickHome) {
      if (game.actualSpread < game.vegasSpread) atsWins++;
      else if (game.actualSpread > game.vegasSpread) atsLosses++;
    } else {
      if (game.actualSpread > game.vegasSpread) atsWins++;
      else if (game.actualSpread < game.vegasSpread) atsLosses++;
    }

    // O/U result
    if (game.vegasTotal && game.vegasTotal > 0) {
      const pickOver = predictedTotal > game.vegasTotal;
      if (pickOver) {
        if (game.actualTotal > game.vegasTotal) ouWins++;
        else if (game.actualTotal < game.vegasTotal) ouLosses++;
      } else {
        if (game.actualTotal < game.vegasTotal) ouWins++;
        else if (game.actualTotal > game.vegasTotal) ouLosses++;
      }
    }

    // ML result
    const predictedHomeWin = homeWinProb > 0.5;
    const actualHomeWin = game.actualHomeScore > game.actualAwayScore;
    if (predictedHomeWin === actualHomeWin) mlWins++;
    else mlLosses++;
  }

  const atsTotal = atsWins + atsLosses;
  const ouTotal = ouWins + ouLosses;
  const mlTotal = mlWins + mlLosses;

  return {
    params,
    ats: {
      wins: atsWins,
      losses: atsLosses,
      winPct: atsTotal > 0 ? Math.round((atsWins / atsTotal) * 1000) / 10 : 0,
    },
    ou: {
      wins: ouWins,
      losses: ouLosses,
      winPct: ouTotal > 0 ? Math.round((ouWins / ouTotal) * 1000) / 10 : 0,
    },
    ml: {
      wins: mlWins,
      losses: mlLosses,
      winPct: mlTotal > 0 ? Math.round((mlWins / mlTotal) * 1000) / 10 : 0,
    },
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
    const allGames: BacktestResult[] = blobData.backtest?.results || [];

    // Build team history for context calculations
    const history = buildTeamHistory(allGames);

    const gamesWithOdds = allGames.filter(r => r.vegasSpread !== undefined);

    // Test enhanced parameters
    const statsRegressions = [0, 0.1, 0.2];
    const eloToPointsValues = [0.02, 0.03, 0.04];
    const homeCourtValues = [2.0, 2.5, 3.0];
    const spreadRegressions = [0.25, 0.3, 0.35];
    const eloCaps = [0, 15, 20];

    // NEW enhanced params to test
    const pointDiffWeights = [0, 0.3, 0.5, 0.7];
    const streakWeights = [0, 0.2, 0.4];
    const restDaysBonuses = [0, 0.5, 1.0];
    const recentFormWeights = [0, 0.3, 0.5];

    const allResults: SimResult[] = [];
    let tested = 0;

    // First, test the base model optimized params
    const baseOptimized = simulate(gamesWithOdds, history, {
      statsRegression: 0.1,
      eloToPoints: 0.03,
      homeCourt: 2.5,
      spreadRegression: 0.3,
      eloCap: 15,
      pointDiffWeight: 0,
      streakWeight: 0,
      restDaysBonus: 0,
      recentFormWeight: 0,
    });

    // Test each enhanced factor independently first
    const factorTests: { name: string; result: SimResult }[] = [];

    // Test point diff alone
    for (const pdw of [0.3, 0.5, 0.7, 1.0]) {
      const result = simulate(gamesWithOdds, history, {
        statsRegression: 0.1,
        eloToPoints: 0.03,
        homeCourt: 2.5,
        spreadRegression: 0.3,
        eloCap: 15,
        pointDiffWeight: pdw,
        streakWeight: 0,
        restDaysBonus: 0,
        recentFormWeight: 0,
      });
      factorTests.push({ name: `pointDiff=${pdw}`, result });
    }

    // Test streak alone
    for (const sw of [0.1, 0.2, 0.3, 0.5]) {
      const result = simulate(gamesWithOdds, history, {
        statsRegression: 0.1,
        eloToPoints: 0.03,
        homeCourt: 2.5,
        spreadRegression: 0.3,
        eloCap: 15,
        pointDiffWeight: 0,
        streakWeight: sw,
        restDaysBonus: 0,
        recentFormWeight: 0,
      });
      factorTests.push({ name: `streak=${sw}`, result });
    }

    // Test rest days alone
    for (const rb of [0.5, 1.0, 1.5, 2.0]) {
      const result = simulate(gamesWithOdds, history, {
        statsRegression: 0.1,
        eloToPoints: 0.03,
        homeCourt: 2.5,
        spreadRegression: 0.3,
        eloCap: 15,
        pointDiffWeight: 0,
        streakWeight: 0,
        restDaysBonus: rb,
        recentFormWeight: 0,
      });
      factorTests.push({ name: `restBonus=${rb}`, result });
    }

    // Test recent form alone
    for (const rf of [0.2, 0.3, 0.5, 0.7]) {
      const result = simulate(gamesWithOdds, history, {
        statsRegression: 0.1,
        eloToPoints: 0.03,
        homeCourt: 2.5,
        spreadRegression: 0.3,
        eloCap: 15,
        pointDiffWeight: 0,
        streakWeight: 0,
        restDaysBonus: 0,
        recentFormWeight: rf,
      });
      factorTests.push({ name: `recentForm=${rf}`, result });
    }

    // Now do a smaller grid search with promising combinations
    for (const pdw of [0, 0.5]) {
      for (const sw of [0, 0.2]) {
        for (const rb of [0, 1.0]) {
          for (const rf of [0, 0.3]) {
            const result = simulate(gamesWithOdds, history, {
              statsRegression: 0.1,
              eloToPoints: 0.03,
              homeCourt: 2.5,
              spreadRegression: 0.3,
              eloCap: 15,
              pointDiffWeight: pdw,
              streakWeight: sw,
              restDaysBonus: rb,
              recentFormWeight: rf,
            });
            allResults.push(result);
            tested++;
          }
        }
      }
    }

    // Sort by ATS win %
    const sortedByATS = [...allResults].sort((a, b) => b.ats.winPct - a.ats.winPct);
    const sortedByOU = [...allResults].sort((a, b) => b.ou.winPct - a.ou.winPct);

    // Sort factor tests by improvement over base
    const factorImprovements = factorTests.map(ft => ({
      ...ft,
      atsImprovement: ft.result.ats.winPct - baseOptimized.ats.winPct,
      ouImprovement: ft.result.ou.winPct - baseOptimized.ou.winPct,
    })).sort((a, b) => b.atsImprovement - a.atsImprovement);

    return NextResponse.json({
      gamesAnalyzed: gamesWithOdds.length,
      combinationsTestedDetailed: tested,

      baseOptimized: {
        note: 'Previous best params without enhanced factors',
        params: baseOptimized.params,
        ats: baseOptimized.ats,
        ou: baseOptimized.ou,
        ml: baseOptimized.ml,
      },

      factorImpact: {
        note: 'Each enhanced factor tested independently',
        results: factorImprovements.slice(0, 10).map(f => ({
          factor: f.name,
          ats: f.result.ats,
          ou: f.result.ou,
          atsChange: `${f.atsImprovement >= 0 ? '+' : ''}${f.atsImprovement.toFixed(1)}%`,
          ouChange: `${f.ouImprovement >= 0 ? '+' : ''}${f.ouImprovement.toFixed(1)}%`,
        })),
      },

      bestCombinations: {
        byATS: sortedByATS.slice(0, 5).map(r => ({
          enhancedParams: {
            pointDiffWeight: r.params.pointDiffWeight,
            streakWeight: r.params.streakWeight,
            restDaysBonus: r.params.restDaysBonus,
            recentFormWeight: r.params.recentFormWeight,
          },
          ats: r.ats,
          ou: r.ou,
        })),
        byOU: sortedByOU.slice(0, 5).map(r => ({
          enhancedParams: {
            pointDiffWeight: r.params.pointDiffWeight,
            streakWeight: r.params.streakWeight,
            restDaysBonus: r.params.restDaysBonus,
            recentFormWeight: r.params.recentFormWeight,
          },
          ats: r.ats,
          ou: r.ou,
        })),
      },
    });

  } catch (error) {
    console.error('Enhanced optimize error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
