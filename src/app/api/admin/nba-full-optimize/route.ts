import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

const NBA_BLOB_NAME = 'nba-prediction-data.json';
const LEAGUE_AVG_PPG = 112;

interface BacktestResult {
  gameId: string;
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
}

interface SimParams {
  statsRegression: number;    // How much to regress team stats to mean (0 = use raw, 1 = all league avg)
  eloToPoints: number;        // Points per 100 Elo difference
  homeCourt: number;          // Home court advantage in points
  spreadRegression: number;   // How much to shrink spreads toward 0
  eloCap: number;             // Max Elo adjustment (0 = no cap)
}

interface SimResult {
  params: SimParams;
  ats: { wins: number; losses: number; winPct: number };
  ou: { wins: number; losses: number; winPct: number };
  ml: { wins: number; losses: number; winPct: number };
  combined: number; // weighted score
}

function simulate(
  games: BacktestResult[],
  teamStats: Map<string, TeamStats>,
  params: SimParams
): SimResult {
  let atsWins = 0, atsLosses = 0;
  let ouWins = 0, ouLosses = 0;
  let mlWins = 0, mlLosses = 0;

  for (const game of games) {
    if (game.vegasSpread === undefined) continue;

    const homeStats = teamStats.get(game.homeTeam) || { ppg: LEAGUE_AVG_PPG, ppgAllowed: LEAGUE_AVG_PPG };
    const awayStats = teamStats.get(game.awayTeam) || { ppg: LEAGUE_AVG_PPG, ppgAllowed: LEAGUE_AVG_PPG };

    // Regress stats toward league average
    const regress = (stat: number) => stat * (1 - params.statsRegression) + LEAGUE_AVG_PPG * params.statsRegression;
    const regHomePPG = regress(homeStats.ppg);
    const regHomePPGAllowed = regress(homeStats.ppgAllowed);
    const regAwayPPG = regress(awayStats.ppg);
    const regAwayPPGAllowed = regress(awayStats.ppgAllowed);

    // Base scores from matchup
    const baseHomeScore = (regHomePPG + regAwayPPGAllowed) / 2;
    const baseAwayScore = (regAwayPPG + regHomePPGAllowed) / 2;

    // Elo adjustment
    const eloDiff = game.homeElo - game.awayElo;
    let eloAdj = (eloDiff * params.eloToPoints) / 2;
    if (params.eloCap > 0) {
      eloAdj = Math.max(-params.eloCap / 2, Math.min(params.eloCap / 2, eloAdj));
    }

    // Final predicted scores
    const predHome = baseHomeScore + eloAdj + params.homeCourt / 2;
    const predAway = baseAwayScore - eloAdj + params.homeCourt / 2;

    // Predicted spread (with regression)
    const rawSpread = predAway - predHome;
    const predictedSpread = rawSpread * (1 - params.spreadRegression);

    // Predicted total
    const predictedTotal = predHome + predAway;

    // Win probability
    const adjustedHomeElo = game.homeElo + 48; // Fixed Elo home bonus
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

  const atsWinPct = atsTotal > 0 ? (atsWins / atsTotal) * 100 : 0;
  const ouWinPct = ouTotal > 0 ? (ouWins / ouTotal) * 100 : 0;
  const mlWinPct = mlTotal > 0 ? (mlWins / mlTotal) * 100 : 0;

  // Combined score - weight ATS and O/U more since they're harder
  const combined = atsWinPct * 0.4 + ouWinPct * 0.4 + mlWinPct * 0.2;

  return {
    params,
    ats: { wins: atsWins, losses: atsLosses, winPct: Math.round(atsWinPct * 10) / 10 },
    ou: { wins: ouWins, losses: ouLosses, winPct: Math.round(ouWinPct * 10) / 10 },
    ml: { wins: mlWins, losses: mlLosses, winPct: Math.round(mlWinPct * 10) / 10 },
    combined: Math.round(combined * 10) / 10,
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
    const teams = blobData.teams || [];

    // Build team stats map
    const teamStats = new Map<string, TeamStats>();
    for (const team of teams) {
      teamStats.set(team.abbreviation, {
        ppg: team.ppg || LEAGUE_AVG_PPG,
        ppgAllowed: team.ppgAllowed || LEAGUE_AVG_PPG,
      });
    }

    const gamesWithOdds = results.filter(r => r.vegasSpread !== undefined);

    // Parameter ranges to test
    const statsRegressions = [0, 0.1, 0.2, 0.3, 0.4, 0.5];  // 0 = raw stats, 0.3 = current
    const eloToPointsValues = [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08];
    const homeCourtValues = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
    const spreadRegressions = [0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7];
    const eloCaps = [0, 10, 15, 20, 25, 30]; // 0 = no cap

    const allResults: SimResult[] = [];
    let tested = 0;

    // Grid search
    for (const statsRegression of statsRegressions) {
      for (const eloToPoints of eloToPointsValues) {
        for (const homeCourt of homeCourtValues) {
          for (const spreadRegression of spreadRegressions) {
            for (const eloCap of eloCaps) {
              const params: SimParams = {
                statsRegression,
                eloToPoints,
                homeCourt,
                spreadRegression,
                eloCap,
              };
              allResults.push(simulate(gamesWithOdds, teamStats, params));
              tested++;
            }
          }
        }
      }
    }

    // Sort by different metrics
    const bestATS = [...allResults].sort((a, b) => b.ats.winPct - a.ats.winPct).slice(0, 10);
    const bestOU = [...allResults].sort((a, b) => b.ou.winPct - a.ou.winPct).slice(0, 10);
    const bestML = [...allResults].sort((a, b) => b.ml.winPct - a.ml.winPct).slice(0, 10);
    const bestCombined = [...allResults].sort((a, b) => b.combined - a.combined).slice(0, 10);

    // Current params for comparison
    const current = simulate(gamesWithOdds, teamStats, {
      statsRegression: 0.3,
      eloToPoints: 0.04,
      homeCourt: 3.0,
      spreadRegression: 0.55,
      eloCap: 20,
    });

    return NextResponse.json({
      gamesAnalyzed: gamesWithOdds.length,
      simulationsRun: tested,
      current: {
        params: current.params,
        ats: current.ats,
        ou: current.ou,
        ml: current.ml,
      },
      bestATS: bestATS.map(r => ({
        params: r.params,
        ats: r.ats,
        ou: r.ou,
        ml: r.ml,
      })),
      bestOU: bestOU.map(r => ({
        params: r.params,
        ats: r.ats,
        ou: r.ou,
        ml: r.ml,
      })),
      bestCombined: bestCombined.map(r => ({
        params: r.params,
        ats: r.ats,
        ou: r.ou,
        ml: r.ml,
        combined: r.combined,
      })),
      recommendation: {
        forATS: bestATS[0].params,
        forOU: bestOU[0].params,
        forCombined: bestCombined[0].params,
      },
    });

  } catch (error) {
    console.error('Full optimize error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
