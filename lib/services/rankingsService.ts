import { upsertDocument } from '@/lib/firebase/restClient';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { StandingsCacheService } from '@/lib/firebase/standingsCache';
import { MatrixPredictor, LeagueAverages } from '@/lib/models/matrixPredictor';
import { getPreset } from '@/lib/models/matrixPresets';
import type { NFLStandingsData } from '@/lib/scrapers/nflStandingsScraper';

export interface TeamRating {
  team: string;
  conference: 'AFC' | 'NFC';
  division: string;
  record: string;
  tsr: number;
  netPoints: number;
  momentum: number;
  conference: number;
  homeAdvantage: number;
  offensive: number;
  defensive: number;
  rank: number;
  trend: 'up' | 'down' | 'same';
}

export interface RankingsCache {
  season: number;
  week: number;
  teams: TeamRating[];
  calculatedAt: string;
  expiresAt: string;
}

/**
 * Service for calculating and caching team power rankings
 */
export class RankingsService {
  /**
   * Calculate league averages from standings
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
   * Calculate TSR components for a team
   */
  private static calculateTSRComponents(
    standings: NFLStandingsData,
    isHome: boolean,
    leagueAvg: LeagueAverages,
    config: any
  ): { tsr: number; netPoints: number; momentum: number; conference: number; homeAdvantage: number; offensive: number; defensive: number } {
    const gp = standings.wins + standings.losses + standings.ties;
    if (gp === 0) return { tsr: 0, netPoints: 0, momentum: 0, conference: 0, homeAdvantage: 0, offensive: 0, defensive: 0 };

    const pfpg = standings.pointsFor / gp;
    const papg = standings.pointsAgainst / gp;
    const netPG = pfpg - papg;
    const winPct = standings.wins / gp;

    const netPoints = config.w_net * (netPG - leagueAvg.avgNetPG);

    const last5GP = standings.last5Wins + standings.last5Losses;
    const last5Pct = last5GP > 0 ? standings.last5Wins / last5GP : winPct;
    const momentum = config.w_momentum * (last5Pct - winPct);

    const confGP = standings.confWins + standings.confLosses;
    const confPct = confGP > 0 ? standings.confWins / confGP : 0.50;
    const conference = config.w_conf * (confPct - 0.50);

    let homeAdvantage = 0;
    const homeGP = standings.homeWins + standings.homeLosses;
    const roadGP = standings.roadWins + standings.roadLosses;
    if (homeGP > 0 && roadGP > 0) {
      const homePct = standings.homeWins / homeGP;
      const roadPct = standings.roadWins / roadGP;
      const homeEdgeRaw = homePct - roadPct;
      homeAdvantage = config.w_home * homeEdgeRaw;
    }

    const offensive = config.w_off * (pfpg - leagueAvg.avgPFpg);
    const defensive = config.w_def * (leagueAvg.avgPApg - papg);

    const tsr = netPoints + momentum + conference + homeAdvantage + offensive + defensive;

    return { tsr, netPoints, momentum, conference, homeAdvantage, offensive, defensive };
  }

  /**
   * Determine conference from team name
   */
  private static determineConference(teamName: string): 'AFC' | 'NFC' {
    const afc = [
      'Bills', 'Dolphins', 'Patriots', 'Jets',
      'Ravens', 'Bengals', 'Browns', 'Steelers',
      'Texans', 'Colts', 'Jaguars', 'Titans',
      'Chiefs', 'Broncos', 'Raiders', 'Chargers'
    ];

    const isAFC = afc.some(team => teamName.includes(team));
    return isAFC ? 'AFC' : 'NFC';
  }

