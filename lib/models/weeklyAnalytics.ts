/**
 * Weekly Analytics Aggregator
 * Collects and aggregates performance metrics from results collection
 * Used by weekly analyst report cron job
 */

export interface WeeklyMetrics {
  season: number;
  week: number;
  totalGames: number;
  dateRange: {
    from: Date;
    to: Date;
  };

  // Overall accuracy
  spreadAccuracy: number; // % of games where spread covered
  moneylineAccuracy: number; // % of games where winner correct
  overUnderAccuracy: number; // % of games where O/U correct

  // Error metrics
  avgSpreadError: number;
  avgTotalError: number;

  // Confidence calibration
  confidenceBreakdown: {
    range: string; // e.g., "80-90%"
    games: number;
    accuracy: number;
  }[];

  // ROI calculation
  roi: number; // Return on investment percentage
  profit: number; // Total profit/loss (assuming $100/game)

  // Best/worst predictions
  bestPredictions: Array<{
    gameId: string;
    teams: string;
    spreadError: number;
    winnerCorrect: boolean;
  }>;
  worstPredictions: Array<{
    gameId: string;
    teams: string;
    spreadError: number;
    winnerCorrect: boolean;
  }>;

  // Team-level performance
  teamPerformance: Record<string, {
    games: number;
    spreadCovered: number;
    winnerCorrect: number;
    avgSpreadError: number;
  }>;

  // Betting strategy insights
  homeUnderdog: { games: number; covered: number; accuracy: number };
  awayFavorite: { games: number; covered: number; accuracy: number };
  divisionalGames: { games: number; covered: number; accuracy: number };
}

/**
 * Aggregate weekly metrics from results data
 */
export function aggregateWeeklyMetrics(results: any[]): WeeklyMetrics {
  if (results.length === 0) {
    throw new Error('No results provided for aggregation');
  }

  const season = results[0].season;
  const week = results[0].week;

  // Find date range
  const dates = results
    .filter(r => r.game?.gameTime)
    .map(r => new Date(r.game.gameTime))
    .sort((a, b) => a.getTime() - b.getTime());

  const dateRange = {
    from: dates[0] || new Date(),
    to: dates[dates.length - 1] || new Date()
  };

  // Calculate accuracies
  const spreadCovered = results.filter(r => r.spreadCovered).length;
  const winnerCorrect = results.filter(r => r.winnerCorrect).length;
  const totalOver = results.filter(r => r.totalOver).length;

  const spreadAccuracy = (spreadCovered / results.length) * 100;
  const moneylineAccuracy = (winnerCorrect / results.length) * 100;
  const overUnderAccuracy = (totalOver / results.length) * 100;

  // Calculate error metrics
  const avgSpreadError = results.reduce((sum, r) => sum + (r.spreadError || 0), 0) / results.length;
  const avgTotalError = results.reduce((sum, r) => sum + (r.totalError || 0), 0) / results.length;

  // Confidence breakdown
  const confidenceRanges = [
    { min: 50, max: 60, range: '50-60%' },
    { min: 60, max: 70, range: '60-70%' },
    { min: 70, max: 80, range: '70-80%' },
    { min: 80, max: 90, range: '80-90%' },
    { min: 90, max: 100, range: '90-100%' }
  ];

  const confidenceBreakdown = confidenceRanges.map(({ min, max, range }) => {
    const gamesInRange = results.filter(r => r.confidence >= min && r.confidence < max);
    const correctInRange = gamesInRange.filter(r => r.winnerCorrect).length;
    return {
      range,
      games: gamesInRange.length,
      accuracy: gamesInRange.length > 0 ? (correctInRange / gamesInRange.length) * 100 : 0
    };
  });

  // ROI calculation (assuming $100 per game, -110 odds)
  const winnings = spreadCovered * 90.91; // Win $90.91 on $100 bet (-110 odds)
  const losses = (results.length - spreadCovered) * 100;
  const profit = winnings - losses;
  const roi = (profit / (results.length * 100)) * 100;

  // Best/worst predictions
  const sortedBySpreadError = [...results].sort((a, b) => a.spreadError - b.spreadError);
  const bestPredictions = sortedBySpreadError.slice(0, 3).map(r => ({
    gameId: r.gameId,
    teams: `${r.game?.awayTeam?.name || 'Away'} @ ${r.game?.homeTeam?.name || 'Home'}`,
    spreadError: r.spreadError,
    winnerCorrect: r.winnerCorrect
  }));
  const worstPredictions = sortedBySpreadError.slice(-3).reverse().map(r => ({
    gameId: r.gameId,
    teams: `${r.game?.awayTeam?.name || 'Away'} @ ${r.game?.homeTeam?.name || 'Home'}`,
    spreadError: r.spreadError,
    winnerCorrect: r.winnerCorrect
  }));

  // Team-level performance
  const teamPerformance: Record<string, any> = {};
  results.forEach(r => {
    const homeTeam = r.game?.homeTeam?.name;
    const awayTeam = r.game?.awayTeam?.name;

    if (homeTeam) {
      if (!teamPerformance[homeTeam]) {
        teamPerformance[homeTeam] = { games: 0, spreadCovered: 0, winnerCorrect: 0, totalSpreadError: 0 };
      }
      teamPerformance[homeTeam].games++;
      if (r.spreadCovered) teamPerformance[homeTeam].spreadCovered++;
      if (r.winnerCorrect && r.predictedWinner === 'home') teamPerformance[homeTeam].winnerCorrect++;
      teamPerformance[homeTeam].totalSpreadError += r.spreadError || 0;
    }

    if (awayTeam) {
      if (!teamPerformance[awayTeam]) {
        teamPerformance[awayTeam] = { games: 0, spreadCovered: 0, winnerCorrect: 0, totalSpreadError: 0 };
      }
      teamPerformance[awayTeam].games++;
      if (r.spreadCovered) teamPerformance[awayTeam].spreadCovered++;
      if (r.winnerCorrect && r.predictedWinner === 'away') teamPerformance[awayTeam].winnerCorrect++;
      teamPerformance[awayTeam].totalSpreadError += r.spreadError || 0;
    }
  });

  // Calculate avgSpreadError for each team
  Object.keys(teamPerformance).forEach(team => {
    teamPerformance[team].avgSpreadError = teamPerformance[team].totalSpreadError / teamPerformance[team].games;
    delete teamPerformance[team].totalSpreadError;
  });

  // Betting strategy insights (simplified - would need more game metadata for full analysis)
  const homeUnderdog = { games: 0, covered: 0, accuracy: 0 };
  const awayFavorite = { games: 0, covered: 0, accuracy: 0 };
  const divisionalGames = { games: 0, covered: 0, accuracy: 0 };

  // These would need actual spread/favorite data from game metadata
  // For now, return placeholder values
  homeUnderdog.accuracy = homeUnderdog.games > 0 ? (homeUnderdog.covered / homeUnderdog.games) * 100 : 0;
  awayFavorite.accuracy = awayFavorite.games > 0 ? (awayFavorite.covered / awayFavorite.games) * 100 : 0;
  divisionalGames.accuracy = divisionalGames.games > 0 ? (divisionalGames.covered / divisionalGames.games) * 100 : 0;

  return {
    season,
    week,
    totalGames: results.length,
    dateRange,
    spreadAccuracy,
    moneylineAccuracy,
    overUnderAccuracy,
    avgSpreadError,
    avgTotalError,
    confidenceBreakdown,
    roi,
    profit,
    bestPredictions,
    worstPredictions,
    teamPerformance,
    homeUnderdog,
    awayFavorite,
    divisionalGames
  };
}

