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
  atsResult?: 'win' | 'loss' | 'push';
  ouVegasResult?: 'win' | 'loss' | 'push';
  actualHomeScore: number;
  actualAwayScore: number;
  actualSpread: number;
  actualTotal: number;
}

interface TeamStats {
  team: string;
  ats: { wins: number; losses: number; winPct: number };
  ml: { wins: number; losses: number; winPct: number };
  ou: { wins: number; losses: number; winPct: number };
  games: number;
  avgElo: number;
  avgSpreadError: number; // How wrong our spread is on avg
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

    // 1. Per-team analysis
    const teamStats: Record<string, {
      atsWins: number; atsLosses: number;
      ouWins: number; ouLosses: number;
      mlWins: number; mlLosses: number;
      totalElo: number; games: number;
      spreadErrors: number[];
    }> = {};

    for (const r of withOdds) {
      // Initialize teams
      for (const team of [r.homeTeam, r.awayTeam]) {
        if (!teamStats[team]) {
          teamStats[team] = {
            atsWins: 0, atsLosses: 0,
            ouWins: 0, ouLosses: 0,
            mlWins: 0, mlLosses: 0,
            totalElo: 0, games: 0,
            spreadErrors: [],
          };
        }
      }

      const homeTeamStats = teamStats[r.homeTeam];
      const awayTeamStats = teamStats[r.awayTeam];

      homeTeamStats.games++;
      awayTeamStats.games++;
      homeTeamStats.totalElo += r.homeElo;
      awayTeamStats.totalElo += r.awayElo;

      // Track spread prediction error
      const predictedMargin = -r.predictedSpread; // Positive = home wins by X
      const actualMargin = r.actualHomeScore - r.actualAwayScore;
      const error = Math.abs(predictedMargin - actualMargin);
      homeTeamStats.spreadErrors.push(error);
      awayTeamStats.spreadErrors.push(error);

      // ATS
      if (r.atsResult === 'win') {
        homeTeamStats.atsWins++;
        awayTeamStats.atsWins++;
      } else if (r.atsResult === 'loss') {
        homeTeamStats.atsLosses++;
        awayTeamStats.atsLosses++;
      }

      // O/U
      if (r.ouVegasResult === 'win') {
        homeTeamStats.ouWins++;
        awayTeamStats.ouWins++;
      } else if (r.ouVegasResult === 'loss') {
        homeTeamStats.ouLosses++;
        awayTeamStats.ouLosses++;
      }

      // ML
      const homeWon = r.actualHomeScore > r.actualAwayScore;
      const predictedHomeWin = r.homeWinProb > 0.5;
      if ((predictedHomeWin && homeWon) || (!predictedHomeWin && !homeWon)) {
        homeTeamStats.mlWins++;
        awayTeamStats.mlWins++;
      } else {
        homeTeamStats.mlLosses++;
        awayTeamStats.mlLosses++;
      }
    }

    const teamAnalysis: TeamStats[] = Object.entries(teamStats)
      .map(([team, stats]) => ({
        team,
        ats: {
          wins: stats.atsWins,
          losses: stats.atsLosses,
          winPct: stats.atsWins + stats.atsLosses > 0
            ? Math.round((stats.atsWins / (stats.atsWins + stats.atsLosses)) * 1000) / 10
            : 0,
        },
        ml: {
          wins: stats.mlWins,
          losses: stats.mlLosses,
          winPct: stats.mlWins + stats.mlLosses > 0
            ? Math.round((stats.mlWins / (stats.mlWins + stats.mlLosses)) * 1000) / 10
            : 0,
        },
        ou: {
          wins: stats.ouWins,
          losses: stats.ouLosses,
          winPct: stats.ouWins + stats.ouLosses > 0
            ? Math.round((stats.ouWins / (stats.ouWins + stats.ouLosses)) * 1000) / 10
            : 0,
        },
        games: stats.games,
        avgElo: Math.round(stats.totalElo / stats.games),
        avgSpreadError: Math.round((stats.spreadErrors.reduce((a, b) => a + b, 0) / stats.spreadErrors.length) * 10) / 10,
      }))
      .sort((a, b) => b.ats.winPct - a.ats.winPct);

    // 2. Home vs Away analysis
    const homeAway = {
      homeATS: { wins: 0, losses: 0 },
      awayATS: { wins: 0, losses: 0 },
      homeML: { wins: 0, losses: 0 },
      awayML: { wins: 0, losses: 0 },
    };

    for (const r of withOdds) {
      const homeWon = r.actualHomeScore > r.actualAwayScore;
      const predictedHomeWin = r.homeWinProb > 0.5;
      const pickHome = r.predictedSpread < r.vegasSpread!;

      // Did we pick home or away for ATS?
      if (pickHome) {
        if (r.atsResult === 'win') homeAway.homeATS.wins++;
        else if (r.atsResult === 'loss') homeAway.homeATS.losses++;
      } else {
        if (r.atsResult === 'win') homeAway.awayATS.wins++;
        else if (r.atsResult === 'loss') homeAway.awayATS.losses++;
      }

      // Did we pick home or away for ML?
      if (predictedHomeWin) {
        if (homeWon) homeAway.homeML.wins++;
        else homeAway.homeML.losses++;
      } else {
        if (!homeWon) homeAway.awayML.wins++;
        else homeAway.awayML.losses++;
      }
    }

