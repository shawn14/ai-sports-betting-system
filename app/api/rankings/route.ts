import { NextRequest, NextResponse } from 'next/server';
import { StandingsCacheService } from '@/lib/firebase/standingsCache';
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
  conference: number;
  homeAdvantage: number;
  offensive: number;
  defensive: number;
  rank: number;
  trend: 'up' | 'down' | 'same';
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

  // Calculate each component
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const season = parseInt(searchParams.get('season') || '2025');
    const week = parseInt(searchParams.get('week') || '15');

    // Fetch standings from Firebase
    const allStandings = await StandingsCacheService.getStandings(season, week);

    if (!allStandings || allStandings.length === 0) {
      return NextResponse.json(
        { error: `No standings data found for ${season} week ${week}. Please run: npm run scrape-standings ${season} ${week}` },
        { status: 404 }
      );
    }

    // Calculate league averages
    const leagueAvg = calculateLeagueAverages(allStandings);

    // Get Matrix config (using balanced preset)
    const config = getPreset('balanced');

    // Calculate TSR for all teams
    const teamRatings: TeamRating[] = allStandings.map(standings => {
      const components = calculateTSRComponents(standings, false, leagueAvg, config);

      // Determine conference and division from team name
      const conference = determineConference(standings.team);
      const division = determineDivision(standings.team);

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
        rank: 0, // Will be set after sorting
        trend: 'same' as const // Will be calculated if we have historical data
      };
    });

    // Sort by TSR and assign ranks
    teamRatings.sort((a, b) => b.tsr - a.tsr);
    teamRatings.forEach((team, index) => {
      team.rank = index + 1;
    });

    return NextResponse.json({ teams: teamRatings, season, week });
  } catch (error) {
    console.error('Error calculating rankings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate rankings' },
      { status: 500 }
    );
  }
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

  return 'Unknown';
}
