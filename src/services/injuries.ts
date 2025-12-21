// ESPN Injuries API integration

const ESPN_INJURIES_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries';

// Key positions that significantly impact game outcomes
const KEY_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'LT', 'RT', 'CB', 'EDGE', 'DE', 'DT'];
const STAR_POSITIONS = ['QB', 'RB', 'WR']; // Positions that get highlighted

// Team abbreviation mapping (ESPN uses full names, we use abbreviations)
const TEAM_ABBREV_MAP: Record<string, string> = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WAS',
};

export interface PlayerInjury {
  name: string;
  position: string;
  status: string; // Out, Doubtful, Questionable, Probable
  injury: string; // Description like "Knee", "Ankle"
  isKeyPlayer: boolean;
  isStarPosition: boolean;
}

export interface TeamInjuries {
  teamAbbrev: string;
  teamName: string;
  injuries: PlayerInjury[];
  keyPlayersOut: number;
  starPlayersOut: number; // QB/RB/WR with Out status
}

export interface InjuryReport {
  teams: Record<string, TeamInjuries>;
  fetchedAt: string;
}

export async function fetchInjuries(): Promise<InjuryReport | null> {
  try {
    const response = await fetch(ESPN_INJURIES_API);
    if (!response.ok) {
      console.error('ESPN Injuries API error:', response.status);
      return null;
    }

    const data = await response.json();
    const teams: Record<string, TeamInjuries> = {};

    for (const teamData of data.injuries || []) {
      const teamName = teamData.displayName;
      const teamAbbrev = TEAM_ABBREV_MAP[teamName] || teamName;

      const injuries: PlayerInjury[] = [];
      let keyPlayersOut = 0;
      let starPlayersOut = 0;

      for (const injury of teamData.injuries || []) {
        const athlete = injury.athlete;
        const position = athlete?.position?.name || athlete?.position?.abbreviation || 'Unknown';
        const positionAbbrev = athlete?.position?.abbreviation || position;
        const status = injury.status || 'Unknown';

        const isKeyPlayer = KEY_POSITIONS.some(p =>
          positionAbbrev.toUpperCase().includes(p) || position.toUpperCase().includes(p)
        );
        const isStarPosition = STAR_POSITIONS.some(p =>
          positionAbbrev.toUpperCase().includes(p) || position.toUpperCase().includes(p)
        );

        const playerInjury: PlayerInjury = {
          name: athlete?.displayName || 'Unknown',
          position: positionAbbrev,
          status,
          injury: injury.shortComment || injury.longComment?.split('.')[0] || 'Injury',
          isKeyPlayer,
          isStarPosition,
        };

        injuries.push(playerInjury);

        // Count players definitively out
        if (status === 'Out' || status === 'Injured Reserve') {
          if (isKeyPlayer) keyPlayersOut++;
          if (isStarPosition) starPlayersOut++;
        }
      }

      teams[teamAbbrev] = {
        teamAbbrev,
        teamName,
        injuries,
        keyPlayersOut,
        starPlayersOut,
      };
    }

    return {
      teams,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching injuries:', error);
    return null;
  }
}

// Get summary of key injuries for a specific team
export function getTeamInjurySummary(injuries: InjuryReport | null, teamAbbrev: string): {
  hasQBOut: boolean;
  keyPlayersOut: PlayerInjury[];
  questionablePlayers: PlayerInjury[];
} {
  const empty = { hasQBOut: false, keyPlayersOut: [], questionablePlayers: [] };
  if (!injuries) return empty;

  const teamInjuries = injuries.teams[teamAbbrev];
  if (!teamInjuries) return empty;

  const hasQBOut = teamInjuries.injuries.some(
    i => i.position === 'QB' && (i.status === 'Out' || i.status === 'Injured Reserve')
  );

  const keyPlayersOut = teamInjuries.injuries.filter(
    i => i.isKeyPlayer && (i.status === 'Out' || i.status === 'Injured Reserve')
  );

  const questionablePlayers = teamInjuries.injuries.filter(
    i => i.isKeyPlayer && (i.status === 'Questionable' || i.status === 'Doubtful')
  );

  return { hasQBOut, keyPlayersOut, questionablePlayers };
}

// Get game-level injury impact summary
export function getGameInjuryImpact(
  injuries: InjuryReport | null,
  homeTeam: string,
  awayTeam: string
): {
  homeInjuries: { hasQBOut: boolean; keyOut: number; summary: string };
  awayInjuries: { hasQBOut: boolean; keyOut: number; summary: string };
  impactLevel: 'none' | 'minor' | 'significant' | 'major';
} {
  const homeSummary = getTeamInjurySummary(injuries, homeTeam);
  const awaySummary = getTeamInjurySummary(injuries, awayTeam);

  const homeKeyOut = homeSummary.keyPlayersOut.length;
  const awayKeyOut = awaySummary.keyPlayersOut.length;

  // Create summary strings
  const formatSummary = (summary: typeof homeSummary): string => {
    const parts: string[] = [];
    if (summary.hasQBOut) parts.push('QB Out');
    else if (summary.keyPlayersOut.length > 0) {
      const positions = [...new Set(summary.keyPlayersOut.map(p => p.position))];
      parts.push(`${positions.join(', ')} Out`);
    }
    if (summary.questionablePlayers.length > 0) {
      parts.push(`${summary.questionablePlayers.length} GTD`);
    }
    return parts.join(' | ') || 'Healthy';
  };

  // Determine overall impact level
  let impactLevel: 'none' | 'minor' | 'significant' | 'major' = 'none';
  if (homeSummary.hasQBOut || awaySummary.hasQBOut) {
    impactLevel = 'major';
  } else if (homeKeyOut >= 3 || awayKeyOut >= 3) {
    impactLevel = 'significant';
  } else if (homeKeyOut >= 1 || awayKeyOut >= 1) {
    impactLevel = 'minor';
  }

  return {
    homeInjuries: {
      hasQBOut: homeSummary.hasQBOut,
      keyOut: homeKeyOut,
      summary: formatSummary(homeSummary),
    },
    awayInjuries: {
      hasQBOut: awaySummary.hasQBOut,
      keyOut: awayKeyOut,
      summary: formatSummary(awaySummary),
    },
    impactLevel,
  };
}
