import { Game, GamePrediction, BettingLine } from '@/types';
import { NFLStandingsData } from '@/lib/scrapers/nflStandingsScraper';

export interface MatrixConfig {
  w_net: number;          // 0-10: Net Point Performance weight
  w_momentum: number;     // 0-10: Momentum (Last 5 vs Season) weight
  w_conf: number;         // 0-10: Conference Strength weight
  w_home: number;         // 0-5: Home Field Advantage weight
  w_off: number;          // -10 to +10: Offensive Strength weight
  w_def: number;          // -10 to +10: Defensive Strength weight
  w_recency_total: number; // 0-1: Recency weight for total calculation
  total_boost: number;    // -10 to +10: Manual boost/penalty for totals
  volatility: number;     // 0-2: Score volatility multiplier
  regression_factor: number; // 0-1: Dampening factor for extreme TSR gaps (0.85 = 15% dampening)
}

export interface LeagueAverages {
  avgPFpg: number;
  avgPApg: number;
  avgNetPG: number;
}

export class MatrixPredictor {
  /**
   * Main prediction method
   * @param game - Game to predict
   * @param homeStandings - Home team standings data
   * @param awayStandings - Away team standings data
   * @param leagueAvg - League averages for normalization
   * @param config - Matrix configuration weights
   * @param bettingLines - Optional betting lines for edge calculation
   */
  static predictGame(
    game: Game,
    homeStandings: NFLStandingsData,
    awayStandings: NFLStandingsData,
    leagueAvg: LeagueAverages,
    config: MatrixConfig,
    bettingLines?: BettingLine[]
  ): GamePrediction {
    // Calculate TSR for both teams
    const homeTSR = this.calculateTSR(homeStandings, true, leagueAvg, config);
    const awayTSR = this.calculateTSR(awayStandings, false, leagueAvg, config);

    // Predicted spread with scaling and regression-to-mean dampening
    // TSR differential (~-60 to +60) must be scaled to NFL spread range (~-14 to +14)
    // Scaling factor: 0.20 (reverted from 0.12 - better win rate: 61.98% vs 59.78%)
    // Then apply regression factor to prevent extreme predictions
    const tsrDiff = homeTSR - awayTSR;
    const rawSpread = tsrDiff * 0.20;
    const predictedSpread = rawSpread * config.regression_factor;

    // Predicted total
    const predictedTotal = this.calculateTotal(homeStandings, awayStandings, leagueAvg, config);

    // Calculate exact scores
    const scores = this.calculateExactScores(predictedTotal, predictedSpread, config.volatility);

    // Calculate confidence
    const confidence = this.calculateConfidence(homeTSR, awayTSR);

    // Edge analysis (if betting lines provided)
    const edgeAnalysis = bettingLines && bettingLines.length > 0
      ? this.calculateEdge(scores.home, scores.away, bettingLines[0])
      : { spread: 0, moneyline: 0, total: 0 };

    // Get recommendation
    const recommendation = this.getRecommendation(confidence, edgeAnalysis);

    return {
      gameId: game.id,
      game,
      predictedWinner: scores.home > scores.away ? 'home' : 'away',
      confidence,
      predictedScore: {
        home: scores.home,
        away: scores.away
      },
      factors: [
        `Home TSR: ${homeTSR.toFixed(2)}`,
        `Away TSR: ${awayTSR.toFixed(2)}`,
        `Predicted Spread: ${predictedSpread > 0 ? '+' : ''}${predictedSpread.toFixed(1)}`,
        `Predicted Total: ${predictedTotal.toFixed(1)}`
      ],
      edgeAnalysis,
      recommendation,
      vegasSpread: bettingLines?.[0]?.spread.home,
      vegasTotal: bettingLines?.[0]?.total.line
    };
  }

  /**
   * Calculate TSR - Team Strength Rating
   * This is the core Matrix algorithm from the PRD
   */
  private static calculateTSR(
    standings: NFLStandingsData,
    isHome: boolean,
    leagueAvg: LeagueAverages,
    config: MatrixConfig
  ): number {
    const gp = standings.wins + standings.losses + standings.ties;
    if (gp === 0) return 0;

    const pfpg = standings.pointsFor / gp;
    const papg = standings.pointsAgainst / gp;
    const netPG = pfpg - papg;
    const winPct = standings.wins / gp;

    // 1. Net Point Performance (normalized against league average)
    const netComponent = config.w_net * (netPG - leagueAvg.avgNetPG);

    // 2. Momentum (Last 5 performance vs Season performance)
    const last5GP = standings.last5Wins + standings.last5Losses;
    const last5Pct = last5GP > 0 ? standings.last5Wins / last5GP : winPct;
    const momentumComponent = config.w_momentum * (last5Pct - winPct);

    // 3. Conference Strength (how team performs in conference)
    const confGP = standings.confWins + standings.confLosses;
    const confPct = confGP > 0 ? standings.confWins / confGP : 0.50;
    const confComponent = config.w_conf * (confPct - 0.50);

    // 4. Home Field Advantage (only applies to home team)
    let homeComponent = 0;
    if (isHome) {
      const homeGP = standings.homeWins + standings.homeLosses;
      const roadGP = standings.roadWins + standings.roadLosses;

      if (homeGP > 0 && roadGP > 0) {
        const homePct = standings.homeWins / homeGP;
        const roadPct = standings.roadWins / roadGP;
        const homeEdgeRaw = homePct - roadPct;
        homeComponent = config.w_home * homeEdgeRaw;
      }
    }

    // 5. Offensive Strength (normalized against league average)
    const offComponent = config.w_off * (pfpg - leagueAvg.avgPFpg);

    // 6. Defensive Strength (inverted - lower PA is better)
    const defComponent = config.w_def * (leagueAvg.avgPApg - papg);

    // Sum all components
    const tsr = netComponent + momentumComponent + confComponent + homeComponent + offComponent + defComponent;

    return tsr;
  }

