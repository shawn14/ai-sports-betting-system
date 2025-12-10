import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { MatrixPredictor, LeagueAverages } from '@/lib/models/matrixPredictor';
import { getPreset } from '@/lib/models/matrixPresets';
import type { NFLStandingsData } from '@/lib/scrapers/nflStandingsScraper';

interface TeamRating {
  team: string;
  conference: 'AFC' | 'NFC';
  division: string;
  record: string;
  tsr: number;
  netPoints: number;
  momentum: number;
  conferenceScore: number;
  homeAdvantage: number;
  offensive: number;
  defensive: number;
  rank: number;
  trend: 'up' | 'down' | 'same';
}

interface RankingsCache {
  season: number;
  week: number;
  teams: TeamRating[];
  calculatedAt: string;
  expiresAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const season = parseInt(searchParams.get('season') || '2025');
    const week = parseInt(searchParams.get('week') || '14');

    // Try to get cached rankings first
    const cached = await getCachedRankings(season, week);
    if (cached) {
      console.log(`✅ Returning cached rankings for ${season} week ${week}`);
      return NextResponse.json({ teams: cached, season, week, source: 'cache' });
    }

    // Calculate rankings from file
    console.log(`Calculating rankings for ${season} week ${week}...`);
    const teams = await calculateRankings(season, week);

    // Cache the results
    await cacheRankings(season, week, teams);

    return NextResponse.json({ teams, season, week, source: 'calculated' });
  } catch (error) {
    console.error('Error getting rankings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get rankings' },
      { status: 500 }
    );
  }
}

async function getCachedRankings(season: number, week: number): Promise<TeamRating[] | null> {
  try {
    const cacheId = `${season}-w${week}`;
    const rankingsRef = doc(db, 'team_rankings', cacheId);
    const rankingsDoc = await getDoc(rankingsRef);

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
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

async function cacheRankings(season: number, week: number, teams: TeamRating[]): Promise<void> {
  try {
    const cacheId = `${season}-w${week}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const rankingsData = {
      season,
      week,
      teams,
      calculatedAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt)
    };

    const rankingsRef = doc(db, 'team_rankings', cacheId);
    await setDoc(rankingsRef, rankingsData);

    console.log(`✅ Cached rankings to Firestore: team_rankings/${cacheId}`);
  } catch (error) {
    console.error('Error caching rankings:', error);
    // Don't throw - caching failure shouldn't break the API
  }
}

async function calculateRankings(season: number, week: number): Promise<TeamRating[]> {
  // Load standings from JSON file
  const filePath = path.join(process.cwd(), 'public', 'training', `standings_${season}_w${week}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Standings file not found for ${season} week ${week}`);
  }

  const standingsData: NFLStandingsData[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Loaded ${standingsData.length} teams from file`);

  // Calculate league averages
  const leagueAvg = calculateLeagueAverages(standingsData);

  // Get Matrix config
  const config = getPreset('balanced');

  // Calculate TSR for all teams
  const teamRatings: TeamRating[] = standingsData.map(standings => {
    const components = calculateTSRComponents(standings, false, leagueAvg, config);
    const conference = determineConference(standings.team);
    const division = determineDivision(standings.team);

    return {
      team: standings.team,
      conference,
      division: division || 'Unknown', // Don't use standings.division - it contains win pct!
      record: `${standings.wins}-${standings.losses}${standings.ties > 0 ? `-${standings.ties}` : ''}`,
      tsr: components.tsr,
      netPoints: components.netPoints,
      momentum: components.momentum,
      conferenceScore: components.conference,
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

  // Calculate trends by comparing to previous week
  await calculateTrends(teamRatings, season, week);

  console.log(`✅ Calculated rankings for ${teamRatings.length} teams`);
  return teamRatings;
}

function calculateLeagueAverages(standings: NFLStandingsData[]): LeagueAverages {
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

function calculateTSRComponents(
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

function determineConference(teamName: string): 'AFC' | 'NFC' {
  const afc = [
    'Bills', 'Dolphins', 'Patriots', 'Jets',
    'Ravens', 'Bengals', 'Browns', 'Steelers',
    'Texans', 'Colts', 'Jaguars', 'Titans',
    'Chiefs', 'Broncos', 'Raiders', 'Chargers'
  ];

  const isAFC = afc.some(team => teamName.includes(team));
  return isAFC ? 'AFC' : 'NFC';
}

function determineDivision(teamName: string): string {
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

  return '';
}

async function calculateTrends(currentRankings: TeamRating[], season: number, week: number): Promise<void> {
  // Week 1 has no previous week to compare
  if (week === 1) {
    return;
  }

  try {
    // Try to get previous week's rankings
    const prevWeek = week - 1;
    const previousRankings = await getCachedRankings(season, prevWeek);

    if (!previousRankings) {
      console.log(`No previous week rankings found for trend calculation`);
      return;
    }

    // Create a map of previous rankings by team name
    const prevRankMap = new Map<string, number>();
    previousRankings.forEach(team => {
      prevRankMap.set(team.team, team.rank);
    });

    // Calculate trends
    currentRankings.forEach(team => {
      const prevRank = prevRankMap.get(team.team);

      if (prevRank === undefined) {
        team.trend = 'same';
        return;
      }

      // Lower rank number is better (1 is best)
      if (team.rank < prevRank) {
        team.trend = 'up'; // Improved
      } else if (team.rank > prevRank) {
        team.trend = 'down'; // Declined
      } else {
        team.trend = 'same';
      }
    });

    console.log(`✅ Calculated trends by comparing to week ${prevWeek}`);
  } catch (error) {
    console.error('Error calculating trends:', error);
    // Don't throw - trending is optional
  }
}
