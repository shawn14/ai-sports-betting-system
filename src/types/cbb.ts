// College Basketball (CBB) Types and Constants

// Power 6 Conferences
export const POWER_6_CONFERENCES = [
  'Atlantic Coast Conference',
  'Big Ten Conference',
  'Big 12 Conference',
  'Southeastern Conference',
  'Big East Conference',
  'Pac-12 Conference',
];

// Mid-Major Conferences (strong basketball programs)
export const MID_MAJOR_CONFERENCES = [
  'Atlantic 10 Conference',
  'American Athletic Conference',
  'Mountain West Conference',
  'West Coast Conference',
  'Missouri Valley Conference',
  'Conference USA',
  'Mid-American Conference',
  'Sun Belt Conference',
  'Horizon League',
  'Colonial Athletic Association',
];

// All NCAA Division I Conferences (32 total)
export const ALL_CONFERENCES = [
  ...POWER_6_CONFERENCES,
  ...MID_MAJOR_CONFERENCES,
  'America East Conference',
  'ASUN Conference',
  'Big Sky Conference',
  'Big South Conference',
  'Big West Conference',
  'Ivy League',
  'MAAC',
  'MEAC',
  'Northeast Conference',
  'Ohio Valley Conference',
  'Patriot League',
  'Southern Conference',
  'Southland Conference',
  'SWAC',
  'Summit League',
  'WAC',
];

// College Basketball Constants
export const CBB_LEAGUE_AVG_PPG = 72; // NCAA average ~72 PPG
export const CBB_GAME_MINUTES = 40; // 2 halves × 20 minutes
export const CBB_HALF_MINUTES = 20;

// Initial Elo ratings by conference tier
export const INITIAL_ELO_BY_TIER = {
  power6: 1250, // Power 6 conferences start higher
  midMajor: 1225, // Strong mid-majors
  lowMajor: 1200, // Other Division I conferences
};

// Helper function to determine conference tier
export function getConferenceTier(conferenceName?: string): 'power6' | 'midMajor' | 'lowMajor' {
  if (!conferenceName) return 'lowMajor';
  if (POWER_6_CONFERENCES.some(c => conferenceName.includes(c) || c.includes(conferenceName))) {
    return 'power6';
  }
  if (MID_MAJOR_CONFERENCES.some(c => conferenceName.includes(c) || c.includes(conferenceName))) {
    return 'midMajor';
  }
  return 'lowMajor';
}

// Helper function to abbreviate conference names for display
export function abbreviateConference(conferenceName?: string): string {
  if (!conferenceName) return 'N/A';

  const abbrevMap: Record<string, string> = {
    'Atlantic Coast Conference': 'ACC',
    'Big Ten Conference': 'Big Ten',
    'Big 12 Conference': 'Big 12',
    'Southeastern Conference': 'SEC',
    'Big East Conference': 'Big East',
    'Pac-12 Conference': 'Pac-12',
    'Atlantic 10 Conference': 'A-10',
    'American Athletic Conference': 'AAC',
    'Mountain West Conference': 'MWC',
    'West Coast Conference': 'WCC',
    'Missouri Valley Conference': 'MVC',
    'Conference USA': 'C-USA',
    'Mid-American Conference': 'MAC',
    'Colonial Athletic Association': 'CAA',
  };

  return abbrevMap[conferenceName] || conferenceName;
}
