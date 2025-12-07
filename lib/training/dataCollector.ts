import { NFLAPI } from '../api/nfl';
import { WeatherAPI } from '../api/weather';
import { FirestoreService } from '../firebase/firestore';
import { Game, TeamStats, TrainingDataPoint, DataCollectionProgress, TrainingDataset } from '@/types';

/**
 * Historical Data Collector for ML Training
 * Collects NFL game data from multiple seasons with team stats at time of game
 */
export class HistoricalDataCollector {
  private trainingData: TrainingDataPoint[] = [];
  private progress: DataCollectionProgress = {
    totalGames: 0,
    gamesCollected: 0,
    currentSeason: 0,
    currentWeek: 0,
    status: 'idle'
  };

  // Indoor stadiums (dome teams)
  private readonly DOME_TEAMS = [
    'ATL', 'DET', 'NO', 'MIN', 'LV', 'LAR', 'IND', 'ARI'
  ];

  // NFL divisions for matchup analysis
  private readonly DIVISIONS: { [key: string]: string[] } = {
    'AFC East': ['BUF', 'MIA', 'NE', 'NYJ'],
    'AFC North': ['BAL', 'CIN', 'CLE', 'PIT'],
    'AFC South': ['HOU', 'IND', 'JAX', 'TEN'],
    'AFC West': ['DEN', 'KC', 'LV', 'LAC'],
    'NFC East': ['DAL', 'NYG', 'PHI', 'WSH'],
    'NFC North': ['CHI', 'DET', 'GB', 'MIN'],
    'NFC South': ['ATL', 'CAR', 'NO', 'TB'],
    'NFC West': ['ARI', 'LAR', 'SF', 'SEA']
  };

  /**
   * Collect historical data for multiple seasons
   */
  async collectSeasons(seasons: number[], startWeek: number = 1, endWeek: number = 18): Promise<TrainingDataset> {
    try {
      this.progress.status = 'collecting';
      this.trainingData = [];

      // Calculate total games to collect
      const weeksPerSeason = endWeek - startWeek + 1;
      const gamesPerWeek = 16; // Average NFL games per week
      this.progress.totalGames = seasons.length * weeksPerSeason * gamesPerWeek;

      console.log(`Starting data collection for seasons ${seasons.join(', ')}`);
      console.log(`Collecting weeks ${startWeek}-${endWeek}, estimated ${this.progress.totalGames} games`);

      for (const season of seasons) {
        this.progress.currentSeason = season;
        console.log(`\n========== Collecting Season ${season} ==========`);

        await this.collectSeason(season, startWeek, endWeek);
      }

      this.progress.status = 'completed';
      console.log(`\nData collection complete! Collected ${this.trainingData.length} games`);

      return this.createDataset(seasons);

    } catch (error) {
      this.progress.status = 'error';
      this.progress.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error collecting historical data:', error);
      throw error;
    }
  }

  /**
   * Collect data for a single season
   */
  private async collectSeason(season: number, startWeek: number, endWeek: number): Promise<void> {
    const teamSeasonStats = new Map<string, { games: Game[], stats: any[] }>();

    for (let week = startWeek; week <= endWeek; week++) {
      this.progress.currentWeek = week;
      console.log(`\nCollecting Week ${week}...`);

      try {
        // Get all games for this week
        const weekGames = await NFLAPI.getWeekGames(season, week);
        const completedGames = weekGames.filter(g => g.status === 'completed');

        console.log(`  Found ${completedGames.length} completed games`);

        for (const game of completedGames) {
          try {
            // Get team stats at time of game (using cumulative season stats)
            const homeStats = await this.getTeamStatsAtWeek(
              game.homeTeam.id,
              season,
              week,
              teamSeasonStats
            );

            const awayStats = await this.getTeamStatsAtWeek(
              game.awayTeam.id,
              season,
              week,
              teamSeasonStats
            );

            // Create training data point
            const dataPoint = await this.createTrainingDataPoint(
              game,
              homeStats,
              awayStats,
              season,
              week,
              teamSeasonStats  // Pass team history for Phase 1 features
            );

            this.trainingData.push(dataPoint);
            this.progress.gamesCollected++;

            // Update team history for rolling stats
            this.updateTeamHistory(teamSeasonStats, game.homeTeam.id, game);
            this.updateTeamHistory(teamSeasonStats, game.awayTeam.id, game);

            console.log(`    ✓ ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}: ${game.awayScore}-${game.homeScore}`);

          } catch (error) {
            console.error(`    ✗ Error processing game ${game.id}:`, error);
          }

          // Small delay to avoid rate limiting
          await this.delay(100);
        }

      } catch (error) {
        console.error(`  Error loading week ${week}:`, error);
      }
    }
  }

