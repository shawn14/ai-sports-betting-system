import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GameIntelligence {
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

export async function POST(request: NextRequest) {
  try {
    const { homeTeam, awayTeam, gameDate, location } = await request.json();

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'Missing required fields: homeTeam and awayTeam' },
        { status: 400 }
      );
    }

    console.log(`Gathering intelligence for ${awayTeam} @ ${homeTeam}...`);

    // Use Claude with web search to gather intelligence
    const prompt = `You are an NFL betting intelligence analyst. Research the upcoming game:

**Game:** ${awayTeam} @ ${homeTeam}
**Date:** ${gameDate || 'This week'}
**Location:** ${location || homeTeam + ' stadium'}

Please provide a comprehensive pre-game intelligence report with the following sections:

1. **INJURY REPORT**
   - Key injuries for both teams (starters, impact players)
   - Players listed as Questionable, Doubtful, or Out
   - Impact assessment (High/Medium/Low)

2. **WEATHER CONDITIONS**
   - Expected weather at kickoff
   - Wind speed, temperature, precipitation
   - Impact on game (High/Medium/Low)

3. **NEWS & STORYLINES**
   - Recent team news (coaching changes, trades, suspensions)
   - Head-to-head history
   - Revenge games, divisional rivalries, etc.
   - Key storylines affecting this matchup

4. **OVERALL ASSESSMENT**
   - How should these factors adjust prediction confidence? (-20% to +20%)
   - Final recommendation considering all intelligence

Please format your response as JSON with this structure:
{
  "injuries": {
    "summary": "Brief summary of injury situation",
    "keyInjuries": ["Player 1 - Team - Position - Status", "Player 2..."],
    "impact": "high" | "medium" | "low"
  },
  "weather": {
    "summary": "Weather summary",
    "conditions": "Temp, wind, precip details",
    "impact": "high" | "medium" | "low"
  },
  "news": {
    "summary": "News summary",
    "keyStorylines": ["Storyline 1", "Storyline 2", ...],
    "impact": "high" | "medium" | "low"
  },
  "overall": {
    "confidenceAdjustment": -15,  // Example: reduce confidence by 15% due to key injuries
    "recommendation": "Detailed recommendation text"
  }
}

Use web search to find the most current information. Focus on sources like ESPN, NFL.com, Weather.com, and reputable sports news outlets.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from Claude's response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    console.log('Claude response:', responseText);

    // Try to parse JSON from the response
    let intelligence: GameIntelligence;
    try {
      // Look for JSON in the response (might be wrapped in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        intelligence = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured response from text
        intelligence = {
          injuries: {
            summary: 'Unable to gather injury data',
            keyInjuries: [],
            impact: 'low',
          },
          weather: {
            summary: 'Unable to gather weather data',
            conditions: 'Unknown',
            impact: 'low',
          },
          news: {
            summary: responseText.substring(0, 200),
            keyStorylines: [],
            impact: 'low',
          },
          overall: {
            confidenceAdjustment: 0,
            recommendation: responseText,
          },
        };
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse intelligence data', rawResponse: responseText },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      intelligence,
      timestamp: new Date().toISOString(),
      source: 'claude-web-search',
    });
  } catch (error: any) {
    console.error('Error gathering game intelligence:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
