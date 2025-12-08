import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Game } from '@/types';
import { MatrixPredictor, MatrixConfig, LeagueAverages } from '@/lib/models/matrixPredictor';
import { NFLStandingsData } from '@/lib/scrapers/nflStandingsScraper';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DEFAULT_CONFIG: MatrixConfig = {
  w_net: 5.0,
  w_momentum: 3.0,
  w_conf: 2.0,
  w_home: 2.5,
  w_off: 4.0,
  w_def: 4.0,
  w_recency_total: 0.3,
  total_boost: 0,
  volatility: 1.0
};

interface MatrixPrediction {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  predictedSpread: number;
  predictedTotal: number;
  predictedScore: {
    home: number;
    away: number;
  };
  homeTSR: number;
  awayTSR: number;
  confidence: number;
}

interface HybridPrediction extends MatrixPrediction {
  aiConfidence: number;
  aiReasoning: string;
  recommendation: string;
  latestNews: string;
  injuryImpact: string;
  weatherImpact: string;
}

export async function POST(request: Request) {
  try {
    const { games, season, week } = await request.json();

    if (!games || !Array.isArray(games)) {
      return NextResponse.json(
        { error: 'Games array is required' },
        { status: 400 }
      );
    }

    // Load standings from local JSON file
    let standings: NFLStandingsData[];
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const jsonPath = path.join(process.cwd(), 'public', 'training', `standings_${season}_w${week}.json`);
      const jsonData = await fs.readFile(jsonPath, 'utf-8');
      standings = JSON.parse(jsonData);
      console.log(`✅ Loaded standings from local JSON: ${jsonPath}`);
    } catch (err) {
      return NextResponse.json(
        { error: `No standings data found for ${season} Week ${week}. Please run: npm run scrape-standings ${season} ${week}` },
        { status: 404 }
      );
    }

    if (!standings || standings.length === 0) {
      return NextResponse.json(
        { error: `No standings data found for ${season} Week ${week}` },
        { status: 404 }
      );
    }

    // Calculate league averages
    const leagueAvg = calculateLeagueAverages(standings);

    // Step 1: Generate Matrix predictions (pure math)
    const matrixPredictions: MatrixPrediction[] = [];

    for (const game of games) {
      const homeStandings = findTeamStandings(standings, game.homeTeam.name);
      const awayStandings = findTeamStandings(standings, game.awayTeam.name);

      if (!homeStandings || !awayStandings) {
        console.warn(`Missing standings for ${game.awayTeam.name} @ ${game.homeTeam.name}`);
        continue;
      }

      // Calculate TSRs
      const homeTSR = calculateTSR(homeStandings, true, leagueAvg, DEFAULT_CONFIG);
      const awayTSR = calculateTSR(awayStandings, false, leagueAvg, DEFAULT_CONFIG);

      const predictedSpread = homeTSR - awayTSR;
      const predictedTotal = calculateTotal(homeStandings, awayStandings, DEFAULT_CONFIG);
      const scores = calculateExactScores(predictedTotal, predictedSpread, DEFAULT_CONFIG.volatility);
      const confidence = calculateConfidence(homeTSR, awayTSR);

      matrixPredictions.push({
        gameId: game.id,
        homeTeam: game.homeTeam.name,
        awayTeam: game.awayTeam.name,
        predictedSpread,
        predictedTotal,
        predictedScore: scores,
        homeTSR,
        awayTSR,
        confidence
      });
    }

    console.log(`✅ Generated ${matrixPredictions.length} Matrix predictions`);

    // Step 2: Use AI to enhance predictions with web search and context
    const prompt = `You are an NFL betting analyst. I have mathematical predictions from the Matrix system, and I need you to enhance them with latest news, injuries, weather, and your analysis.

**Matrix Predictions (Pure Math):**
${JSON.stringify(matrixPredictions, null, 2)}

**Your Task:**
For each game, use your web search capability to find:
1. Latest injury reports for both teams
2. Weather forecast for the game location
3. Recent team news and storylines
4. Head-to-head history and trends

Then provide an ENHANCED prediction that considers:
- The Matrix mathematical prediction (treat as baseline)
- Injury impact (adjust confidence/spread if key players out)
- Weather impact (wind, rain, snow affects totals)
- Momentum and context the math might miss

Return a JSON array with this EXACT structure:

[
  {
    "gameId": "game_id_from_matrix",
    "homeTeam": "Team Name",
    "awayTeam": "Team Name",
    "predictedSpread": <matrix_spread adjusted if needed>,
    "predictedTotal": <matrix_total adjusted if needed>,
    "predictedScore": {
      "home": <adjusted_score>,
      "away": <adjusted_score>
    },
    "confidence": <matrix_confidence>,
    "aiConfidence": <your adjusted confidence 40-95>,
    "aiReasoning": "Brief 2-3 sentence analysis mentioning key injuries, weather, or context",
    "recommendation": "STRONG BET" | "GOOD BET" | "SLIGHT EDGE" | "NO EDGE" | "AVOID",
    "latestNews": "Key news summary",
    "injuryImpact": "HIGH" | "MEDIUM" | "LOW" | "NONE",
    "weatherImpact": "HIGH" | "MEDIUM" | "LOW" | "NONE"
  }
]

CRITICAL RULES:
1. You MUST return ONLY valid JSON (no markdown, no explanatory text)
2. Start with [ and end with ]
3. Use the EXACT gameIds from the Matrix predictions
4. Only adjust spreads/totals if you have strong reason (injuries, weather)
5. If Matrix says 75% confidence but key QB is injured, lower to 50-60%
6. Weather matters more for totals (wind = lower, dome = ignore)`;

    console.log('🤖 Calling Claude with web search to enhance predictions...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract JSON from Claude's response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let jsonText = content.text.trim();

    // Remove markdown code blocks
    if (jsonText.includes('```json')) {
      const match = jsonText.match(/```json\n([\s\S]*?)\n```/);
      if (match) jsonText = match[1].trim();
    } else if (jsonText.includes('```')) {
      const match = jsonText.match(/```\n?([\s\S]*?)\n?```/);
      if (match) jsonText = match[1].trim();
    }

    // Find JSON array if there's extra text
    if (!jsonText.startsWith('[')) {
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }
    }

    const hybridPredictions: HybridPrediction[] = JSON.parse(jsonText);

    console.log(`✅ Generated ${hybridPredictions.length} hybrid predictions (Matrix + AI)`);

    return NextResponse.json({
      predictions: hybridPredictions,
      model: 'hybrid-matrix-ai',
      matrixEngine: 'typescript-calculations',
      aiEngine: 'claude-sonnet-4-5-with-websearch',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating hybrid predictions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate hybrid predictions' },
      { status: 500 }
    );
  }
}