  /**
   * Get team stats at a specific week (rolling average)
   */
  private async getTeamStatsAtWeek(
    teamId: string,
    season: number,
    week: number,
    teamSeasonStats: Map<string, any>
  ): Promise<any> {
    const key = `${teamId}-${season}`;
    let teamData = teamSeasonStats.get(key);

    if (!teamData) {
      teamData = { games: [], stats: [] };
      teamSeasonStats.set(key, teamData);
    }

    // If no games yet, get current stats from API
    if (teamData.games.length === 0) {
      const stats = await NFLAPI.getTeamStats(teamId, season);
      return stats;
    }

    // Calculate rolling stats from games played so far
    const gamesPlayed = teamData.games;
    const totalPoints = gamesPlayed.reduce((sum: number, g: Game) => {
      const isHome = g.homeTeam.id === teamId;
      return sum + (isHome ? (g.homeScore || 0) : (g.awayScore || 0));
    }, 0);

    const totalPointsAllowed = gamesPlayed.reduce((sum: number, g: Game) => {
      const isHome = g.homeTeam.id === teamId;
      return sum + (isHome ? (g.awayScore || 0) : (g.homeScore || 0));
    }, 0);

    const wins = gamesPlayed.filter((g: Game) => {
      const isHome = g.homeTeam.id === teamId;
      const teamScore = isHome ? (g.homeScore || 0) : (g.awayScore || 0);
      const oppScore = isHome ? (g.awayScore || 0) : (g.homeScore || 0);
      return teamScore > oppScore;
    }).length;

    const losses = gamesPlayed.length - wins;

    return {
      teamId,
      season,
      week,
      wins,
      losses,
      pointsFor: totalPoints,
      pointsAgainst: totalPointsAllowed,
      gamesPlayed: gamesPlayed.length
    };
  }

  /**
   * Update team history with completed game
   */
  private updateTeamHistory(
    teamSeasonStats: Map<string, any>,
    teamId: string,
    game: Game
  ): void {
    const key = `${teamId}-${game.season}`;
    let teamData = teamSeasonStats.get(key);

    if (!teamData) {
      teamData = { games: [], stats: [] };
      teamSeasonStats.set(key, teamData);
    }

    // Track game with date for rest day calculation
    const isHome = game.homeTeam.id === teamId;
    teamData.games.push({
      ...game,
      gameTime: game.gameTime,  // Track game date
      score: isHome ? (game.homeScore || 0) : (game.awayScore || 0),
      opponentScore: isHome ? (game.awayScore || 0) : (game.homeScore || 0),
      won: isHome ? (game.homeScore || 0) > (game.awayScore || 0) : (game.awayScore || 0) > (game.homeScore || 0)
    });
  }

