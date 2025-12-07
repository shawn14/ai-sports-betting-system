import { Game, GamePrediction, BettingLine } from '@/types';

export interface PredictionResult {
  gameId: string;
  game: Game;
  prediction: GamePrediction;
  actualScore: {
    home: number;
    away: number;
  };
  closingLine?: BettingLine;
  outcomes: {
    predictedWinnerCorrect: boolean;
    spreadCovered: boolean; // Did our predicted winner cover the spread?
    totalOver: boolean;
    scoreAccuracy: {
      homeError: number; // Predicted - Actual
      awayError: number;
      totalError: number;
    };
  };
  profitLoss?: {
    spread: number; // If we bet on our prediction
    moneyline: number;
    total: number;
  };
}

export interface ModelPerformance {
  totalGames: number;

  // Win/Loss Records
  winnerPredictions: {
    correct: number;
    incorrect: number;
    accuracy: number; // %
  };

  spreadPredictions: {
    wins: number;
    losses: number;
    pushes: number;
    accuracy: number; // %
  };

  totalPredictions: {
    overs: number;
    unders: number;
    pushes: number;
    accuracy: number; // %
  };

  // Score Accuracy
  scoreAccuracy: {
    avgHomeError: number;
    avgAwayError: number;
    avgTotalError: number;
    medianHomeError: number;
    medianAwayError: number;
  };

  // Confidence Analysis
  confidenceBreakdown: {
    range: string; // e.g., "70-80%"
    games: number;
    accuracy: number;
  }[];

  // Profitability
  profitability: {
    spreadProfit: number;
    moneylineProfit: number;
    totalProfit: number;
    roi: number; // Return on Investment %
    units: number; // Total units won/lost
  };

  // Best/Worst
  bestPredictions: PredictionResult[];
  worstPredictions: PredictionResult[];
}

export class PredictionAnalytics {
  private results: PredictionResult[] = [];

  /**
   * Add a prediction result
   */
  addResult(result: PredictionResult): void {
    this.results.push(result);
  }

