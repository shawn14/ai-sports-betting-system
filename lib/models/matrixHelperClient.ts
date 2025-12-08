import { Game, GamePrediction } from '@/types';
import type { NFLStandingsData } from '@/lib/scrapers/nflStandingsScraper';

/**
 * Client-side Matrix Helper
 * This version fetches standings via API instead of direct Firebase access
 */
export class MatrixHelperClient {
  /**
   * Fetch standings from API
   */
  private static async fetchStandings(season: number, week: number): Promise<NFLStandingsData[]> {
    const response = await fetch(`/api/standings?season=${season}&week=${week}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch standings: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check if standings data is available
   */
  static async hasStandingsData(season: number, week: number): Promise<boolean> {
    try {
      const standings = await this.fetchStandings(season, week);
      return standings && standings.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate predictions via API
   */
  static async predictGames(
    games: Game[],
    season: number,
    week: number,
    presetName: string = 'balanced',
    oddsData?: any[]
  ): Promise<Map<string, GamePrediction>> {
    // For client-side, we'll call a prediction API endpoint
    const response = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        games,
        season,
        week,
        presetName,
        oddsData
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate predictions: ${response.statusText}`);
    }

    const data = await response.json();
    return new Map(Object.entries(data.predictions));
  }

  /**
   * Generate prediction for a single game via API
   */
  static async predictGame(
    game: Game,
    season: number,
    week: number,
    presetName: string = 'balanced',
    bettingLines?: any
  ): Promise<GamePrediction> {
    const predictions = await this.predictGames([game], season, week, presetName, bettingLines ? [bettingLines] : undefined);
    const prediction = predictions.get(game.id);

    if (!prediction) {
      throw new Error(`Failed to generate prediction for game ${game.id}`);
    }

    return prediction;
  }
}
