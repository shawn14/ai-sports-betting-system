import { Game, GamePrediction, BettingLine } from '@/types';
import { MatrixPredictor, LeagueAverages } from './matrixPredictor';
import { MATRIX_PRESETS, getPreset } from './matrixPresets';
import { StandingsCacheService } from '@/lib/firebase/standingsCache';
import { generateModelId } from './modelRegistry';
import type { NFLStandingsData } from '@/lib/scrapers/nflStandingsScraper';

/**
 * Helper function to generate predictions using Matrix system
 * This wraps the Matrix predictor with all the necessary data fetching
 */
export class MatrixHelper {
  /**
   * Calculate league averages from standings data
   * (Replicated from NFLStandingsScraper to avoid importing Puppeteer in client)
   */
  private static calculateLeagueAverages(standings: NFLStandingsData[]): LeagueAverages {
    let totalPF = 0;
    let totalPA = 0;
    let totalGames = 0;

    standings.forEach(team => {
      const gp = team.wins + team.losses + team.ties;
      totalPF += team.pointsFor;
      totalPA += team.pointsAgainst;
      totalGames += gp;
    });

    const avgPFpg = totalGames > 0 ? totalPF / totalGames : 0;
    const avgPApg = totalGames > 0 ? totalPA / totalGames : 0;

    return {
      avgPFpg,
      avgPApg,
      avgNetPG: avgPFpg - avgPApg
    };
  }

  /**
   * Generate a prediction for a single game using Matrix system
   * @param game - The game to predict
   * @param season - Current season
   * @param week - Current week
   * @param presetName - Matrix preset to use (defaults to 'balanced')
   * @param bettingLines - Optional betting lines for edge calculation
   */
  static async predictGame(
    game: Game,
    season: number,
    week: number,
    presetName: string = 'balanced',
    bettingLines?: BettingLine[]
  ): Promise<GamePrediction> {
    try {
      // Get standings for both teams
      const [homeStandings, awayStandings, allStandings] = await Promise.all([
        StandingsCacheService.getTeamStandings(season, week, game.homeTeam.name),
        StandingsCacheService.getTeamStandings(season, week, game.awayTeam.name),
        StandingsCacheService.getStandings(season, week)
      ]);

      // Check if we have standings data
      if (!homeStandings || !awayStandings || !allStandings) {
        throw new Error(`Missing standings data for ${game.homeTeam.name} vs ${game.awayTeam.name}. Please run scrape-standings script.`);
      }

      // Calculate league averages
      const leagueAvg = this.calculateLeagueAverages(allStandings);

      // Get Matrix config
      const config = getPreset(presetName);

      // Generate prediction
      const prediction = MatrixPredictor.predictGame(
        game,
        homeStandings,
        awayStandings,
        leagueAvg,
        config,
        bettingLines
      );

      // Add model versioning (Phase 2)
      prediction.modelId = generateModelId('matrix', presetName);
      prediction.modelVersion = '1.0.0';
      prediction.presetName = presetName;

      return prediction;
    } catch (error) {
      console.error('Error generating Matrix prediction:', error);
      throw error;
    }
  }