/**
 * Format metrics as JSON for Claude prompt
 */
export function formatMetricsForPrompt(metrics: WeeklyMetrics): string {
  return JSON.stringify({
    overview: {
      season: metrics.season,
      week: metrics.week,
      totalGames: metrics.totalGames,
      dateRange: `${metrics.dateRange.from.toLocaleDateString()} - ${metrics.dateRange.to.toLocaleDateString()}`
    },
    accuracy: {
      spreadAccuracy: `${metrics.spreadAccuracy.toFixed(1)}%`,
      moneylineAccuracy: `${metrics.moneylineAccuracy.toFixed(1)}%`,
      overUnderAccuracy: `${metrics.overUnderAccuracy.toFixed(1)}%`,
      avgSpreadError: `${metrics.avgSpreadError.toFixed(1)} points`,
      avgTotalError: `${metrics.avgTotalError.toFixed(1)} points`
    },
    profitability: {
      roi: `${metrics.roi.toFixed(1)}%`,
      profit: `$${metrics.profit.toFixed(2)}`,
      breakeven: '52.4%',
      status: metrics.spreadAccuracy >= 52.4 ? 'PROFITABLE' : 'UNPROFITABLE'
    },
    confidenceCalibration: metrics.confidenceBreakdown.map(cb => ({
      range: cb.range,
      games: cb.games,
      accuracy: `${cb.accuracy.toFixed(1)}%`,
      calibrated: Math.abs(cb.accuracy - parseFloat(cb.range.split('-')[0])) < 10 ? 'Yes' : 'No'
    })),
    topPerformers: Object.entries(metrics.teamPerformance)
      .sort((a, b) => (b[1].spreadCovered / b[1].games) - (a[1].spreadCovered / a[1].games))
      .slice(0, 5)
      .map(([team, stats]) => ({
        team,
        games: stats.games,
        spreadCoveredRate: `${((stats.spreadCovered / stats.games) * 100).toFixed(1)}%`,
        avgSpreadError: `${stats.avgSpreadError.toFixed(1)} pts`
      })),
    bottomPerformers: Object.entries(metrics.teamPerformance)
      .sort((a, b) => (a[1].spreadCovered / a[1].games) - (b[1].spreadCovered / b[1].games))
      .slice(0, 5)
      .map(([team, stats]) => ({
        team,
        games: stats.games,
        spreadCoveredRate: `${((stats.spreadCovered / stats.games) * 100).toFixed(1)}%`,
        avgSpreadError: `${stats.avgSpreadError.toFixed(1)} pts`
      })),
    bestPredictions: metrics.bestPredictions,
    worstPredictions: metrics.worstPredictions
  }, null, 2);
}
