import axios from 'axios';
import { Game, NFLTeam, TeamStats } from '@/types';

const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

export class NFLAPI {
  /**
   * Get current NFL scoreboard (games for current week)
   */
  static async getScoreboard(seasonYear?: number, week?: number) {
    try {
      let url = `${ESPN_API_BASE}/scoreboard`;
      const params: any = {};

      if (seasonYear && week) {
        params.dates = seasonYear;
        params.week = week;
      }

      const response = await axios.get(url, { params });
      return response.data;
    } catch (error) {
      console.error('NFL API Error:', error);
      throw error;
    }
  }

  /**
   * Get team information
   */
  static async getTeams() {
    try {
      const response = await axios.get(`${ESPN_API_BASE}/teams`);
      return response.data;
    } catch (error) {
      console.error('NFL Teams API Error:', error);
      throw error;
    }
  }

  /**
   * Get specific team details and stats
   */
  static async getTeam(teamId: string) {
    try {
      const response = await axios.get(`${ESPN_API_BASE}/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error('NFL Team API Error:', error);
      throw error;
    }
  }

  /**
   * Get team roster
   */
  static async getTeamRoster(teamId: string) {
    try {
      const response = await axios.get(`${ESPN_API_BASE}/teams/${teamId}/roster`);
      return response.data;
    } catch (error) {
      console.error('NFL Roster API Error:', error);
      throw error;
    }
  }

  /**
   * Get standings
   */
  static async getStandings(seasonYear?: number) {
    try {
      const url = seasonYear
        ? `${ESPN_API_BASE}/standings?season=${seasonYear}`
        : `${ESPN_API_BASE}/standings`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('NFL Standings API Error:', error);
      throw error;
    }
  }

  /**
   * Transform ESPN game data to our Game type
   */
  static transformToGame(espnGame: any): Game {
    const competition = espnGame.competitions?.[0];
    const homeTeam = competition?.competitors?.find((c: any) => c.homeAway === 'home');
    const awayTeam = competition?.competitors?.find((c: any) => c.homeAway === 'away');

    return {
      id: espnGame.id,
      season: parseInt(espnGame.season?.year || new Date().getFullYear()),
      week: parseInt(espnGame.week?.number || 1),
      homeTeam: {
        id: homeTeam?.team?.id || '',
        name: homeTeam?.team?.displayName || '',
        abbreviation: homeTeam?.team?.abbreviation || '',
        logo: homeTeam?.team?.logo || '',
        conference: homeTeam?.team?.conference?.name || 'NFC',
        division: homeTeam?.team?.conferenceId || '',
      },
      awayTeam: {
        id: awayTeam?.team?.id || '',
        name: awayTeam?.team?.displayName || '',
        abbreviation: awayTeam?.team?.abbreviation || '',
        logo: awayTeam?.team?.logo || '',
        conference: awayTeam?.team?.conference?.name || 'AFC',
        division: awayTeam?.team?.conferenceId || '',
      },
      gameTime: new Date(espnGame.date),
      venue: competition?.venue?.fullName || '',
      homeScore: parseInt(homeTeam?.score || 0),
      awayScore: parseInt(awayTeam?.score || 0),
      status: this.mapGameStatus(espnGame.status?.type?.state),
    };
  }

  /**
   * Map ESPN game status to our status type
   */
  private static mapGameStatus(espnStatus: string): Game['status'] {
    switch (espnStatus?.toLowerCase()) {
      case 'pre':
        return 'scheduled';
      case 'in':
        return 'in_progress';
      case 'post':
        return 'completed';
      default:
        return 'scheduled';
    }
  }

  /**
   * Get games for a specific week
   */
  static async getWeekGames(seasonYear: number, week: number): Promise<Game[]> {
    const scoreboard = await this.getScoreboard(seasonYear, week);
    return scoreboard.events?.map((event: any) => this.transformToGame(event)) || [];
  }

  /**
   * Get team statistics
   */
  static async getTeamStats(teamId: string, season?: number): Promise<Partial<TeamStats>> {
    try {
      const teamData = await this.getTeam(teamId);
      const record = teamData.team?.record?.items?.[0];
      const stats = teamData.team?.record?.items?.[0]?.stats;

      return {
        teamId,
        season: season || new Date().getFullYear(),
        wins: record?.stats?.find((s: any) => s.name === 'wins')?.value || 0,
        losses: record?.stats?.find((s: any) => s.name === 'losses')?.value || 0,
        pointsFor: stats?.find((s: any) => s.name === 'pointsFor')?.value || 0,
        pointsAgainst: stats?.find((s: any) => s.name === 'pointsAgainst')?.value || 0,
      };
    } catch (error) {
      console.error('Error fetching team stats:', error);
      return { teamId };
    }
  }

  /**
   * Get current season and week
   */
  static async getCurrentSeasonWeek(): Promise<{ season: number; week: number }> {
    try {
      const scoreboard = await this.getScoreboard();
      const currentSeason = scoreboard.season?.year || new Date().getFullYear();
      const currentWeek = scoreboard.week?.number || 1;

      return {
        season: parseInt(currentSeason),
        week: parseInt(currentWeek),
      };
    } catch (error) {
      const now = new Date();
      return {
        season: now.getFullYear(),
        week: 1,
      };
    }
  }
}