  /**
   * Determine division from team name
   */
  private static determineDivision(teamName: string): string {
    const divisions: Record<string, string> = {
      'Bills': 'East', 'Dolphins': 'East', 'Patriots': 'East', 'Jets': 'East',
      'Ravens': 'North', 'Bengals': 'North', 'Browns': 'North', 'Steelers': 'North',
      'Texans': 'South', 'Colts': 'South', 'Jaguars': 'South', 'Titans': 'South',
      'Chiefs': 'West', 'Broncos': 'West', 'Raiders': 'West', 'Chargers': 'West',
      'Eagles': 'East', 'Cowboys': 'East', 'Giants': 'East', 'Commanders': 'East',
      'Lions': 'North', 'Packers': 'North', 'Vikings': 'North', 'Bears': 'North',
      'Buccaneers': 'South', 'Falcons': 'South', 'Panthers': 'South', 'Saints': 'South',
      '49ers': 'West', 'Seahawks': 'West', 'Rams': 'West', 'Cardinals': 'West'
    };

    for (const [keyword, division] of Object.entries(divisions)) {
      if (teamName.includes(keyword)) {
        return division;
      }
    }

    return 'Unknown';
  }

  /**
   * Calculate rankings for a given season/week and save to Firestore
   */
  static async calculateAndCacheRankings(season: number, week: number): Promise<TeamRating[]> {
    console.log(`Calculating rankings for ${season} week ${week}...`);

    // Fetch standings from Firebase
    const allStandings = await StandingsCacheService.getStandings(season, week);

    if (!allStandings || allStandings.length === 0) {
      throw new Error(`No standings data found for ${season} week ${week}`);
    }

    // Calculate league averages
    const leagueAvg = this.calculateLeagueAverages(allStandings);

    // Get Matrix config
    const config = getPreset('balanced');

    // Calculate TSR for all teams
    const teamRatings: TeamRating[] = allStandings.map(standings => {
      const components = this.calculateTSRComponents(standings, false, leagueAvg, config);
      const conference = this.determineConference(standings.team);
      const division = this.determineDivision(standings.team);

      return {
        team: standings.team,
        conference,
        division,
        record: `${standings.wins}-${standings.losses}${standings.ties > 0 ? `-${standings.ties}` : ''}`,
        tsr: components.tsr,
        netPoints: components.netPoints,
        momentum: components.momentum,
        conference: components.conference,
        homeAdvantage: components.homeAdvantage,
        offensive: components.offensive,
        defensive: components.defensive,
        rank: 0,
        trend: 'same' as const
      };
    });

    // Sort by TSR and assign ranks
    teamRatings.sort((a, b) => b.tsr - a.tsr);
    teamRatings.forEach((team, index) => {
      team.rank = index + 1;
    });

    // Save to Firestore
    const cacheId = `${season}-w${week}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const rankingsData: RankingsCache = {
      season,
      week,
      teams: teamRatings,
      calculatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Use REST API for write operations (Firebase SDK is broken)
    await upsertDocument('team_rankings', cacheId, rankingsData);

    console.log(`✅ Saved rankings to Firestore: team_rankings/${cacheId}`);

    return teamRatings;
  }

  /**
   * Get cached rankings from Firestore (returns null if not found or expired)
   */
  static async getCachedRankings(season: number, week: number): Promise<TeamRating[] | null> {
    const cacheId = `${season}-w${week}`;
    const rankingsDoc = await getDoc(doc(db, 'team_rankings', cacheId));

    if (!rankingsDoc.exists()) {
      console.log(`Rankings cache miss: team_rankings/${cacheId}`);
      return null;
    }

    const data = rankingsDoc.data() as RankingsCache;

    // Check if expired
    if (data.expiresAt && new Date() > new Date(data.expiresAt)) {
      console.log(`Rankings cache expired: team_rankings/${cacheId}`);
      return null;
    }

    console.log(`Rankings cache hit: team_rankings/${cacheId}`);
    return data.teams;
  }

  /**
   * Get rankings (from cache or calculate if needed)
   */
  static async getRankings(season: number, week: number): Promise<TeamRating[]> {
    // Try to get from cache first
    let rankings = await this.getCachedRankings(season, week);

    // If not cached or expired, calculate and cache
    if (!rankings) {
      rankings = await this.calculateAndCacheRankings(season, week);
    }

    return rankings;
  }
}
