import { BettingLine } from '@/types';

export interface LineMovement {
  gameId: string;
  timestamp: Date;
  spread: {
    current: number;
    opening: number;
    movement: number;
    direction: 'up' | 'down' | 'stable';
  };
  total: {
    current: number;
    opening: number;
    movement: number;
    direction: 'up' | 'down' | 'stable';
  };
  moneyline: {
    homeCurrent: number;
    homeOpening: number;
    awayCurrent: number;
    awayOpening: number;
  };
}

export interface SharpMoneyIndicator {
  gameId: string;
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  side: 'home' | 'away';
  indicators: {
    reverseLineMovement: boolean; // Line moves opposite to public betting %
    steamMove: boolean; // Sudden sharp line movement (1+ point in minutes)
    lineFreeze: boolean; // Book stops taking action on one side
    consensusMove: boolean; // All books move line simultaneously
    offMarket: boolean; // One book significantly different from others
  };
  analysis: string;
  recommendation: 'follow_sharp' | 'fade_public' | 'wait' | 'no_action';
}

export interface BettingPercentages {
  gameId: string;
  spread: {
    homeTickets: number; // % of bets on home
    awayTickets: number; // % of bets on away
    homeMoney: number; // % of money on home
    awayMoney: number; // % of money on away
  };
  moneyline: {
    homeTickets: number;
    awayTickets: number;
    homeMoney: number;
    awayMoney: number;
  };
}

export class LineMovementTracker {
  private lineHistory: Map<string, BettingLine[]> = new Map();

  /**
   * Track a new betting line
   */
  trackLine(line: BettingLine): void {
    const history = this.lineHistory.get(line.gameId) || [];
    history.push(line);
    this.lineHistory.set(line.gameId, history);
  }

  /**
   * Get line movement for a game
   */
  getMovement(gameId: string): LineMovement | null {
    const history = this.lineHistory.get(gameId);
    if (!history || history.length < 2) {
      return null;
    }

    const opening = history[0];
    const current = history[history.length - 1];

    const spreadMovement = current.spread.home - opening.spread.home;
    const totalMovement = current.total.line - opening.total.line;

    return {
      gameId,
      timestamp: current.timestamp,
      spread: {
        current: current.spread.home,
        opening: opening.spread.home,
        movement: spreadMovement,
        direction: this.getDirection(spreadMovement),
      },
      total: {
        current: current.total.line,
        opening: opening.total.line,
        movement: totalMovement,
        direction: this.getDirection(totalMovement),
      },
      moneyline: {
        homeCurrent: current.moneyline.home,
        homeOpening: opening.moneyline.home,
        awayCurrent: current.moneyline.away,
        awayOpening: opening.moneyline.away,
      },
    };
  }

  /**
   * Detect sharp money indicators
   */
  detectSharpMoney(
    gameId: string,
    bettingPercentages?: BettingPercentages
  ): SharpMoneyIndicator | null {
    const movement = this.getMovement(gameId);
    if (!movement) {
      return null;
    }

    const indicators = {
      reverseLineMovement: false,
      steamMove: false,
      lineFreeze: false,
      consensusMove: false,
      offMarket: false,
    };

    let confidence: SharpMoneyIndicator['confidence'] = 'low';
    let side: 'home' | 'away' = 'home';
    const signals: string[] = [];

    // 1. Reverse Line Movement (RLM)
    // Public is on one side, but line moves the other way
    if (bettingPercentages) {
      const publicOnHome = bettingPercentages.spread.homeTickets > 60;
      const publicOnAway = bettingPercentages.spread.awayTickets > 60;

      // Line moved toward away team, but public is on home
      if (publicOnHome && movement.spread.movement < 0) {
        indicators.reverseLineMovement = true;
        side = 'away';
        signals.push('Reverse line movement detected - public on home, line moving to away');
        confidence = 'high';
      }
      // Line moved toward home team, but public is on away
      else if (publicOnAway && movement.spread.movement > 0) {
        indicators.reverseLineMovement = true;
        side = 'home';
        signals.push('Reverse line movement detected - public on away, line moving to home');
        confidence = 'high';
      }

      // Money vs Tickets discrepancy (sharp money)
      const homeMoneyVsTickets = Math.abs(
        bettingPercentages.spread.homeMoney - bettingPercentages.spread.homeTickets
      );
      if (homeMoneyVsTickets > 15) {
        if (bettingPercentages.spread.homeMoney > bettingPercentages.spread.homeTickets) {
          signals.push('Sharp money on home - higher money % than ticket %');
          side = 'home';
          confidence = confidence === 'high' ? 'very_high' : 'high';
        } else {
          signals.push('Sharp money on away - higher money % than ticket %');
          side = 'away';
          confidence = confidence === 'high' ? 'very_high' : 'high';
        }
      }
    }

    // 2. Steam Move Detection
    // Check for sudden large movements in short time
    const history = this.lineHistory.get(gameId) || [];
    if (history.length >= 2) {
      const recentLines = history.slice(-5); // Last 5 updates
      for (let i = 1; i < recentLines.length; i++) {
        const prev = recentLines[i - 1];
        const curr = recentLines[i];
        const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
        const spreadChange = Math.abs(curr.spread.home - prev.spread.home);

        // 1+ point move in less than 5 minutes = steam move
        if (spreadChange >= 1 && timeDiff < 5 * 60 * 1000) {
          indicators.steamMove = true;
          signals.push(`Steam move detected: ${spreadChange} point move in ${Math.round(timeDiff / 1000)}s`);
          confidence = 'very_high';
          side = curr.spread.home > prev.spread.home ? 'home' : 'away';
        }
      }
    }

    // 3. Consensus Movement
    // All major books move together (indicates sharp action)
    const uniqueBookmakers = new Set(history.map(h => h.bookmaker));
    if (uniqueBookmakers.size >= 3) {
      const recent = history.slice(-uniqueBookmakers.size);
      const timestamps = recent.map(l => l.timestamp.getTime());
      const timeRange = Math.max(...timestamps) - Math.min(...timestamps);

      // All books moved within 10 minutes
      if (timeRange < 10 * 60 * 1000) {
        indicators.consensusMove = true;
        signals.push('Consensus move - all books adjusted simultaneously');
        confidence = confidence === 'low' ? 'medium' : confidence;
      }
    }

    // Determine recommendation
    let recommendation: SharpMoneyIndicator['recommendation'] = 'no_action';

    if (confidence === 'very_high' && indicators.reverseLineMovement) {
      recommendation = 'follow_sharp';
    } else if (confidence === 'high' && (indicators.steamMove || indicators.reverseLineMovement)) {
      recommendation = 'follow_sharp';
    } else if (confidence === 'medium' && indicators.reverseLineMovement) {
      recommendation = 'fade_public';
    } else if (Math.abs(movement.spread.movement) < 0.5) {
      recommendation = 'wait';
    }

    return {
      gameId,
      confidence,
      side,
      indicators,
      analysis: signals.join('. '),
      recommendation,
    };
  }

