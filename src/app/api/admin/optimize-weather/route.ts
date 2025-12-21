import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

interface HistoricalWeather {
  temperature: number;
  windSpeed: number;
  precipitation: number;
  conditions: string;
  humidity: number;
  isIndoor: boolean;
  impact: number;
}

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
  roi: number;
}

function calculateMetrics(results: Array<{ ouResult?: string; atsResult?: string }>, field: 'atsResult' | 'ouResult'): PerformanceMetrics {
  const wins = results.filter(r => r[field] === 'win').length;
  const losses = results.filter(r => r[field] === 'loss').length;
  const pushes = results.filter(r => r[field] === 'push').length;
  const total = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
  const roi = total > 0 ? Math.round(((wins * 0.909 - losses) / total) * 1000) / 10 : 0;
  return { wins, losses, pushes, total, winPct, roi };
}

// Recalculate O/U result with adjusted total
function simulateOuResult(
  result: BacktestResult,
  weatherAdjustment: number
): 'win' | 'loss' | 'push' {
  const adjustedPrediction = result.predictedTotal - weatherAdjustment;
  const vegasTotal = result.vegasTotal || 0;
  const actualTotal = result.actualTotal;

  const pick = adjustedPrediction > vegasTotal ? 'over' : 'under';

  if (pick === 'over') {
    if (actualTotal > vegasTotal) return 'win';
    if (actualTotal < vegasTotal) return 'loss';
    return 'push';
  } else {
    if (actualTotal < vegasTotal) return 'win';
    if (actualTotal > vegasTotal) return 'loss';
    return 'push';
  }
}

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
    const historicalWeather: Record<string, HistoricalWeather> = blobData.historicalWeather || {};

    // Filter to games with Vegas odds
    const results = allResults.filter(r => r.vegasTotal !== undefined);

    if (results.length === 0) {
      return NextResponse.json({ error: 'No games with Vegas odds found' }, { status: 400 });
    }

    // ========== WEATHER DATA SUMMARY ==========
    const gamesWithWeather = results.filter(r => historicalWeather[r.gameId]);
    const outdoorGames = gamesWithWeather.filter(r => !historicalWeather[r.gameId]?.isIndoor);
    const indoorGames = gamesWithWeather.filter(r => historicalWeather[r.gameId]?.isIndoor);

    // ========== WEATHER CONDITION ANALYSIS ==========

    // Temperature buckets
    const coldGames = outdoorGames.filter(r => historicalWeather[r.gameId]?.temperature < 40);
    const mildGames = outdoorGames.filter(r => {
      const temp = historicalWeather[r.gameId]?.temperature || 70;
      return temp >= 40 && temp <= 80;
    });
    const hotGames = outdoorGames.filter(r => historicalWeather[r.gameId]?.temperature > 80);
    const freezingGames = outdoorGames.filter(r => historicalWeather[r.gameId]?.temperature < 32);

    // Wind buckets
    const calmGames = outdoorGames.filter(r => (historicalWeather[r.gameId]?.windSpeed || 0) < 10);
    const windyGames = outdoorGames.filter(r => {
      const wind = historicalWeather[r.gameId]?.windSpeed || 0;
      return wind >= 10 && wind < 20;
    });
    const veryWindyGames = outdoorGames.filter(r => (historicalWeather[r.gameId]?.windSpeed || 0) >= 20);

    // Precipitation
    const dryGames = outdoorGames.filter(r => (historicalWeather[r.gameId]?.precipitation || 0) === 0);
    const wetGames = outdoorGames.filter(r => (historicalWeather[r.gameId]?.precipitation || 0) > 0);
    const heavyPrecipGames = outdoorGames.filter(r => (historicalWeather[r.gameId]?.precipitation || 0) > 0.1);

    // Weather impact levels
    const noImpactGames = gamesWithWeather.filter(r => (historicalWeather[r.gameId]?.impact || 0) === 0);
    const lowImpactGames = gamesWithWeather.filter(r => {
      const impact = historicalWeather[r.gameId]?.impact || 0;
      return impact > 0 && impact <= 1;
    });
    const highImpactGames = gamesWithWeather.filter(r => (historicalWeather[r.gameId]?.impact || 0) > 1);

    const weatherConditionAnalysis = {
      byTemperature: {
        freezing: { label: '<32°F', count: freezingGames.length, ou: calculateMetrics(freezingGames, 'ouResult'), avgActualTotal: freezingGames.length > 0 ? Math.round(freezingGames.reduce((sum, g) => sum + g.actualTotal, 0) / freezingGames.length * 10) / 10 : 0 },
        cold: { label: '<40°F', count: coldGames.length, ou: calculateMetrics(coldGames, 'ouResult'), avgActualTotal: coldGames.length > 0 ? Math.round(coldGames.reduce((sum, g) => sum + g.actualTotal, 0) / coldGames.length * 10) / 10 : 0 },
        mild: { label: '40-80°F', count: mildGames.length, ou: calculateMetrics(mildGames, 'ouResult'), avgActualTotal: mildGames.length > 0 ? Math.round(mildGames.reduce((sum, g) => sum + g.actualTotal, 0) / mildGames.length * 10) / 10 : 0 },
        hot: { label: '>80°F', count: hotGames.length, ou: calculateMetrics(hotGames, 'ouResult'), avgActualTotal: hotGames.length > 0 ? Math.round(hotGames.reduce((sum, g) => sum + g.actualTotal, 0) / hotGames.length * 10) / 10 : 0 },
      },
      byWind: {
        calm: { label: '<10 mph', count: calmGames.length, ou: calculateMetrics(calmGames, 'ouResult'), avgActualTotal: calmGames.length > 0 ? Math.round(calmGames.reduce((sum, g) => sum + g.actualTotal, 0) / calmGames.length * 10) / 10 : 0 },
        windy: { label: '10-20 mph', count: windyGames.length, ou: calculateMetrics(windyGames, 'ouResult'), avgActualTotal: windyGames.length > 0 ? Math.round(windyGames.reduce((sum, g) => sum + g.actualTotal, 0) / windyGames.length * 10) / 10 : 0 },
        veryWindy: { label: '20+ mph', count: veryWindyGames.length, ou: calculateMetrics(veryWindyGames, 'ouResult'), avgActualTotal: veryWindyGames.length > 0 ? Math.round(veryWindyGames.reduce((sum, g) => sum + g.actualTotal, 0) / veryWindyGames.length * 10) / 10 : 0 },
      },
      byPrecipitation: {
        dry: { label: 'No precip', count: dryGames.length, ou: calculateMetrics(dryGames, 'ouResult'), avgActualTotal: dryGames.length > 0 ? Math.round(dryGames.reduce((sum, g) => sum + g.actualTotal, 0) / dryGames.length * 10) / 10 : 0 },
        wet: { label: 'Any precip', count: wetGames.length, ou: calculateMetrics(wetGames, 'ouResult'), avgActualTotal: wetGames.length > 0 ? Math.round(wetGames.reduce((sum, g) => sum + g.actualTotal, 0) / wetGames.length * 10) / 10 : 0 },
        heavy: { label: 'Heavy precip', count: heavyPrecipGames.length, ou: calculateMetrics(heavyPrecipGames, 'ouResult'), avgActualTotal: heavyPrecipGames.length > 0 ? Math.round(heavyPrecipGames.reduce((sum, g) => sum + g.actualTotal, 0) / heavyPrecipGames.length * 10) / 10 : 0 },
      },
      byVenue: {
        indoor: { count: indoorGames.length, ou: calculateMetrics(indoorGames, 'ouResult'), avgActualTotal: indoorGames.length > 0 ? Math.round(indoorGames.reduce((sum, g) => sum + g.actualTotal, 0) / indoorGames.length * 10) / 10 : 0 },
        outdoor: { count: outdoorGames.length, ou: calculateMetrics(outdoorGames, 'ouResult'), avgActualTotal: outdoorGames.length > 0 ? Math.round(outdoorGames.reduce((sum, g) => sum + g.actualTotal, 0) / outdoorGames.length * 10) / 10 : 0 },
      },
      byImpactLevel: {
        none: { label: 'No impact', count: noImpactGames.length, ou: calculateMetrics(noImpactGames, 'ouResult') },
        low: { label: '0-1 impact', count: lowImpactGames.length, ou: calculateMetrics(lowImpactGames, 'ouResult') },
        high: { label: '1+ impact', count: highImpactGames.length, ou: calculateMetrics(highImpactGames, 'ouResult') },
      },
    };

    // ========== WEATHER ADJUSTMENT SIMULATION ==========
    // Test different multipliers for weather impact on totals
    const multipliers = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    const adjustmentSimulation = multipliers.map(multiplier => {
      const simulatedResults = gamesWithWeather.map(r => {
        const weather = historicalWeather[r.gameId];
        const adjustment = (weather?.impact || 0) * multiplier;
        return {
          ...r,
          ouResult: simulateOuResult(r, adjustment),
        };
      });

      return {
        multiplier,
        adjustment: `impact × ${multiplier}`,
        ...calculateMetrics(simulatedResults, 'ouResult'),
      };
    });

    // Find optimal multiplier
    const optimalMultiplier = adjustmentSimulation.reduce((best, curr) =>
      curr.total >= 10 && curr.winPct > best.winPct ? curr : best
    , adjustmentSimulation[0]);

    // ========== CONDITIONAL WEATHER ADJUSTMENTS ==========
    // Test: Only apply adjustments when specific conditions are met
    const conditionalTests = [
      {
        name: 'Only when wind > 15 mph',
        filter: (r: BacktestResult) => (historicalWeather[r.gameId]?.windSpeed || 0) > 15,
      },
      {
        name: 'Only when temp < 40°F',
        filter: (r: BacktestResult) => (historicalWeather[r.gameId]?.temperature || 70) < 40,
      },
      {
        name: 'Only when precipitation > 0',
        filter: (r: BacktestResult) => (historicalWeather[r.gameId]?.precipitation || 0) > 0,
      },
      {
        name: 'Wind > 15 OR temp < 40',
        filter: (r: BacktestResult) => {
          const weather = historicalWeather[r.gameId];
          return (weather?.windSpeed || 0) > 15 || (weather?.temperature || 70) < 40;
        },
      },
      {
        name: 'Any adverse condition',
        filter: (r: BacktestResult) => (historicalWeather[r.gameId]?.impact || 0) > 0,
      },
    ];

    const conditionalAnalysis = conditionalTests.map(test => {
      const matchingGames = gamesWithWeather.filter(test.filter);
      const nonMatchingGames = gamesWithWeather.filter(r => !test.filter(r));

      // Simulate with adjustment only on matching games
      const bestMultiplier = 3; // Use a reasonable default
      const simulatedResults = gamesWithWeather.map(r => {
        const shouldAdjust = test.filter(r);
        const adjustment = shouldAdjust ? (historicalWeather[r.gameId]?.impact || 0) * bestMultiplier : 0;
        return {
          ...r,
          ouResult: simulateOuResult(r, adjustment),
        };
      });

      return {
        condition: test.name,
        matchingGames: matchingGames.length,
        matchingPerformance: calculateMetrics(matchingGames, 'ouResult'),
        nonMatchingPerformance: calculateMetrics(nonMatchingGames, 'ouResult'),
        withConditionalAdjustment: calculateMetrics(simulatedResults, 'ouResult'),
      };
    });

    // ========== SCORING IMPACT ANALYSIS ==========
    // How much do games actually score under different conditions vs Vegas?
    const scoringAnalysis = {
      indoor: {
        count: indoorGames.length,
        avgVegasTotal: indoorGames.length > 0 ? Math.round(indoorGames.reduce((sum, g) => sum + (g.vegasTotal || 0), 0) / indoorGames.length * 10) / 10 : 0,
        avgActualTotal: indoorGames.length > 0 ? Math.round(indoorGames.reduce((sum, g) => sum + g.actualTotal, 0) / indoorGames.length * 10) / 10 : 0,
        avgDiff: 0,
      },
      coldOutdoor: {
        count: coldGames.length,
        avgVegasTotal: coldGames.length > 0 ? Math.round(coldGames.reduce((sum, g) => sum + (g.vegasTotal || 0), 0) / coldGames.length * 10) / 10 : 0,
        avgActualTotal: coldGames.length > 0 ? Math.round(coldGames.reduce((sum, g) => sum + g.actualTotal, 0) / coldGames.length * 10) / 10 : 0,
        avgDiff: 0,
      },
      windyOutdoor: {
        count: veryWindyGames.length,
        avgVegasTotal: veryWindyGames.length > 0 ? Math.round(veryWindyGames.reduce((sum, g) => sum + (g.vegasTotal || 0), 0) / veryWindyGames.length * 10) / 10 : 0,
        avgActualTotal: veryWindyGames.length > 0 ? Math.round(veryWindyGames.reduce((sum, g) => sum + g.actualTotal, 0) / veryWindyGames.length * 10) / 10 : 0,
        avgDiff: 0,
      },
      wetOutdoor: {
        count: wetGames.length,
        avgVegasTotal: wetGames.length > 0 ? Math.round(wetGames.reduce((sum, g) => sum + (g.vegasTotal || 0), 0) / wetGames.length * 10) / 10 : 0,
        avgActualTotal: wetGames.length > 0 ? Math.round(wetGames.reduce((sum, g) => sum + g.actualTotal, 0) / wetGames.length * 10) / 10 : 0,
        avgDiff: 0,
      },
    };

    // Calculate diffs
    scoringAnalysis.indoor.avgDiff = Math.round((scoringAnalysis.indoor.avgActualTotal - scoringAnalysis.indoor.avgVegasTotal) * 10) / 10;
    scoringAnalysis.coldOutdoor.avgDiff = Math.round((scoringAnalysis.coldOutdoor.avgActualTotal - scoringAnalysis.coldOutdoor.avgVegasTotal) * 10) / 10;
    scoringAnalysis.windyOutdoor.avgDiff = Math.round((scoringAnalysis.windyOutdoor.avgActualTotal - scoringAnalysis.windyOutdoor.avgVegasTotal) * 10) / 10;
    scoringAnalysis.wetOutdoor.avgDiff = Math.round((scoringAnalysis.wetOutdoor.avgActualTotal - scoringAnalysis.wetOutdoor.avgVegasTotal) * 10) / 10;

    // ========== SUMMARY ==========
    const summary = {
      totalGamesAnalyzed: results.length,
      gamesWithWeather: gamesWithWeather.length,
      outdoorGames: outdoorGames.length,
      indoorGames: indoorGames.length,
      baseline: {
        allGames: calculateMetrics(results, 'ouResult'),
        withWeatherData: calculateMetrics(gamesWithWeather, 'ouResult'),
      },
      recommendations: [] as string[],
    };

    // Add recommendations
    if (optimalMultiplier.multiplier !== 3) {
      summary.recommendations.push(`Optimal weather multiplier is ${optimalMultiplier.multiplier} (currently using 3), would improve O/U to ${optimalMultiplier.winPct}%`);
    }

    const coldPerf = weatherConditionAnalysis.byTemperature.cold.ou;
    if (coldPerf.total >= 5 && coldPerf.winPct < 45) {
      summary.recommendations.push(`Cold weather games (<40°F) performing at ${coldPerf.winPct}% - consider increasing under bias`);
    }

    const windyPerf = weatherConditionAnalysis.byWind.veryWindy.ou;
    if (windyPerf.total >= 5 && windyPerf.winPct < 45) {
      summary.recommendations.push(`Very windy games (20+ mph) performing at ${windyPerf.winPct}% - consider increasing under bias`);
    }

    if (scoringAnalysis.coldOutdoor.avgDiff < -2) {
      summary.recommendations.push(`Cold games average ${Math.abs(scoringAnalysis.coldOutdoor.avgDiff)} points under Vegas total - lean under in cold`);
    }

    return NextResponse.json({
      success: true,
      summary,
      weatherConditionAnalysis,
      adjustmentSimulation,
      optimalMultiplier,
      conditionalAnalysis,
      scoringAnalysis,
    });
  } catch (error) {
    console.error('Weather optimization error:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
