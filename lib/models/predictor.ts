import { Game, GamePrediction, PredictionFactor, TeamStats, WeatherData, BettingLine } from '@/types';
import { WeatherAPI } from '@/lib/api/weather';

export class GamePredictor {
  /**
   * Generate a comprehensive game prediction
   */
  static async predictGame(
    game: Game,
    homeStats: Partial<TeamStats>,
    awayStats: Partial<TeamStats>,
    weather?: WeatherData | null,
    bettingLines?: BettingLine[]
  ): Promise<GamePrediction> {
    const factors: PredictionFactor[] = [];

    // 1. Home Field Advantage
    const homeAdvantage = this.calculateHomeAdvantage(game);
    factors.push(homeAdvantage);

    // 2. Record and Win Percentage
    const recordFactor = this.calculateRecordFactor(homeStats, awayStats);
    factors.push(recordFactor);

    // 3. Offensive vs Defensive Matchup
    const offenseDefenseFactor = this.calculateOffenseDefenseMatchup(homeStats, awayStats);
    factors.push(offenseDefenseFactor);

    // 4. Weather Impact
    if (weather) {
      const weatherFactor = this.calculateWeatherFactor(weather, homeStats, awayStats);
      factors.push(weatherFactor);
    }

    // 5. Rest and Schedule
    const restFactor = this.calculateRestFactor(game);
    factors.push(restFactor);

    // 6. Divisional/Conference matchup
    const rivalryFactor = this.calculateRivalryFactor(game);
    factors.push(rivalryFactor);

    // Calculate overall prediction
    let homeScore = 0;
    let awayScore = 0;
    let totalWeight = 0;

    factors.forEach((factor) => {
      const weightedValue = factor.value * factor.weight;
      if (factor.value > 0) {
        homeScore += weightedValue;
      } else {
        awayScore += Math.abs(weightedValue);
      }
      totalWeight += factor.weight;
    });

    // Calculate base scores from team averages
    const baseScore = 21; // NFL average score per team

    // Get points per game for each team
    const homeGamesPlayed = (homeStats.wins || 0) + (homeStats.losses || 0) || 1;
    const awayGamesPlayed = (awayStats.wins || 0) + (awayStats.losses || 0) || 1;

    const homePPG = (homeStats.pointsFor || 0) / homeGamesPlayed;
    const awayPPG = (awayStats.pointsFor || 0) / awayGamesPlayed;
    const homePAG = (homeStats.pointsAgainst || 0) / homeGamesPlayed;
    const awayPAG = (awayStats.pointsAgainst || 0) / awayGamesPlayed;

    // Start with team offensive averages, adjusted by opponent defense
    homeScore = homePPG > 0 ? homePPG : baseScore;
    awayScore = awayPPG > 0 ? awayPPG : baseScore;

    // Adjust for opponent defense
    if (awayPAG > 0) {
      homeScore = (homeScore * 0.6) + (awayPAG * 0.4); // 60% own offense, 40% opponent defense
    }
    if (homePAG > 0) {
      awayScore = (awayScore * 0.6) + (homePAG * 0.4);
    }

    // Apply prediction factors (smaller impact)
    const factorAdjustment = totalWeight > 0 ? (homeScore - awayScore) / totalWeight : 0;
    factors.forEach((factor) => {
      const adjustment = (factor.value * factor.weight * 0.5); // Reduced impact
      if (factor.value > 0) {
        homeScore += adjustment;
      } else {
        awayScore += Math.abs(adjustment);
      }
    });

    // Ensure scores are realistic (NFL games typically 10-35 points per team)
    homeScore = Math.max(10, Math.min(42, Math.round(homeScore)));
    awayScore = Math.max(10, Math.min(42, Math.round(awayScore)));

    const predictedWinner = homeScore > awayScore ? 'home' : 'away';
    const scoreDiff = Math.abs(homeScore - awayScore);
    const confidence = this.calculateConfidence(factors, scoreDiff);

    // Edge analysis vs betting lines
    const edgeAnalysis = bettingLines && bettingLines.length > 0
      ? this.calculateEdge(homeScore, awayScore, bettingLines[0])
      : { spread: 0, moneyline: 0, total: 0 };

    // Save Vegas spread for historical reference (home team spread)
    const vegasSpread = bettingLines && bettingLines.length > 0
      ? bettingLines[0].spread.home
      : undefined;

    // Recommendation
    const recommendation = this.getRecommendation(confidence, edgeAnalysis);

    return {
      gameId: game.id,
      game,
      predictedWinner,
      confidence,
      predictedScore: {
        home: homeScore,
        away: awayScore,
      },
      factors,
      edgeAnalysis,
      recommendation,
      vegasSpread, // Save the spread at prediction time
    };
  }