  /**
   * Calculate rest days between games
   */
  private calculateRestDays(teamGames: any[], currentGameTime: Date): number {
    if (teamGames.length === 0) return 7; // Default for first game

    const lastGame = teamGames[teamGames.length - 1];
    const diffTime = currentGameTime.getTime() - new Date(lastGame.gameTime).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Extract last 3 games performance
   */
  private getLast3GamesStats(teamGames: any[]): {
    pointsScored: number[];
    pointsAllowed: number[];
    margins: number[];
  } {
    const last3 = teamGames.slice(-3);

    return {
      pointsScored: last3.map((g: any) => g.score || 0),
      pointsAllowed: last3.map((g: any) => g.opponentScore || 0),
      margins: last3.map((g: any) => (g.score || 0) - (g.opponentScore || 0))
    };
  }

  /**
   * Identify prime time games
   */
  private getPrimeTimeFlags(gameTime: Date): {
    isThursdayNight: boolean;
    isMondayNight: boolean;
    isSundayNight: boolean;
  } {
    const dayOfWeek = gameTime.getDay(); // 0=Sun, 1=Mon, 4=Thu
    const hour = gameTime.getHours();

    return {
      isThursdayNight: dayOfWeek === 4,
      isMondayNight: dayOfWeek === 1 && hour >= 20,
      isSundayNight: dayOfWeek === 0 && hour >= 20
    };
  }

  /**
   * Create a training data point from a game
   */
  private async createTrainingDataPoint(
    game: Game,
    homeStats: any,
    awayStats: any,
    season: number,
    week: number,
    teamSeasonStats?: Map<string, any>
  ): Promise<TrainingDataPoint> {
    // Calculate team features
    const homeGamesPlayed = homeStats.gamesPlayed || (homeStats.wins + homeStats.losses) || 1;
    const awayGamesPlayed = awayStats.gamesPlayed || (awayStats.wins + awayStats.losses) || 1;

    const homePPG = (homeStats.pointsFor || 0) / homeGamesPlayed;
    const homePAG = (homeStats.pointsAgainst || 0) / homeGamesPlayed;
    const awayPPG = (awayStats.pointsFor || 0) / awayGamesPlayed;
    const awayPAG = (awayStats.pointsAgainst || 0) / awayGamesPlayed;

    const homeWinPct = homeGamesPlayed > 0 ? (homeStats.wins || 0) / homeGamesPlayed : 0;
    const awayWinPct = awayGamesPlayed > 0 ? (awayStats.wins || 0) / awayGamesPlayed : 0;

    // NEW: Get team game history for Phase 1 features
    const homeKey = `${game.homeTeam.id}-${season}`;
    const awayKey = `${game.awayTeam.id}-${season}`;
    const homeTeamData = teamSeasonStats?.get(homeKey);
    const awayTeamData = teamSeasonStats?.get(awayKey);

    const homeGames = homeTeamData?.games || [];
    const awayGames = awayTeamData?.games || [];

    // NEW: Calculate rest days
    const homeRestDays = this.calculateRestDays(homeGames, game.gameTime);
    const awayRestDays = this.calculateRestDays(awayGames, game.gameTime);

    // NEW: Get last 3 games stats
    const homeLast3 = this.getLast3GamesStats(homeGames);
    const awayLast3 = this.getLast3GamesStats(awayGames);

    // NEW: Get prime time flags
    const primeTimeFlags = this.getPrimeTimeFlags(game.gameTime);

    // Get weather data (or use defaults for domes)
    let weather = {
      temperature: 72,
      windSpeed: 0,
      precipitation: 0,
      isDome: this.DOME_TEAMS.includes(game.homeTeam.abbreviation)
    };

    if (!weather.isDome && game.weather) {
      weather = {
        temperature: game.weather.temperature,
        windSpeed: game.weather.windSpeed,
        precipitation: game.weather.precipitation,
        isDome: false
      };
    }

    // Matchup analysis
    const isDivisional = this.isDivisionalGame(game.homeTeam.abbreviation, game.awayTeam.abbreviation);
    const isConference = game.homeTeam.conference === game.awayTeam.conference;

    return {
      gameId: game.id,
      season,
      week,

      homeTeam: {
        id: game.homeTeam.id,
        name: game.homeTeam.name,
        winPct: homeWinPct,
        ppg: homePPG,
        pag: homePAG,
        yardsPerGame: (homeStats.yardsFor || 0) / homeGamesPlayed,
        yardsAllowedPerGame: (homeStats.yardsAgainst || 0) / homeGamesPlayed,
        turnoverDiff: ((homeStats.takeaways || 0) - (homeStats.turnovers || 0)) / homeGamesPlayed,
        homeRecord: 0.5,  // Would need home/away split from detailed stats
        awayRecord: 0.5,
        last3Games: homeLast3,  // NEW: Last 3 games performance
        restDays: homeRestDays,  // NEW: Rest days
        streak: 0         // Would calculate from game history
      },

      awayTeam: {
        id: game.awayTeam.id,
        name: game.awayTeam.name,
        winPct: awayWinPct,
        ppg: awayPPG,
        pag: awayPAG,
        yardsPerGame: (awayStats.yardsFor || 0) / awayGamesPlayed,
        yardsAllowedPerGame: (awayStats.yardsAgainst || 0) / awayGamesPlayed,
        turnoverDiff: ((awayStats.takeaways || 0) - (awayStats.turnovers || 0)) / awayGamesPlayed,
        homeRecord: 0.5,
        awayRecord: 0.5,
        last3Games: awayLast3,  // NEW: Last 3 games performance
        restDays: awayRestDays,  // NEW: Rest days
        streak: 0
      },

      matchup: {
        isDivisional,
        isConference,
        restDaysDiff: homeRestDays - awayRestDays,  // NEW: Rest day differential
        ...primeTimeFlags  // NEW: Thursday/Monday/Sunday night flags
      },

      weather,

      outcome: {
        homeScore: game.homeScore || 0,
        awayScore: game.awayScore || 0,
        actualSpread: (game.homeScore || 0) - (game.awayScore || 0),
        actualTotal: (game.homeScore || 0) + (game.awayScore || 0),
        homeWon: (game.homeScore || 0) > (game.awayScore || 0)
      }
    };
  }

  /**
   * Check if two teams are in the same division
   */
  private isDivisionalGame(team1: string, team2: string): boolean {
    for (const teams of Object.values(this.DIVISIONS)) {
      if (teams.includes(team1) && teams.includes(team2)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Create final dataset with metadata
   */
  private createDataset(seasons: number[]): TrainingDataset {
    return {
      metadata: {
        collectionDate: new Date(),
        seasons,
        totalGames: this.trainingData.length,
        features: this.getFeatureList(),
        version: '1.0.0'
      },
      data: this.trainingData
    };
  }

  /**
   * Get list of all features in the dataset
   */
  private getFeatureList(): string[] {
    return [
      // Team stats (12 features)
      'home_win_pct', 'home_ppg', 'home_pag', 'home_yards_pg', 'home_yards_allowed_pg', 'home_turnover_diff',
      'away_win_pct', 'away_ppg', 'away_pag', 'away_yards_pg', 'away_yards_allowed_pg', 'away_turnover_diff',
      // Phase 1: Last 3 games (4 features)
      'home_last3_ppf', 'home_last3_ppa', 'away_last3_ppf', 'away_last3_ppa',
      // Phase 1: Rest days (3 features)
      'home_rest_days', 'away_rest_days', 'rest_days_diff',
      // Matchup flags (2 features)
      'is_divisional', 'is_conference',
      // Phase 1: Prime time (3 features)
      'is_thursday_night', 'is_monday_night', 'is_sunday_night',
      // Weather (4 features)
      'temperature', 'wind_speed', 'precipitation', 'is_dome'
      // Total: 23 + 10 = 33 features
    ];
  }

  /**
   * Export dataset to JSON file
   */
  async exportToJSON(dataset: TrainingDataset): Promise<string> {
    const json = JSON.stringify(dataset, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `nfl_training_data_${dataset.metadata.seasons.join('_')}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return json;
  }

  /**
   * Save dataset to Firebase
   */
  async saveToFirebase(dataset: TrainingDataset): Promise<void> {
    try {
      console.log('Saving training dataset to Firebase...');

      // Save metadata
      await FirestoreService.saveTrainingDataset({
        collectionDate: dataset.metadata.collectionDate,
        seasons: dataset.metadata.seasons,
        totalGames: dataset.metadata.totalGames,
        features: dataset.metadata.features,
        version: dataset.metadata.version
      });

      // Save individual data points (in batches to avoid limits)
      const batchSize = 100;
      for (let i = 0; i < dataset.data.length; i += batchSize) {
        const batch = dataset.data.slice(i, i + batchSize);
        await Promise.all(
          batch.map(dataPoint =>
            FirestoreService.saveTrainingDataPoint(dataPoint)
          )
        );
        console.log(`Saved ${Math.min(i + batchSize, dataset.data.length)}/${dataset.data.length} games`);
      }

      console.log('Training dataset saved to Firebase!');
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      throw error;
    }
  }

  /**
   * Get current progress
   */
  getProgress(): DataCollectionProgress {
    return { ...this.progress };
  }

  /**
   * Utility: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
