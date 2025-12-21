import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

interface BacktestResult {
  gameId: string;
  gameTime: string;
  week?: number;
  homeTeam: string;
  awayTeam: string;
  predictedSpread: number;
  predictedTotal: number;
  actualHomeScore: number;
  actualAwayScore: number;
  actualSpread: number;
  actualTotal: number;
  vegasSpread?: number;
  vegasTotal?: number;
  spreadPick: 'home' | 'away';
  spreadResult?: 'win' | 'loss' | 'push';
  atsResult?: 'win' | 'loss' | 'push';
  ouPick?: 'over' | 'under';
  ouResult?: 'win' | 'loss' | 'push';
}

interface PerformanceMetrics {
  wins: number;
  losses: number;
  pushes: number;
  total: number;
  winPct: number;
  roi: number; // Assuming -110 juice
}

function calculateMetrics(results: BacktestResult[], field: 'atsResult' | 'ouResult'): PerformanceMetrics {
  const wins = results.filter(r => r[field] === 'win').length;
  const losses = results.filter(r => r[field] === 'loss').length;
  const pushes = results.filter(r => r[field] === 'push').length;
  const total = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
  // ROI at -110: win returns 0.909 units, loss costs 1 unit
  const roi = total > 0 ? Math.round(((wins * 0.909 - losses) / total) * 1000) / 10 : 0;
  return { wins, losses, pushes, total, winPct, roi };
}

// Division mapping for NFL teams
const teamDivisions: Record<string, string> = {
  'BUF': 'AFC East', 'MIA': 'AFC East', 'NE': 'AFC East', 'NYJ': 'AFC East',
  'BAL': 'AFC North', 'CIN': 'AFC North', 'CLE': 'AFC North', 'PIT': 'AFC North',
  'HOU': 'AFC South', 'IND': 'AFC South', 'JAX': 'AFC South', 'TEN': 'AFC South',
  'DEN': 'AFC West', 'KC': 'AFC West', 'LAC': 'AFC West', 'LV': 'AFC West',
  'DAL': 'NFC East', 'NYG': 'NFC East', 'PHI': 'NFC East', 'WAS': 'NFC East',
  'CHI': 'NFC North', 'DET': 'NFC North', 'GB': 'NFC North', 'MIN': 'NFC North',
  'ATL': 'NFC South', 'CAR': 'NFC South', 'NO': 'NFC South', 'TB': 'NFC South',
  'ARI': 'NFC West', 'LAR': 'NFC West', 'SF': 'NFC West', 'SEA': 'NFC West',
};

