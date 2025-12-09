import type { NFLStandingsData } from '@/lib/scrapers/nflStandingsScraper';
import { db } from './config';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

export class StandingsCacheService {
  /**
   * Save scraped standings to Firebase
   */
  static async saveStandings(
    season: number,
    week: number,
    standings: NFLStandingsData[]
  ): Promise<void> {
    const cacheId = `${season}-w${week}`;

    try {
      console.log(`Saving to Firebase: standings_cache/${cacheId}...`);

      // Clean data - Firebase doesn't like empty strings, NaN, Infinity, or undefined
      const cleanedStandings = standings.map(team => ({
        team: team.team || 'Unknown',
        wins: Number.isFinite(team.wins) ? team.wins : 0,
        losses: Number.isFinite(team.losses) ? team.losses : 0,
        ties: Number.isFinite(team.ties) ? team.ties : 0,
        pointsFor: Number.isFinite(team.pointsFor) ? team.pointsFor : 0,
        pointsAgainst: Number.isFinite(team.pointsAgainst) ? team.pointsAgainst : 0,
        homeWins: Number.isFinite(team.homeWins) ? team.homeWins : 0,
        homeLosses: Number.isFinite(team.homeLosses) ? team.homeLosses : 0,
        roadWins: Number.isFinite(team.roadWins) ? team.roadWins : 0,
        roadLosses: Number.isFinite(team.roadLosses) ? team.roadLosses : 0,
        confWins: Number.isFinite(team.confWins) ? team.confWins : 0,
        confLosses: Number.isFinite(team.confLosses) ? team.confLosses : 0,
        last5Wins: Number.isFinite(team.last5Wins) ? team.last5Wins : 0,
        last5Losses: Number.isFinite(team.last5Losses) ? team.last5Losses : 0,
        conference: (team.conference && team.conference !== '') ? team.conference : 'Unknown',
        division: (team.division && team.division !== '') ? team.division : 'Unknown'
      }));

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const data = {
        season,
        week,
        standings: cleanedStandings,
        scrapedAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt)
      };

      const cacheRef = doc(db, 'standings_cache', cacheId);
      await setDoc(cacheRef, data);

      console.log(`✅ Saved standings to Firebase: standings_cache/${cacheId}`);
    } catch (error: any) {
      console.error(`❌ Failed to save to Firebase:`);
      console.error(`Error code: ${error?.code}`);
      console.error(`Error message: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Get cached standings (with fallback to JSON files)
   */
  static async getStandings(
    season: number,
    week: number
  ): Promise<NFLStandingsData[] | null> {
    // First try Firestore cache
    try {
      const cacheId = `${season}-w${week}`;
      const cacheRef = doc(db, 'standings_cache', cacheId);
      const cacheDoc = await getDoc(cacheRef);

      if (cacheDoc.exists()) {
        const data = cacheDoc.data();

        // Check if expired
        if (!data.expiresAt || new Date() <= new Date(data.expiresAt)) {
          console.log(`✅ Firestore cache hit: standings_cache/${cacheId}`);
          return data.standings as NFLStandingsData[];
        }
        console.log(`Cache expired: standings_cache/${cacheId}`);
      } else {
        console.log(`Firestore cache miss: standings_cache/${cacheId}`);
      }
    } catch (error) {
      console.log('Firestore read failed, falling back to file system');
    }

    // Fallback to JSON file
    try {
      console.log(`📁 Reading from file: standings_${season}_w${week}.json`);

      // Check if we're on server-side (Node.js) or client-side (browser)
      if (typeof window === 'undefined') {
        // Server-side: use fs
        const filePath = path.join(process.cwd(), 'public', 'training', `standings_${season}_w${week}.json`);

        if (!fs.existsSync(filePath)) {
          console.log(`File not found: ${filePath}`);
          return null;
        }

        const fileContents = fs.readFileSync(filePath, 'utf-8');
        const standings = JSON.parse(fileContents);
        console.log(`✅ Loaded ${standings.length} teams from file (server-side)`);
        return standings as NFLStandingsData[];
      } else {
        // Client-side: use fetch
        const response = await fetch(`/training/standings_${season}_w${week}.json`);

        if (!response.ok) {
          console.log(`File not found: standings_${season}_w${week}.json`);
          return null;
        }

        const standings = await response.json();
        console.log(`✅ Loaded ${standings.length} teams from file (client-side)`);
        return standings as NFLStandingsData[];
      }
    } catch (error) {
      console.error(`Failed to load standings file:`, error);
      return null;
    }
  }

  /**
   * Get standings for a specific team (with cache check)
   */
  static async getTeamStandings(
    season: number,
    week: number,
    teamName: string
  ): Promise<NFLStandingsData | null> {
    const standings = await this.getStandings(season, week);
    if (!standings) return null;

    // Try exact match first
    let team = standings.find(s => s.team.toLowerCase() === teamName.toLowerCase());

    // If not found, try partial match
    if (!team) {
      team = standings.find(s =>
        s.team.toLowerCase().includes(teamName.toLowerCase()) ||
        teamName.toLowerCase().includes(s.team.toLowerCase())
      );
    }

    if (!team) {
      console.warn(`Team not found in standings: ${teamName}`);
    }

    return team || null;
  }
}