  /**
   * Calculate home field advantage
   */
  private static calculateHomeAdvantage(game: Game): PredictionFactor {
    // Historical NFL home field advantage is about 2.5 points
    return {
      name: 'Home Field Advantage',
      weight: 0.15,
      value: 2.5,
      description: 'Home teams historically win ~57% of games and score 2.5 more points',
    };
  }

  /**
   * Calculate factor based on team records
   */
  private static calculateRecordFactor(
    homeStats: Partial<TeamStats>,
    awayStats: Partial<TeamStats>
  ): PredictionFactor {
    const homeWinPct = (homeStats.wins || 0) / ((homeStats.wins || 0) + (homeStats.losses || 0) || 1);
    const awayWinPct = (awayStats.wins || 0) / ((awayStats.wins || 0) + (awayStats.losses || 0) || 1);
    const diff = (homeWinPct - awayWinPct) * 10;

    return {
      name: 'Win Percentage Differential',
      weight: 0.25,
      value: diff,
      description: `Home: ${(homeWinPct * 100).toFixed(1)}% vs Away: ${(awayWinPct * 100).toFixed(1)}%`,
    };
  }

  /**
   * Calculate offensive vs defensive matchup
   */
  private static calculateOffenseDefenseMatchup(
    homeStats: Partial<TeamStats>,
    awayStats: Partial<TeamStats>
  ): PredictionFactor {
    const homePPG = (homeStats.pointsFor || 0) / (homeStats.week || 1);
    const awayPPG = (awayStats.pointsFor || 0) / (awayStats.week || 1);
    const homePAG = (homeStats.pointsAgainst || 0) / (homeStats.week || 1);
    const awayPAG = (awayStats.pointsAgainst || 0) / (awayStats.week || 1);

    // Home offense vs Away defense and vice versa
    const homeAdvantage = (homePPG - awayPAG);
    const awayAdvantage = (awayPPG - homePAG);
    const diff = homeAdvantage - awayAdvantage;

    return {
      name: 'Offensive/Defensive Matchup',
      weight: 0.30,
      value: diff,
      description: `Home O vs Away D: ${homeAdvantage.toFixed(1)}, Away O vs Home D: ${awayAdvantage.toFixed(1)}`,
    };
  }

  /**
   * Calculate weather impact factor
   */
  private static calculateWeatherFactor(
    weather: WeatherData,
    homeStats: Partial<TeamStats>,
    awayStats: Partial<TeamStats>
  ): PredictionFactor {
    const impact = WeatherAPI.analyzeWeatherImpact(weather);

    // Dome teams typically struggle more in bad weather
    // This is a simplified version - you'd want to track which teams play in domes
    const weatherValue = impact.severity === 'extreme' ? 3 :
                        impact.severity === 'high' ? 2 :
                        impact.severity === 'moderate' ? 1 : 0;

    return {
      name: 'Weather Conditions',
      weight: 0.10,
      value: weatherValue,
      description: `${impact.severity} impact: ${impact.factors.join(', ')}`,
    };
  }

  /**
   * Calculate rest factor (days between games)
   */
  private static calculateRestFactor(game: Game): PredictionFactor {
    // This is simplified - would need game schedule history
    // Thursday games = less rest, Monday games = more rest
    const dayOfWeek = game.gameTime.getDay();

    let restValue = 0;
    let description = 'Standard rest';

    if (dayOfWeek === 4) { // Thursday
      restValue = -1;
      description = 'Short week for both teams';
    } else if (dayOfWeek === 1) { // Monday
      restValue = 1;
      description = 'Extra rest for both teams';
    }

    return {
      name: 'Rest and Schedule',
      weight: 0.08,
      value: restValue,
      description,
    };
  }