    // 3. By Vegas spread size
    const spreadBuckets: Record<string, { atsWins: number; atsLosses: number }> = {
      'small (0-3)': { atsWins: 0, atsLosses: 0 },
      'medium (3.5-6.5)': { atsWins: 0, atsLosses: 0 },
      'large (7-10)': { atsWins: 0, atsLosses: 0 },
      'huge (10.5+)': { atsWins: 0, atsLosses: 0 },
    };

    for (const r of withOdds) {
      const absSpread = Math.abs(r.vegasSpread!);
      let bucket: string;
      if (absSpread <= 3) bucket = 'small (0-3)';
      else if (absSpread <= 6.5) bucket = 'medium (3.5-6.5)';
      else if (absSpread <= 10) bucket = 'large (7-10)';
      else bucket = 'huge (10.5+)';

      if (r.atsResult === 'win') spreadBuckets[bucket].atsWins++;
      else if (r.atsResult === 'loss') spreadBuckets[bucket].atsLosses++;
    }

    // 4. By Elo gap (our confidence)
    const eloBuckets: Record<string, { mlWins: number; mlLosses: number }> = {
      'low (0-50)': { mlWins: 0, mlLosses: 0 },
      'medium (50-100)': { mlWins: 0, mlLosses: 0 },
      'high (100-150)': { mlWins: 0, mlLosses: 0 },
      'huge (150+)': { mlWins: 0, mlLosses: 0 },
    };

    for (const r of withOdds) {
      const eloGap = Math.abs(r.homeElo - r.awayElo);
      let bucket: string;
      if (eloGap < 50) bucket = 'low (0-50)';
      else if (eloGap < 100) bucket = 'medium (50-100)';
      else if (eloGap < 150) bucket = 'high (100-150)';
      else bucket = 'huge (150+)';

      const homeWon = r.actualHomeScore > r.actualAwayScore;
      const predictedHomeWin = r.homeWinProb > 0.5;
      if ((predictedHomeWin && homeWon) || (!predictedHomeWin && !homeWon)) {
        eloBuckets[bucket].mlWins++;
      } else {
        eloBuckets[bucket].mlLosses++;
      }
    }

    // Find worst teams (where model fails most)
    const worstATSTeams = [...teamAnalysis]
      .filter(t => t.games >= 20)
      .sort((a, b) => a.ats.winPct - b.ats.winPct)
      .slice(0, 5);

    const bestATSTeams = [...teamAnalysis]
      .filter(t => t.games >= 20)
      .sort((a, b) => b.ats.winPct - a.ats.winPct)
      .slice(0, 5);

    const highestSpreadError = [...teamAnalysis]
      .filter(t => t.games >= 20)
      .sort((a, b) => b.avgSpreadError - a.avgSpreadError)
      .slice(0, 5);

    return NextResponse.json({
      gamesAnalyzed: withOdds.length,

      teamAnalysis: {
        bestATS: bestATSTeams,
        worstATS: worstATSTeams,
        mostUnpredictable: highestSpreadError,
      },

      homeAwayAnalysis: {
        pickingHome: {
          ats: `${homeAway.homeATS.wins}-${homeAway.homeATS.losses} (${Math.round(homeAway.homeATS.wins / (homeAway.homeATS.wins + homeAway.homeATS.losses) * 1000) / 10}%)`,
          ml: `${homeAway.homeML.wins}-${homeAway.homeML.losses} (${Math.round(homeAway.homeML.wins / (homeAway.homeML.wins + homeAway.homeML.losses) * 1000) / 10}%)`,
        },
        pickingAway: {
          ats: `${homeAway.awayATS.wins}-${homeAway.awayATS.losses} (${Math.round(homeAway.awayATS.wins / (homeAway.awayATS.wins + homeAway.awayATS.losses) * 1000) / 10}%)`,
          ml: `${homeAway.awayML.wins}-${homeAway.awayML.losses} (${Math.round(homeAway.awayML.wins / (homeAway.awayML.wins + homeAway.awayML.losses) * 1000) / 10}%)`,
        },
      },

      spreadSizeAnalysis: Object.entries(spreadBuckets).map(([bucket, stats]) => ({
        bucket,
        wins: stats.atsWins,
        losses: stats.atsLosses,
        winPct: Math.round(stats.atsWins / (stats.atsWins + stats.atsLosses) * 1000) / 10,
        games: stats.atsWins + stats.atsLosses,
      })),

      eloGapAnalysis: Object.entries(eloBuckets).map(([bucket, stats]) => ({
        bucket,
        wins: stats.mlWins,
        losses: stats.mlLosses,
        winPct: Math.round(stats.mlWins / (stats.mlWins + stats.mlLosses) * 1000) / 10,
        games: stats.mlWins + stats.mlLosses,
      })),

      insights: [
        'Compare bestATS vs worstATS to see which teams the model handles well',
        'High avgSpreadError means we struggle to predict that team accurately',
        'Check home vs away to see if we have a bias',
        'Spread size shows where we perform best (small/medium/large spreads)',
        'Elo gap shows if our confidence correlates with accuracy',
      ],
    });

  } catch (error) {
    console.error('Analyze errors:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
