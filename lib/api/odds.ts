import axios from 'axios';
import { BettingLine, OddsComparison } from '@/types';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.NEXT_PUBLIC_ODDS_API_KEY;

export class OddsAPI {
  private static async request(endpoint: string, params: Record<string, any> = {}) {
    try {
      const response = await axios.get(`${ODDS_API_BASE}${endpoint}`, {
        params: {
          apiKey: API_KEY,
          ...params,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Odds API Error:', error);
      throw error;
    }
  }

  /**
   * Get current NFL odds from multiple sportsbooks
   */
  static async getNFLOdds(regions: string = 'us', markets: string = 'h2h,spreads,totals') {
    // Call The Odds API directly (works server-side and client-side)
    try {
      const response = await axios.get(`${ODDS_API_BASE}/sports/americanfootball_nfl/odds`, {
        params: {
          apiKey: API_KEY,
          regions,
          markets,
          oddsFormat: 'american',
          dateFormat: 'iso',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Odds API Error:', error);
      throw error;
    }
  }

  /**
   * Get historical odds for a specific game
   */
  static async getHistoricalOdds(eventId: string) {
    return this.request(`/sports/americanfootball_nfl/events/${eventId}/odds`, {
      regions: 'us',
      markets: 'h2h,spreads,totals',
      oddsFormat: 'american',
      dateFormat: 'iso',
    });
  }

  /**
   * Transform API response to BettingLine format
   */
  static transformToBettingLines(oddsData: any): BettingLine[] {
    const lines: BettingLine[] = [];

    oddsData.bookmakers?.forEach((bookmaker: any) => {
      const spreadMarket = bookmaker.markets?.find((m: any) => m.key === 'spreads');
      const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
      const totalsMarket = bookmaker.markets?.find((m: any) => m.key === 'totals');

      if (spreadMarket && h2hMarket && totalsMarket) {
        const homeTeamIndex = oddsData.home_team === spreadMarket.outcomes[0].name ? 0 : 1;
        const awayTeamIndex = 1 - homeTeamIndex;

        lines.push({
          gameId: oddsData.id,
          bookmaker: bookmaker.title,
          timestamp: new Date(bookmaker.last_update),
          spread: {
            home: spreadMarket.outcomes[homeTeamIndex].point,
            away: spreadMarket.outcomes[awayTeamIndex].point,
            homeOdds: spreadMarket.outcomes[homeTeamIndex].price,
            awayOdds: spreadMarket.outcomes[awayTeamIndex].price,
          },
          moneyline: {
            home: h2hMarket.outcomes[homeTeamIndex].price,
            away: h2hMarket.outcomes[awayTeamIndex].price,
          },
          total: {
            over: totalsMarket.outcomes[0].price,
            under: totalsMarket.outcomes[1].price,
            line: totalsMarket.outcomes[0].point,
          },
        });
      }
    });

    return lines;
  }

  /**
   * Find best odds across all sportsbooks
   */
  static findBestOdds(lines: BettingLine[]): Partial<OddsComparison> {
    if (lines.length === 0) return {};

    let bestSpreadHome = lines[0];
    let bestSpreadAway = lines[0];
    let bestMoneylineHome = lines[0];
    let bestMoneylineAway = lines[0];
    let bestTotalOver = lines[0];
    let bestTotalUnder = lines[0];

    lines.forEach((line) => {
      // Best spread odds
      if (line.spread.homeOdds > bestSpreadHome.spread.homeOdds) {
        bestSpreadHome = line;
      }
      if (line.spread.awayOdds > bestSpreadAway.spread.awayOdds) {
        bestSpreadAway = line;
      }

      // Best moneyline odds
      if (line.moneyline.home > bestMoneylineHome.moneyline.home) {
        bestMoneylineHome = line;
      }
      if (line.moneyline.away > bestMoneylineAway.moneyline.away) {
        bestMoneylineAway = line;
      }

      // Best total odds
      if (line.total.over > bestTotalOver.total.over) {
        bestTotalOver = line;
      }
      if (line.total.under > bestTotalUnder.total.under) {
        bestTotalUnder = line;
      }
    });

    return {
      bestSpread: {
        home: bestSpreadHome,
        away: bestSpreadAway,
      },
      bestMoneyline: {
        home: bestMoneylineHome,
        away: bestMoneylineAway,
      },
      bestTotal: {
        over: bestTotalOver,
        under: bestTotalUnder,
      },
    };
  }

  /**
   * Calculate implied probability from American odds
   */
  static impliedProbability(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100);
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }

  /**
   * Check for arbitrage opportunities
   */
  static findArbitrageOpportunities(lines: BettingLine[]): any[] {
    const opportunities: any[] = [];

    // Check all combinations of bookmakers
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const line1 = lines[i];
        const line2 = lines[j];

        // Check spread arbitrage
        const spreadProb =
          this.impliedProbability(line1.spread.homeOdds) +
          this.impliedProbability(line2.spread.awayOdds);

        if (spreadProb < 1) {
          opportunities.push({
            type: 'spread',
            profit: ((1 / spreadProb) - 1) * 100,
            bet1: { bookmaker: line1.bookmaker, side: 'home', odds: line1.spread.homeOdds },
            bet2: { bookmaker: line2.bookmaker, side: 'away', odds: line2.spread.awayOdds },
          });
        }

        // Check moneyline arbitrage
        const mlProb =
          this.impliedProbability(line1.moneyline.home) +
          this.impliedProbability(line2.moneyline.away);

        if (mlProb < 1) {
          opportunities.push({
            type: 'moneyline',
            profit: ((1 / mlProb) - 1) * 100,
            bet1: { bookmaker: line1.bookmaker, side: 'home', odds: line1.moneyline.home },
            bet2: { bookmaker: line2.bookmaker, side: 'away', odds: line2.moneyline.away },
          });
        }
      }
    }

    return opportunities;
  }
}