  /**
   * Calculate predicted total score with improved normalization
   * Uses a more mathematically precise formula to prevent total drift
   */
  private static calculateTotal(
    homeStandings: NFLStandingsData,
    awayStandings: NFLStandingsData,
    leagueAvg: LeagueAverages,
    config: MatrixConfig
  ): number {
    const homeGP = homeStandings.wins + homeStandings.losses + homeStandings.ties;
    const awayGP = awayStandings.wins + awayStandings.losses + awayStandings.ties;

    if (homeGP === 0 || awayGP === 0) return 45; // Default total

    // Calculate team scoring rates
    const home_PF_ppg = homeStandings.pointsFor / homeGP;
    const home_PA_ppg = homeStandings.pointsAgainst / homeGP;
    const away_PF_ppg = awayStandings.pointsFor / awayGP;
    const away_PA_ppg = awayStandings.pointsAgainst / awayGP;

    // Normalize to league average to get efficiency multipliers
    const homeOffEff = home_PF_ppg / leagueAvg.avgPFpg;
    const homeDefEff = leagueAvg.avgPApg / home_PA_ppg; // Inverted - higher is better
    const awayOffEff = away_PF_ppg / leagueAvg.avgPFpg;
    const awayDefEff = leagueAvg.avgPApg / away_PA_ppg;

    // Expected points using cross-multiplication of efficiencies
    // Home team expected = league avg * home offense efficiency * away defense efficiency
    const homeExpected = leagueAvg.avgPFpg * homeOffEff * (1 / awayDefEff);
    const awayExpected = leagueAvg.avgPFpg * awayOffEff * (1 / homeDefEff);

    // Calculate raw total
    const rawTotal = homeExpected + awayExpected;

    // Apply slight dampening to prevent total drift (5% reduction is typical)
    const dampenedTotal = rawTotal * 0.95;

    // Add manual boost/penalty
    const finalTotal = dampenedTotal + config.total_boost;

    // Clamp to reasonable NFL scoring range
    return Math.max(30, Math.min(70, finalTotal));
  }

  /**
   * Calculate exact scores from total and margin (from PRD)
   */
  private static calculateExactScores(
    total: number,
    margin: number,
    volatility: number
  ): { home: number; away: number } {
    const center = total / 2;

    let homeScore = center + (margin / 2);
    let awayScore = center - (margin / 2);

    // Apply volatility adjustment (spreads the scores more for high volatility)
    const adjustment = (margin / 2) * (volatility - 1);
    homeScore += adjustment;
    awayScore -= adjustment;

    // Clamp to reasonable ranges and round
    return {
      home: Math.round(Math.max(3, Math.min(60, homeScore))),
      away: Math.round(Math.max(3, Math.min(60, awayScore)))
    };
  }

  /**
   * Calculate confidence based on TSR differential
   */
  private static calculateConfidence(homeTSR: number, awayTSR: number): number {
    const tsrDiff = Math.abs(homeTSR - awayTSR);
    // Larger TSR difference = higher confidence
    // Base confidence of 50%, add 5% per point of TSR difference
    const confidence = 50 + (tsrDiff * 5);
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
      moneyline: 0, // Not implemented yet
      total: Math.round(totalEdge * 10) / 10
    };
  }

  /**
   * Get betting recommendation based on confidence and edge
   */
  private static getRecommendation(
    confidence: number,
    edge: { spread: number; total: number }
  ): GamePrediction['recommendation'] {
    const hasSignificantEdge = Math.abs(edge.spread) >= 4 || Math.abs(edge.total) >= 4;
    const hasModerateEdge = Math.abs(edge.spread) >= 2.5 || Math.abs(edge.total) >= 2.5;
    const hasSlightEdge = Math.abs(edge.spread) >= 1.5 || Math.abs(edge.total) >= 1.5;

    if (confidence >= 70 && hasSignificantEdge) return 'strong_bet';
    if (confidence >= 65 && hasModerateEdge) return 'value_bet';
    if (confidence >= 55 && hasSlightEdge) return 'wait';
    return 'avoid';
  }
}