  /**
   * Calculate comprehensive model performance
   */
  getPerformance(): ModelPerformance {
    if (this.results.length === 0) {
      return this.getEmptyPerformance();
    }

    // Winner Predictions
    const correctWinners = this.results.filter(r => r.outcomes.predictedWinnerCorrect).length;
    const winnerAccuracy = (correctWinners / this.results.length) * 100;

    // Spread Predictions
    const spreadWins = this.results.filter(r => r.outcomes.spreadCovered).length;
    const spreadPushes = this.results.filter(r =>
      Math.abs(r.actualScore.home - r.actualScore.away) === Math.abs(r.prediction.predictedScore.home - r.prediction.predictedScore.away)
    ).length;
    const spreadLosses = this.results.length - spreadWins - spreadPushes;
    const spreadAccuracy = (spreadWins / (this.results.length - spreadPushes)) * 100;

    // Total Predictions
    const totalResults = this.results.map(r => {
      const actualTotal = r.actualScore.home + r.actualScore.away;
      const predictedTotal = r.prediction.predictedScore.home + r.prediction.predictedScore.away;
      const closingTotal = r.closingLine?.total.line || predictedTotal;

      if (Math.abs(actualTotal - closingTotal) < 0.5) return 'push';
      if (actualTotal > closingTotal) return 'over';
      return 'under';
    });

    const overs = totalResults.filter(t => t === 'over').length;
    const unders = totalResults.filter(t => t === 'under').length;
    const totalPushes = totalResults.filter(t => t === 'push').length;

    // Score Accuracy
    const homeErrors = this.results.map(r => r.outcomes.scoreAccuracy.homeError);
    const awayErrors = this.results.map(r => r.outcomes.scoreAccuracy.awayError);
    const totalErrors = this.results.map(r => r.outcomes.scoreAccuracy.totalError);

    const avgHomeError = this.average(homeErrors.map(Math.abs));
    const avgAwayError = this.average(awayErrors.map(Math.abs));
    const avgTotalError = this.average(totalErrors.map(Math.abs));

    // Confidence Breakdown
    const confidenceBreakdown = this.getConfidenceBreakdown();

    // Profitability
    const spreadProfit = this.results.reduce((sum, r) => sum + (r.profitLoss?.spread || 0), 0);
    const moneylineProfit = this.results.reduce((sum, r) => sum + (r.profitLoss?.moneyline || 0), 0);
    const totalProfit = this.results.reduce((sum, r) => sum + (r.profitLoss?.total || 0), 0);
    const totalWagered = this.results.length * 110; // Assuming $110 to win $100 standard bet
    const roi = ((spreadProfit + moneylineProfit + totalProfit) / totalWagered) * 100;

    // Best and Worst
    const bestPredictions = [...this.results]
      .sort((a, b) => Math.abs(a.outcomes.scoreAccuracy.totalError) - Math.abs(b.outcomes.scoreAccuracy.totalError))
      .slice(0, 5);

    const worstPredictions = [...this.results]
      .sort((a, b) => Math.abs(b.outcomes.scoreAccuracy.totalError) - Math.abs(a.outcomes.scoreAccuracy.totalError))
      .slice(0, 5);

    return {
      totalGames: this.results.length,
      winnerPredictions: {
        correct: correctWinners,
        incorrect: this.results.length - correctWinners,
        accuracy: winnerAccuracy,
      },
      spreadPredictions: {
        wins: spreadWins,
        losses: spreadLosses,
        pushes: spreadPushes,
        accuracy: spreadAccuracy,
      },
      totalPredictions: {
        overs,
        unders,
        pushes: totalPushes,
        accuracy: Math.max(overs, unders) / (this.results.length - totalPushes) * 100,
      },
      scoreAccuracy: {
        avgHomeError,
        avgAwayError,
        avgTotalError,
        medianHomeError: this.median(homeErrors.map(Math.abs)),
        medianAwayError: this.median(awayErrors.map(Math.abs)),
      },
      confidenceBreakdown,
      profitability: {
        spreadProfit,
        moneylineProfit,
        totalProfit,
        roi,
        units: (spreadProfit + moneylineProfit + totalProfit) / 100,
      },
      bestPredictions,
      worstPredictions,
    };
  }

  /**
   * Get confidence level breakdown
   */
  private getConfidenceBreakdown(): ModelPerformance['confidenceBreakdown'] {
    const ranges = [
      { min: 90, max: 100, label: '90-100%' },
      { min: 80, max: 89, label: '80-89%' },
      { min: 70, max: 79, label: '70-79%' },
      { min: 60, max: 69, label: '60-69%' },
      { min: 50, max: 59, label: '50-59%' },
      { min: 0, max: 49, label: '<50%' },
    ];

    return ranges.map(range => {
      const gamesInRange = this.results.filter(r =>
        r.prediction.confidence >= range.min && r.prediction.confidence <= range.max
      );

      const correct = gamesInRange.filter(r => r.outcomes.predictedWinnerCorrect).length;

      return {
        range: range.label,
        games: gamesInRange.length,
        accuracy: gamesInRange.length > 0 ? (correct / gamesInRange.length) * 100 : 0,
      };
    }).filter(r => r.games > 0);
  }