export async function GET() {
  try {
    // 1. Fetch blob data
    const blobInfo = await head('prediction-matrix-data.json');
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'No blob data found' }, { status: 404 });
    }
    const blobResponse = await fetch(blobInfo.url);
    const blobData = await blobResponse.json();

    const allResults: BacktestResult[] = blobData.backtest?.results || [];

    // Filter to only games with Vegas odds
    const results = allResults.filter(r => r.vegasSpread !== undefined && r.vegasTotal !== undefined);

    if (results.length === 0) {
      return NextResponse.json({ error: 'No games with Vegas odds found' }, { status: 400 });
    }

    // ========== EDGE THRESHOLD ANALYSIS ==========
    const edgeThresholds = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5];
    const edgeAnalysis = {
      ats: edgeThresholds.map(threshold => {
        const filtered = results.filter(r =>
          Math.abs(r.predictedSpread - (r.vegasSpread || 0)) >= threshold
        );
        return {
          threshold,
          ...calculateMetrics(filtered, 'atsResult'),
        };
      }),
      ou: edgeThresholds.map(threshold => {
        const filtered = results.filter(r =>
          Math.abs(r.predictedTotal - (r.vegasTotal || 0)) >= threshold
        );
        return {
          threshold,
          ...calculateMetrics(filtered, 'ouResult'),
        };
      }),
    };

    // ========== SITUATIONAL ANALYSIS ==========

    // Favorites vs Underdogs (based on Vegas line)
    const homeFavorites = results.filter(r => (r.vegasSpread || 0) < 0);
    const homeUnderdogs = results.filter(r => (r.vegasSpread || 0) > 0);
    const pickNeutral = results.filter(r => (r.vegasSpread || 0) === 0);

    // When we picked the favorite vs underdog
    const pickedFavorite = results.filter(r => {
      const vegasSpread = r.vegasSpread || 0;
      // If home is favorite (negative spread) and we picked home, we picked favorite
      // If away is favorite (positive spread) and we picked away, we picked favorite
      return (vegasSpread < 0 && r.spreadPick === 'home') ||
             (vegasSpread > 0 && r.spreadPick === 'away');
    });
    const pickedUnderdog = results.filter(r => {
      const vegasSpread = r.vegasSpread || 0;
      return (vegasSpread < 0 && r.spreadPick === 'away') ||
             (vegasSpread > 0 && r.spreadPick === 'home');
    });

    // Spread size categories
    const smallSpread = results.filter(r => Math.abs(r.vegasSpread || 0) <= 3);
    const mediumSpread = results.filter(r => Math.abs(r.vegasSpread || 0) > 3 && Math.abs(r.vegasSpread || 0) <= 7);
    const largeSpread = results.filter(r => Math.abs(r.vegasSpread || 0) > 7);

    // Total size categories
    const lowTotal = results.filter(r => (r.vegasTotal || 45) < 42);
    const midTotal = results.filter(r => (r.vegasTotal || 45) >= 42 && (r.vegasTotal || 45) <= 48);
    const highTotal = results.filter(r => (r.vegasTotal || 45) > 48);

    // Divisional games
    const divisionalGames = results.filter(r =>
      teamDivisions[r.homeTeam] === teamDivisions[r.awayTeam]
    );
    const nonDivisionalGames = results.filter(r =>
      teamDivisions[r.homeTeam] !== teamDivisions[r.awayTeam]
    );

    // Week analysis
    const earlySeasonGames = results.filter(r => (r.week || 1) <= 4);
    const midSeasonGames = results.filter(r => (r.week || 1) > 4 && (r.week || 1) <= 12);
    const lateSeasonGames = results.filter(r => (r.week || 1) > 12);

    const situationalAnalysis = {
      byPickType: {
        pickedFavorite: { count: pickedFavorite.length, ...calculateMetrics(pickedFavorite, 'atsResult') },
        pickedUnderdog: { count: pickedUnderdog.length, ...calculateMetrics(pickedUnderdog, 'atsResult') },
      },
      bySpreadSize: {
        small: { label: '0-3 pts', count: smallSpread.length, ats: calculateMetrics(smallSpread, 'atsResult') },
        medium: { label: '3.5-7 pts', count: mediumSpread.length, ats: calculateMetrics(mediumSpread, 'atsResult') },
        large: { label: '7.5+ pts', count: largeSpread.length, ats: calculateMetrics(largeSpread, 'atsResult') },
      },
      byTotalSize: {
        low: { label: '<42', count: lowTotal.length, ou: calculateMetrics(lowTotal, 'ouResult') },
        mid: { label: '42-48', count: midTotal.length, ou: calculateMetrics(midTotal, 'ouResult') },
        high: { label: '>48', count: highTotal.length, ou: calculateMetrics(highTotal, 'ouResult') },
      },
      byDivision: {
        divisional: { count: divisionalGames.length, ats: calculateMetrics(divisionalGames, 'atsResult'), ou: calculateMetrics(divisionalGames, 'ouResult') },
        nonDivisional: { count: nonDivisionalGames.length, ats: calculateMetrics(nonDivisionalGames, 'atsResult'), ou: calculateMetrics(nonDivisionalGames, 'ouResult') },
      },
      bySeason: {
        early: { label: 'Weeks 1-4', count: earlySeasonGames.length, ats: calculateMetrics(earlySeasonGames, 'atsResult'), ou: calculateMetrics(earlySeasonGames, 'ouResult') },
        mid: { label: 'Weeks 5-12', count: midSeasonGames.length, ats: calculateMetrics(midSeasonGames, 'atsResult'), ou: calculateMetrics(midSeasonGames, 'ouResult') },
        late: { label: 'Weeks 13+', count: lateSeasonGames.length, ats: calculateMetrics(lateSeasonGames, 'atsResult'), ou: calculateMetrics(lateSeasonGames, 'ouResult') },
      },
    };

    // ========== FORMULA SIMULATION ==========
    // Simulate what different home field advantages would have produced
    const homeFieldValues = [0, 1, 1.5, 2, 2.5, 3, 3.5, 4];
    const formulaSimulation = {
      homeField: homeFieldValues.map(hfa => {
        // Recalculate which side we would have picked with different HFA
        // Our predicted spread already includes some HFA, so we adjust
        const simulatedPicks = results.map(r => {
          // Approximate: adjust our pick by the HFA difference
          // Current model uses ~2.5 HFA, so adjust by (hfa - 2.5)
          const adjustment = hfa - 2.5;
          const adjustedPredictedSpread = r.predictedSpread - adjustment;

          // Would we have picked differently?
          const newPick = adjustedPredictedSpread < 0 ? 'home' : 'away';
          const vegasSpread = r.vegasSpread || 0;
          const actualSpread = r.actualSpread;

          // Recalculate ATS result
          let atsResult: 'win' | 'loss' | 'push';
          if (newPick === 'home') {
            if (actualSpread < vegasSpread) atsResult = 'win';
            else if (actualSpread > vegasSpread) atsResult = 'loss';
            else atsResult = 'push';
          } else {
            if (actualSpread > vegasSpread) atsResult = 'win';
            else if (actualSpread < vegasSpread) atsResult = 'loss';
            else atsResult = 'push';
          }

          return { ...r, atsResult };
        });

        return {
          homeFieldAdvantage: hfa,
          ...calculateMetrics(simulatedPicks, 'atsResult'),
        };
      }),
    };

    // ========== BEST OPPORTUNITIES ==========
    // Find the optimal combination
    const bestAtsEdge = edgeAnalysis.ats.reduce((best, curr) =>
      curr.total >= 20 && curr.winPct > best.winPct ? curr : best
    , edgeAnalysis.ats[0]);

    const bestOuEdge = edgeAnalysis.ou.reduce((best, curr) =>
      curr.total >= 20 && curr.winPct > best.winPct ? curr : best
    , edgeAnalysis.ou[0]);

    const recommendations = {
      ats: {
        optimalEdge: bestAtsEdge.threshold,
        atThreshold: bestAtsEdge,
        bestSituation: Object.entries(situationalAnalysis.bySpreadSize)
          .map(([key, val]) => ({ key, ...val.ats }))
          .reduce((best, curr) => curr.total >= 10 && curr.winPct > best.winPct ? curr : best),
      },
      ou: {
        optimalEdge: bestOuEdge.threshold,
        atThreshold: bestOuEdge,
        bestSituation: Object.entries(situationalAnalysis.byTotalSize)
          .map(([key, val]) => ({ key, ...val.ou }))
          .reduce((best, curr) => curr.total >= 10 && curr.winPct > best.winPct ? curr : best),
      },
    };

    // ========== SUMMARY ==========
    const summary = {
      totalGamesAnalyzed: results.length,
      baseline: {
        ats: calculateMetrics(results, 'atsResult'),
        ou: calculateMetrics(results, 'ouResult'),
      },
      keyFindings: [] as string[],
    };

    // Add key findings
    if (bestAtsEdge.threshold > 0 && bestAtsEdge.winPct > summary.baseline.ats.winPct + 2) {
      summary.keyFindings.push(`ATS improves to ${bestAtsEdge.winPct}% when edge is ${bestAtsEdge.threshold}+ points (${bestAtsEdge.total} games)`);
    }
    if (bestOuEdge.threshold > 0 && bestOuEdge.winPct > summary.baseline.ou.winPct + 2) {
      summary.keyFindings.push(`O/U improves to ${bestOuEdge.winPct}% when edge is ${bestOuEdge.threshold}+ points (${bestOuEdge.total} games)`);
    }

    // Check situational findings
    const pickFavMetrics = situationalAnalysis.byPickType.pickedFavorite;
    const pickDogMetrics = situationalAnalysis.byPickType.pickedUnderdog;
    if (Math.abs(pickFavMetrics.winPct - pickDogMetrics.winPct) > 5) {
      const better = pickFavMetrics.winPct > pickDogMetrics.winPct ? 'favorites' : 'underdogs';
      const betterPct = Math.max(pickFavMetrics.winPct, pickDogMetrics.winPct);
      summary.keyFindings.push(`Model performs better picking ${better}: ${betterPct}% ATS`);
    }

    const divMetrics = situationalAnalysis.byDivision;
    if (Math.abs(divMetrics.divisional.ats.winPct - divMetrics.nonDivisional.ats.winPct) > 5) {
      const better = divMetrics.divisional.ats.winPct > divMetrics.nonDivisional.ats.winPct ? 'divisional' : 'non-divisional';
      const betterPct = Math.max(divMetrics.divisional.ats.winPct, divMetrics.nonDivisional.ats.winPct);
      summary.keyFindings.push(`${better.charAt(0).toUpperCase() + better.slice(1)} games: ${betterPct}% ATS`);
    }

    return NextResponse.json({
      success: true,
      summary,
      edgeAnalysis,
      situationalAnalysis,
      formulaSimulation,
      recommendations,
    });
  } catch (error) {
    console.error('Optimization analysis error:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
