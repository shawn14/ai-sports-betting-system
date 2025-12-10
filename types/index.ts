// NFL Game Data Types
export interface NFLTeam {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  conference: 'AFC' | 'NFC';
  division: string;
}

export interface TeamStats {
  teamId: string;
  season: number;
  week: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  yardsFor: number;
  yardsAgainst: number;
  turnovers: number;
  takeaways: number;
}

export interface Game {
  id: string;
  season: number;
  week: number;
  homeTeam: NFLTeam;
  awayTeam: NFLTeam;
  gameTime: Date;
  venue: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'postponed';
  weather?: WeatherData;
}

export interface WeatherData {
  temperature: number;
  conditions: string;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  humidity: number;
}

// Betting Lines and Odds
export interface BettingLine {
  gameId: string;
  bookmaker: string;
  timestamp: Date;
  spread: {
    home: number;
    away: number;
    homeOdds: number;
    awayOdds: number;
  };
  moneyline: {
    home: number;
    away: number;
  };
  total: {
    over: number;
    under: number;
    line: number;
  };
}

export interface OddsComparison {
  gameId: string;
  game: Game;
  lines: BettingLine[];
  bestSpread: {
    home: BettingLine;
    away: BettingLine;
  };
  bestMoneyline: {
    home: BettingLine;
    away: BettingLine;
  };
  bestTotal: {
    over: BettingLine;
    under: BettingLine;
  };
}

// Predictions and Analysis
export interface GamePrediction {
  gameId: string;
  game: Game;
  predictedWinner: 'home' | 'away';
  confidence: number; // 0-100
  predictedScore: {
    home: number;
    away: number;
  };
  factors: PredictionFactor[];
  edgeAnalysis: {
    spread: number; // difference from betting line
    moneyline: number;
    total: number;
  };
  recommendation: 'strong_bet' | 'value_bet' | 'avoid' | 'wait';
  vegasSpread?: number; // home team spread (saved at prediction time for historical reference)
  vegasTotal?: number; // over/under line (saved at prediction time for historical reference)

  // Model versioning (added Phase 2)
  modelId?: string;      // e.g., "matrix-balanced"
  modelVersion?: string; // e.g., "1.0.0"
  presetName?: string;   // e.g., "balanced" (for Matrix models)
}

export interface PredictionFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

export interface ModelPerformance {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  profitLoss: number;
  roi: number;
  spreadRecord: {
    wins: number;
    losses: number;
    pushes: number;
  };
  moneylineRecord: {
    wins: number;
    losses: number;
  };
  totalRecord: {
    wins: number;
    losses: number;
    pushes: number;
  };
}

// Historical Data
export interface HistoricalGame {
  game: Game;
  finalScore: {
    home: number;
    away: number;
  };
  closingLines: BettingLine[];
  weather: WeatherData;
  injuries: InjuryReport[];
}

export interface InjuryReport {
  teamId: string;
  playerName: string;
  position: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable';
  injury: string;
}

// User Betting Tracker
export interface Bet {
  id: string;
  gameId: string;
  game: Game;
  betType: 'spread' | 'moneyline' | 'total';
  selection: string;
  stake: number;
  odds: number;
  bookmaker: string;
  timestamp: Date;
  status: 'pending' | 'won' | 'lost' | 'push';
  payout?: number;
  notes?: string;
}

export interface BankrollStats {
  totalBets: number;
  wins: number;
  losses: number;
  pushes: number;
  totalStaked: number;
  totalReturns: number;
  profitLoss: number;
  roi: number;
  winRate: number;
  avgOdds: number;
  biggestWin: number;
  biggestLoss: number;
}

// Training Data Types
export interface TrainingDataPoint {
  // Game identifiers
  gameId: string;
  season: number;
  week: number;

  // Home team features (at time of game)
  homeTeam: {
    id: string;
    name: string;
    winPct: number;
    ppg: number;           // Points per game (rolling avg)
    pag: number;           // Points allowed per game
    yardsPerGame: number;
    yardsAllowedPerGame: number;
    turnoverDiff: number;
    homeRecord: number;
    awayRecord: number;
    last3Games: {          // Phase 1: Last 3 games performance
      pointsScored: number[];
      pointsAllowed: number[];
      margins: number[];
    };
    restDays: number;      // Phase 1: Days of rest before this game
    streak: number;        // Current win/loss streak
  };

  // Away team features
  awayTeam: {
    id: string;
    name: string;
    winPct: number;
    ppg: number;
    pag: number;
    yardsPerGame: number;
    yardsAllowedPerGame: number;
    turnoverDiff: number;
    homeRecord: number;
    awayRecord: number;
    last3Games: {          // Phase 1: Last 3 games performance
      pointsScored: number[];
      pointsAllowed: number[];
      margins: number[];
    };
    restDays: number;      // Phase 1: Days of rest before this game
    streak: number;
  };

  // Matchup features
  matchup: {
    isDivisional: boolean;
    isConference: boolean;
    restDaysDiff: number;  // Home rest - away rest
    isThursdayNight: boolean;  // Phase 1: Thursday night game
    isMondayNight: boolean;    // Phase 1: Monday night game
    isSundayNight: boolean;    // Phase 1: Sunday night game
  };

  // Weather features
  weather: {
    temperature: number;
    windSpeed: number;
    precipitation: number;
    isDome: boolean;
  };

  // Betting lines (if available)
  lines?: {
    spread: number;        // Negative = away favored
    total: number;
  };

  // Target variables (actual outcomes)
  outcome: {
    homeScore: number;
    awayScore: number;
    actualSpread: number;  // home - away
    actualTotal: number;   // home + away
    homeWon: boolean;
  };
}

export interface DataCollectionProgress {
  totalGames: number;
  gamesCollected: number;
  currentSeason: number;
  currentWeek: number;
  status: 'idle' | 'collecting' | 'completed' | 'error';
  error?: string;
}

export interface TrainingDataset {
  metadata: {
    collectionDate: Date;
    seasons: number[];
    totalGames: number;
    features: string[];
    version: string;
  };
  data: TrainingDataPoint[];
}

// Game Intelligence Types
export interface GameIntelligence {
  injuries: {
    summary: string;
    keyInjuries: string[];
    impact: 'high' | 'medium' | 'low';
  };
  weather: {
    summary: string;
    conditions: string;
    impact: 'high' | 'medium' | 'low';
  };
  news: {
    summary: string;
    keyStorylines: string[];
    impact: 'high' | 'medium' | 'low';
  };
  overall: {
    confidenceAdjustment: number; // -20 to +20 percentage points
    recommendation: string;
  };
}

export interface GameIntelligenceCache {
  gameId: string;
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  gameTime: string; // ISO string
  intelligence: GameIntelligence;
  minutesBeforeKickoff: number;
  generatedAt: string; // ISO string
  expiresAt: string; // ISO string
}

// Weekly Analyst Report Types
export interface AnalystReportSection {
  title: string;
  content: string;
  keyMetrics?: Record<string, string | number>;
  insights?: string[];
  recommendations?: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    reasoning: string;
  }>;
}

export interface WeeklyAnalystReport {
  reportId: string; // e.g., "2025-w14"
  season: number;
  week: number;
  generatedAt: string; // ISO string
  executiveSummary: string;
  sections: AnalystReportSection[];
  dataSnapshot: {
    totalGames: number;
    dateRange: {
      from: string; // ISO string
      to: string; // ISO string
    };
    bestPerformingTeams: string[];
    worstPerformingTeams: string[];
    overallROI: number;
  };
}