  /**
   * Calculate prediction result from game and prediction
   */
  static calculateResult(
    game: Game,
    prediction: GamePrediction,
    closingLine?: BettingLine
  ): PredictionResult {
    const actualScore = {
      home: game.homeScore || 0,
      away: game.awayScore || 0,
    };

    const actualWinner = actualScore.home > actualScore.away ? 'home' : 'away';
    const predictedWinnerCorrect = prediction.predictedWinner === actualWinner;

    // Spread analysis - TRUE ATS METHODOLOGY
    const predictedSpread = prediction.predictedScore.home - prediction.predictedScore.away;
    const actualSpread = actualScore.home - actualScore.away;

    // Use Vegas line for ATS if available, otherwise fall back to simple winner check
    let spreadCovered: boolean;
    if (closingLine?.spread) {
      const vegasSpread = closingLine.spread.home; // e.g., -7 means home favored by 7

      // Determine which side we'd bet based on our prediction vs Vegas
      if (predictedSpread > vegasSpread) {
        // We think home will beat the spread
        spreadCovered = actualSpread > vegasSpread;
      } else {
        // We think away will beat the spread
        spreadCovered = actualSpread < vegasSpread;
      }
    } else {
      // Fallback: Just check if we predicted the right winner
      spreadCovered = (predictedSpread > 0 && actualSpread > 0) ||
                     (predictedSpread < 0 && actualSpread < 0);
    }

    // Total analysis
    const actualTotal = actualScore.home + actualScore.away;
    const predictedTotal = prediction.predictedScore.home + prediction.predictedScore.away;
    const totalOver = actualTotal > predictedTotal;

    // Score errors
    const homeError = prediction.predictedScore.home - actualScore.home;
    const awayError = prediction.predictedScore.away - actualScore.away;
    const totalError = predictedTotal - actualTotal;

    // Profit/Loss calculation
    let profitLoss: PredictionResult['profitLoss'];
    if (closingLine) {
      const spreadPL = spreadCovered ? 100 : -110;
      const moneylinePL = predictedWinnerCorrect ?
        (prediction.predictedWinner === 'home' ?
          (closingLine.moneyline.home > 0 ? closingLine.moneyline.home : 100) :
          (closingLine.moneyline.away > 0 ? closingLine.moneyline.away : 100)
        ) : -110;
      const totalPL = (totalOver === (actualTotal > (closingLine.total.line || predictedTotal))) ? 100 : -110;

      profitLoss = {
        spread: spreadPL,
        moneyline: moneylinePL,
        total: totalPL,
      };
    }

    return {
      gameId: game.id,
      game,
      prediction,
      actualScore,
      closingLine,
      outcomes: {
        predictedWinnerCorrect,
        spreadCovered,
        totalOver,
        scoreAccuracy: {
          homeError,
          awayError,
          totalError,
        },
      },
      profitLoss,
    };
  }

  /**
   * Get results filtered by various criteria
   */
  getResultsByWeek(season: number, week: number): PredictionResult[] {
    return this.results.filter(r =>
      r.game.season === season && r.game.week === week
    );
  }

  getResultsByConfidence(minConfidence: number): PredictionResult[] {
    return this.results.filter(r => r.prediction.confidence >= minConfidence);
  }

  getResultsByRecommendation(recommendation: string): PredictionResult[] {
    return this.results.filter(r => r.prediction.recommendation === recommendation);
  }

  /**
   * Utility functions
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private median(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private getEmptyPerformance(): ModelPerformance {
    return {
      totalGames: 0,
      winnerPredictions: { correct: 0, incorrect: 0, accuracy: 0 },
      spreadPredictions: { wins: 0, losses: 0, pushes: 0, accuracy: 0 },
      totalPredictions: { overs: 0, unders: 0, pushes: 0, accuracy: 0 },
      scoreAccuracy: {
        avgHomeError: 0,
        avgAwayError: 0,
        avgTotalError: 0,
        medianHomeError: 0,
        medianAwayError: 0,
      },
      confidenceBreakdown: [],
      profitability: {
        spreadProfit: 0,
        moneylineProfit: 0,
        totalProfit: 0,
        roi: 0,
        units: 0,
      },
      bestPredictions: [],
      worstPredictions: [],
    };
  }

  /**
   * Export results to JSON
   */
  exportResults(): string {
    return JSON.stringify(this.results, null, 2);
  }

  /**
   * Import results from JSON
   */
  importResults(json: string): void {
    const results = JSON.parse(json);
    this.results = results;
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Get all results
   */
  getAllResults(): PredictionResult[] {
    return this.results;
  }
}