  /**
   * Calculate rivalry/divisional factor
   */
  private static calculateRivalryFactor(game: Game): PredictionFactor {
    const isDivisional = game.homeTeam.division === game.awayTeam.division;
    const isConference = game.homeTeam.conference === game.awayTeam.conference;

    let value = 0;
    let description = 'Inter-conference matchup';

    if (isDivisional) {
      value = -0.5; // Divisional games are typically closer
      description = 'Divisional rivalry - expect closer game';
    } else if (isConference) {
      value = -0.2;
      description = 'Conference matchup';
    }

    return {
      name: 'Rivalry Factor',
      weight: 0.12,
      value,
      description,
    };
  }

  /**
   * Calculate prediction confidence
   */
  private static calculateConfidence(factors: PredictionFactor[], scoreDiff: number): number {
    // Base confidence on score differential
    let confidence = Math.min(50 + (scoreDiff * 3), 95);

    // Adjust based on factor agreement
    const positiveFactors = factors.filter(f => f.value > 0).length;
    const negativeFactors = factors.filter(f => f.value < 0).length;
    const total = positiveFactors + negativeFactors;

    if (total > 0) {
      const agreement = Math.abs(positiveFactors - negativeFactors) / total;
      confidence = confidence * (0.7 + (agreement * 0.3));
    }

    return Math.round(Math.max(40, Math.min(95, confidence)));
  }

  /**
   * Calculate edge vs betting lines
   */
  private static calculateEdge(
    homePredicted: number,
    awayPredicted: number,
    line: BettingLine
  ): { spread: number; moneyline: number; total: number } {
    const predictedSpread = homePredicted - awayPredicted;
    const spreadEdge = predictedSpread - line.spread.home;

    const predictedTotal = homePredicted + awayPredicted;
    const totalEdge = predictedTotal - line.total.line;

    return {
      spread: Math.round(spreadEdge * 10) / 10,
      moneyline: 0, // Would need more sophisticated model for moneyline edge
      total: Math.round(totalEdge * 10) / 10,
    };
  }

  /**
   * Get betting recommendation
   */
  private static getRecommendation(
    confidence: number,
    edge: { spread: number; moneyline: number; total: number }
  ): GamePrediction['recommendation'] {
    const hasSignificantEdge = Math.abs(edge.spread) > 3 || Math.abs(edge.total) > 3;
    const hasModerateEdge = Math.abs(edge.spread) > 1.5 || Math.abs(edge.total) > 2;
    const hasAnyEdge = Math.abs(edge.spread) > 0.5 || Math.abs(edge.total) > 1;

    // If no betting lines available (edge is 0), use confidence-based recommendations
    if (edge.spread === 0 && edge.total === 0) {
      if (confidence >= 75) {
        return 'strong_bet';
      } else if (confidence >= 65) {
        return 'value_bet';
      } else if (confidence >= 55) {
        return 'wait';
      } else {
        return 'avoid';
      }
    }

    // If we have betting lines, use edge + confidence
    if (confidence >= 70 && hasSignificantEdge) {
      return 'strong_bet';
    } else if (confidence >= 65 && hasModerateEdge) {
      return 'value_bet';
    } else if (confidence >= 55 && hasAnyEdge) {
      return 'wait';
    } else {
      return 'avoid';
    }
  }

  /**
   * Calculate Kelly Criterion bet size
   */
  static calculateKellyCriterion(
    bankroll: number,
    probability: number,
    odds: number,
    fraction: number = 0.25 // Use fractional Kelly (quarter Kelly) for safety
  ): number {
    // Convert American odds to decimal
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;

    // Kelly formula: (bp - q) / b
    // where b = decimal odds - 1, p = probability, q = 1 - p
    const b = decimalOdds - 1;
    const p = probability / 100;
    const q = 1 - p;

    const kelly = (b * p - q) / b;

    // Apply fractional Kelly and ensure it's between 0 and max bet
    const betSize = Math.max(0, Math.min(kelly * fraction * bankroll, bankroll * 0.05));

    return Math.round(betSize * 100) / 100;
  }
}
