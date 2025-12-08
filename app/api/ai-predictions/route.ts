import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Game } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

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
    let standings;
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

    // Prepare the prompt for Claude
    const prompt = `You are an expert sports betting analyst using the Matrix Prediction System to analyze NFL games.

**Current Season:** ${season}, Week ${week}

**NFL Standings Data:**
${JSON.stringify(standings, null, 2)}

**Games to Predict:**
${games.map((g: Game) => `Game ID: ${g.id}\n${g.awayTeam.name} @ ${g.homeTeam.name}`).join('\n\n')}

**Matrix Prediction System Formula:**

The Matrix system calculates a Team Strength Rating (TSR) for each team using these components:

1. **Net Point Performance** (weight: 5.0): (Team's Net PPG - League Avg Net PPG) × weight
2. **Momentum** (weight: 3.0): (Last 5 Win% - Season Win%) × weight
3. **Conference Strength** (weight: 2.0): (Conf Win% - 0.50) × weight
4. **Home Field Advantage** (weight: 2.5, home team only): (Home Win% - Road Win%) × weight
5. **Offensive Strength** (weight: 4.0): (Team PF/G - League Avg PF/G) × weight
6. **Defensive Strength** (weight: 4.0): (League Avg PA/G - Team PA/G) × weight (inverted - lower is better)

**TSR Calculation:**
Home TSR = Net + Momentum + Conf + Home + Offense + Defense
Away TSR = Net + Momentum + Conf + Offense + Defense (no home advantage)

**Predicted Spread:** Home TSR - Away TSR

**Predicted Total:**
- Calculate effective scoring for each team using season averages
- Cross-blend: Home Expected = (Home PF/G + Away PA/G) / 2
- Away Expected = (Away PF/G + Home PA/G) / 2
- Total = Home Expected + Away Expected
- Constrain between 30-70 points

**Predicted Scores:**
- Center = Total / 2
- Home Score = Center + (Spread / 2)
- Away Score = Center - (Spread / 2)
- Round to nearest integer, constrain 3-60

**Confidence:**
- Based on TSR differential
- Larger difference = higher confidence
- Range: 50-95%

**Task:**
For each game listed above, calculate the Matrix prediction following the formula exactly. YOU MUST USE THE EXACT GAME IDs PROVIDED ABOVE. Return a JSON array with this structure:

\`\`\`json
[
  {
    "gameId": "game_id",
    "homeTeam": "Home Team Name",
    "awayTeam": "Away Team Name",
    "predictedSpread": 3.5,
    "predictedTotal": 45.5,
    "predictedScore": {
      "home": 24,
      "away": 21
    },
    "confidence": 67,
    "reasoning": "Brief explanation of key factors (2-3 sentences)",
    "recommendation": "STRONG BET" | "GOOD BET" | "SLIGHT EDGE" | "NO EDGE"
  }
]
\`\`\`

CRITICAL: You MUST return ONLY a valid JSON array. Do NOT include any explanatory text, markdown formatting, or code blocks. Start your response with [ and end with ].

Example format (return exactly this structure):
[{"gameId":"401772790","homeTeam":"Team A","awayTeam":"Team B","predictedSpread":3.5,"predictedTotal":45.5,"predictedScore":{"home":24,"away":21},"confidence":67,"reasoning":"Brief explanation","recommendation":"GOOD BET"}]`;

    console.log('🤖 Calling Claude to generate Matrix predictions...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
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

    // Parse the JSON (Claude might wrap it in markdown code blocks or add text)
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

    const predictions = JSON.parse(jsonText);

    console.log(`✅ Generated ${predictions.length} AI predictions`);

    return NextResponse.json({
      predictions,
      model: 'claude-sonnet-4-5',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error generating AI predictions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI predictions' },
      { status: 500 }
    );
  }
}