// Helper functions (copied from MatrixPredictor for server-side use)

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

  const avgPFpg = totalGames > 0 ? totalPF / totalGames : 21.5;
  const avgPApg = totalGames > 0 ? totalPA / totalGames : 21.5;

  return {
    avgPFpg,
    avgPApg,
    avgNetPG: avgPFpg - avgPApg
  };
}

function findTeamStandings(standings: NFLStandingsData[], teamName: string): NFLStandingsData | null {
  let team = standings.find(s => s.team.toLowerCase() === teamName.toLowerCase());
  if (!team) {
    team = standings.find(s =>
      s.team.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(s.team.toLowerCase())
    );
  }
  return team || null;
}

function calculateTSR(
  standings: NFLStandingsData,
  isHome: boolean,
  leagueAvg: LeagueAverages,
  config: MatrixConfig
): number {
  const gp = standings.wins + standings.losses + standings.ties;
  if (gp === 0) return 0;

  const pfpg = standings.pointsFor / gp;
  const papg = standings.pointsAgainst / gp;
  const netPG = pfpg - papg;
  const winPct = standings.wins / gp;

  const netComponent = config.w_net * (netPG - leagueAvg.avgNetPG);

  const last5GP = standings.last5Wins + standings.last5Losses;
  const last5Pct = last5GP > 0 ? standings.last5Wins / last5GP : winPct;
  const momentumComponent = config.w_momentum * (last5Pct - winPct);

  const confGP = standings.confWins + standings.confLosses;
  const confPct = confGP > 0 ? standings.confWins / confGP : 0.50;
  const confComponent = config.w_conf * (confPct - 0.50);

  let homeComponent = 0;
  if (isHome) {
    const homeGP = standings.homeWins + standings.homeLosses;
    const roadGP = standings.roadWins + standings.roadLosses;

    if (homeGP > 0 && roadGP > 0) {
      const homePct = standings.homeWins / homeGP;
      const roadPct = standings.roadWins / roadGP;
      homeComponent = config.w_home * (homePct - roadPct);
    }
  }

  const offComponent = config.w_off * (pfpg - leagueAvg.avgPFpg);
  const defComponent = config.w_def * (leagueAvg.avgPApg - papg);

  return netComponent + momentumComponent + confComponent + homeComponent + offComponent + defComponent;
}

function calculateTotal(
  homeStandings: NFLStandingsData,
  awayStandings: NFLStandingsData,
  config: MatrixConfig
): number {
  const homeGP = homeStandings.wins + homeStandings.losses + homeStandings.ties;
  const awayGP = awayStandings.wins + awayStandings.losses + awayStandings.ties;

  if (homeGP === 0 || awayGP === 0) return 43.0;

  const home_PF = homeStandings.pointsFor / homeGP;
  const home_PA = homeStandings.pointsAgainst / homeGP;
  const away_PF = awayStandings.pointsFor / awayGP;
  const away_PA = awayStandings.pointsAgainst / awayGP;

  const homeView = (home_PF + away_PA) / 2;
  const awayView = (away_PF + home_PA) / 2;

  const total = homeView + awayView + config.total_boost;
  return Math.max(30, Math.min(70, total));
}

function calculateExactScores(
  total: number,
  margin: number,
  volatility: number
): { home: number; away: number } {
  const center = total / 2;
  let homeScore = center + (margin / 2);
  let awayScore = center - (margin / 2);

  const adjustment = (margin / 2) * (volatility - 1);
  homeScore += adjustment;
  awayScore -= adjustment;

  return {
    home: Math.round(Math.max(3, Math.min(60, homeScore))),
    away: Math.round(Math.max(3, Math.min(60, awayScore)))
  };
}

function calculateConfidence(homeTSR: number, awayTSR: number): number {
  const tsrDiff = Math.abs(homeTSR - awayTSR);
  const confidence = 50 + (tsrDiff * 4.5);
  return Math.round(Math.max(40, Math.min(95, confidence)));
}