  /**
   * Get line movement alerts
   */
  getAlerts(gameId: string): {
    type: 'steam' | 'reverse' | 'significant' | 'freeze';
    severity: 'low' | 'medium' | 'high';
    message: string;
  }[] {
    const movement = this.getMovement(gameId);
    const alerts: {
      type: 'steam' | 'reverse' | 'significant' | 'freeze';
      severity: 'low' | 'medium' | 'high';
      message: string;
    }[] = [];

    if (!movement) {
      return alerts;
    }

    // Significant spread movement (2+ points)
    if (Math.abs(movement.spread.movement) >= 2) {
      alerts.push({
        type: 'significant',
        severity: 'high',
        message: `Spread moved ${Math.abs(movement.spread.movement)} points from ${movement.spread.opening} to ${movement.spread.current}`,
      });
    } else if (Math.abs(movement.spread.movement) >= 1) {
      alerts.push({
        type: 'significant',
        severity: 'medium',
        message: `Spread moved ${Math.abs(movement.spread.movement)} point from ${movement.spread.opening} to ${movement.spread.current}`,
      });
    }

    // Total movement (3+ points)
    if (Math.abs(movement.total.movement) >= 3) {
      alerts.push({
        type: 'significant',
        severity: 'high',
        message: `Total moved ${Math.abs(movement.total.movement)} points from ${movement.total.opening} to ${movement.total.current}`,
      });
    }

    return alerts;
  }

  /**
   * Clear history for a game
   */
  clearHistory(gameId: string): void {
    this.lineHistory.delete(gameId);
  }

  /**
   * Get direction from movement value
   */
  private getDirection(movement: number): 'up' | 'down' | 'stable' {
    if (movement > 0.5) return 'up';
    if (movement < -0.5) return 'down';
    return 'stable';
  }

  /**
   * Simulate betting percentages (in production, this would come from a data provider)
   */
  static simulateBettingPercentages(gameId: string): BettingPercentages {
    // This is mock data - in production you'd get this from Action Network, SportsInsights, etc.
    const homeTickets = Math.random() * 100;
    const awayTickets = 100 - homeTickets;

    // Sharp money typically differs from public tickets
    // If public is heavily on one side, sharps often go the other way
    let homeMoney = homeTickets;
    if (homeTickets > 65) {
      // Public loves home, sharps might fade
      homeMoney = homeTickets - (Math.random() * 20);
    } else if (homeTickets < 35) {
      // Public loves away, sharps might fade
      homeMoney = homeTickets + (Math.random() * 20);
    } else {
      // Neutral game, money follows tickets more closely
      homeMoney = homeTickets + ((Math.random() - 0.5) * 10);
    }

    const awayMoney = 100 - homeMoney;

    return {
      gameId,
      spread: {
        homeTickets: Math.round(homeTickets),
        awayTickets: Math.round(awayTickets),
        homeMoney: Math.round(homeMoney),
        awayMoney: Math.round(awayMoney),
      },
      moneyline: {
        homeTickets: Math.round(homeTickets + ((Math.random() - 0.5) * 5)),
        awayTickets: Math.round(awayTickets + ((Math.random() - 0.5) * 5)),
        homeMoney: Math.round(homeMoney + ((Math.random() - 0.5) * 5)),
        awayMoney: Math.round(awayMoney + ((Math.random() - 0.5) * 5)),
      },
    };
  }
}