  /**
   * Generate predictions for multiple games
   * @param games - Array of games to predict
   * @param season - Current season
   * @param week - Current week
   * @param presetName - Matrix preset to use
   * @param oddsData - Optional array of odds data for all games
   */
  static async predictGames(
    games: Game[],
    season: number,
    week: number,
    presetName: string = 'balanced',
    oddsData?: any[]
  ): Promise<Map<string, GamePrediction>> {
    const predictions = new Map<string, GamePrediction>();

    // Pre-fetch standings once for all games
    const allStandings = await StandingsCacheService.getStandings(season, week);

    if (!allStandings) {
      throw new Error(`No standings data found for season ${season} week ${week}. Please run: npm run scrape-standings ${season} ${week}`);
    }

    const leagueAvg = this.calculateLeagueAverages(allStandings);
    const config = getPreset(presetName);

    for (const game of games) {
      try {
        // Find team standings - use team abbreviation for more reliable matching
        const homeStandings = allStandings.find(s => {
          const teamLower = s.team.toLowerCase();
          const homeName = game.homeTeam.name.toLowerCase();
          const homeAbbr = game.homeTeam.abbreviation?.toLowerCase();

          return teamLower.includes(homeName) ||
                 homeName.includes(teamLower) ||
                 (homeAbbr && teamLower.includes(homeAbbr));
        });

        const awayStandings = allStandings.find(s => {
          const teamLower = s.team.toLowerCase();
          const awayName = game.awayTeam.name.toLowerCase();
          const awayAbbr = game.awayTeam.abbreviation?.toLowerCase();

          return teamLower.includes(awayName) ||
                 awayName.includes(teamLower) ||
                 (awayAbbr && teamLower.includes(awayAbbr));
        });

        if (!homeStandings || !awayStandings) {
          console.error(`❌ SKIPPING GAME: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
          console.error(`  Home team: "${game.homeTeam.name}" (${game.homeTeam.abbreviation}) - Found: ${!!homeStandings}`);
          console.error(`  Away team: "${game.awayTeam.name}" (${game.awayTeam.abbreviation}) - Found: ${!!awayStandings}`);
          console.error(`  Available teams in standings:`, allStandings.map(s => s.team).join(', '));
          continue;
        }

        // Find betting lines if odds data provided
        let bettingLines: BettingLine[] | undefined;
        if (oddsData) {
          const gameOdds = oddsData.find((o: any) => {
            const matchHome = o.home_team?.toLowerCase().includes(game.homeTeam.name.toLowerCase()) ||
                             o.home_team?.toLowerCase().includes(game.homeTeam.abbreviation.toLowerCase());
            const matchAway = o.away_team?.toLowerCase().includes(game.awayTeam.name.toLowerCase()) ||
                             o.away_team?.toLowerCase().includes(game.awayTeam.abbreviation.toLowerCase());
            return matchHome && matchAway;
          });

          if (gameOdds && gameOdds.bookmakers && gameOdds.bookmakers.length > 0) {
            // Transform odds data to BettingLine format
            const bookmaker = gameOdds.bookmakers[0];
            const spreads = bookmaker.markets?.find((m: any) => m.key === 'spreads');
            const totals = bookmaker.markets?.find((m: any) => m.key === 'totals');

            if (spreads && totals) {
              bettingLines = [{
                bookmaker: bookmaker.key,
                spread: {
                  home: spreads.outcomes[0].point,
                  away: spreads.outcomes[1].point,
                  homeOdds: spreads.outcomes[0].price,
                  awayOdds: spreads.outcomes[1].price
                },
                total: {
                  line: totals.outcomes[0].point,
                  overOdds: totals.outcomes[0].price,
                  underOdds: totals.outcomes[1].price
                },
                moneyline: {
                  home: 0,
                  away: 0
                },
                lastUpdate: new Date()
              }];
            }
          }
        }

        // Generate prediction
        const prediction = MatrixPredictor.predictGame(
          game,
          homeStandings,
          awayStandings,
          leagueAvg,
          config,
          bettingLines
        );

        // Add model versioning (Phase 2)
        prediction.modelId = generateModelId('matrix', presetName);
        prediction.modelVersion = '1.0.0';
        prediction.presetName = presetName;

        predictions.set(game.id, prediction);
      } catch (error) {
        console.error(`Error predicting game ${game.id}:`, error);
      }
    }

    return predictions;
  }

  /**
   * Check if standings data is available for a season/week
   */
  static async hasStandingsData(season: number, week: number): Promise<boolean> {
    const standings = await StandingsCacheService.getStandings(season, week);
    return standings !== null && standings.length > 0;
  }

  /**
   * Get available presets
   */
  static getAvailablePresets(): string[] {
    return Object.keys(MATRIX_PRESETS);
  }
}
