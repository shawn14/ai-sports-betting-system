import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { question, conversationHistory = [], season = 2025, week } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: 'Missing required field: question' },
        { status: 400 }
      );
    }

    console.log(`Chat intelligence query: "${question}" (Season ${season}, Week ${week || 'current'})`);

    // Determine current week if not provided
    const currentWeek = week || 15; // Default to Week 15 for 2025 season

    // Step 1: Fetch all intelligence data in parallel
    const [rankingsData, intelligenceData, analystData, predictionsData] = await Promise.all([
      // Rankings from API
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rankings?season=${season}&week=${currentWeek}`)
        .then(r => r.json())
        .catch(() => ({ teams: [] })),

      // Game intelligence from Firestore
      getDocs(query(
        collection(db, 'game_intelligence_cache'),
        where('season', '==', season),
        where('week', '==', currentWeek)
      )).then(snapshot => snapshot.docs.map(doc => doc.data())).catch(() => []),

      // Analyst reports from Firestore (get latest by fetching all and sorting in-memory to avoid index requirement)
      getDocs(query(
        collection(db, 'analyst_reports'),
        where('season', '==', season),
        where('week', '==', currentWeek)
      )).then(snapshot => {
        const reports = snapshot.docs.map(doc => doc.data());
        // Sort in-memory and get most recent
        return reports.sort((a: any, b: any) => {
          const dateA = new Date(a.generatedAt || 0).getTime();
          const dateB = new Date(b.generatedAt || 0).getTime();
          return dateB - dateA;
        })[0] || null;
      }).catch(() => null),

      // Predictions from Firestore
      getDocs(query(
        collection(db, 'predictions'),
        where('season', '==', season),
        where('week', '==', currentWeek)
      )).then(snapshot => snapshot.docs.map(doc => doc.data())).catch(() => [])
    ]);

    // Step 2: Build comprehensive context for Claude
    const context = {
      season,
      week: currentWeek,
      rankings: rankingsData.teams?.slice(0, 32) || [], // Top 32 teams
      intelligenceSummary: intelligenceData.length > 0 ? {
        totalGames: intelligenceData.length,
        highImpactInjuries: intelligenceData.filter((g: any) => g.intelligence?.injuries?.impact === 'high').length,
        weatherImpact: intelligenceData.filter((g: any) => g.intelligence?.weather?.impact === 'high').length,
        games: intelligenceData.map((g: any) => ({
          matchup: `${g.awayTeam} @ ${g.homeTeam}`,
          injuries: g.intelligence?.injuries?.summary,
          weather: g.intelligence?.weather?.summary,
          news: g.intelligence?.news?.summary
        }))
      } : null,
      analystReport: analystData ? {
        summary: analystData.executiveSummary,
        sections: analystData.sections?.map((s: any) => ({
          title: s.title,
          insights: s.insights
        }))
      } : null,
      predictionsSummary: predictionsData.length > 0 ? {
        totalPredictions: predictionsData.length,
        avgConfidence: (predictionsData.reduce((sum: number, p: any) => sum + (p.confidence || 0), 0) / predictionsData.length).toFixed(1)
      } : null
    };

    // Step 3: Prepare conversation messages for Claude
    const messages: ChatMessage[] = [
      ...conversationHistory.slice(-5), // Keep last 5 messages for context
      {
        role: 'user',
        content: `${question}\n\nAvailable Context (Week ${currentWeek}, ${season} Season):\n${JSON.stringify(context, null, 2)}`
      }
    ];

    // Step 4: Call Claude with context
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800, // Brief responses (1-2 paragraphs)
      temperature: 0.3,
      system: `You are an expert NFL analytics assistant for PredictionMatrix. Answer user questions using the provided data sources.

Available data sources:
- Team rankings (TSR, momentum, offense/defense ratings)
- Game intelligence (injuries, weather, news impact)
- Weekly analyst reports (patterns, trends, performance analysis)
- Game predictions with confidence levels

Instructions:
- Provide brief, specific answers (1-2 paragraphs maximum)
- Include relevant statistics and data points
- Cite sources when referencing specific data (e.g., "According to Week 15 rankings...")
- Use prediction market language (not gambling terms)
- If asked about historical data, acknowledge the week/season in your response
- Be conversational and helpful
- If the context doesn't contain enough information, acknowledge limitations

Response format:
- Start with a direct answer
- Support with 2-3 key data points
- Keep it concise and scannable`,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    });

    // Extract text response
    const answerText = response.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('\n');

    // Generate suggested follow-up questions based on the topic
    const suggestedFollowUps = generateFollowUpQuestions(question, context);

    return NextResponse.json({
      success: true,
      answer: answerText,
      sources: extractSources(context),
      suggestedFollowUps,
      timestamp: new Date().toISOString(),
      week: currentWeek,
      season
    });

  } catch (error: any) {
    console.error('Error in chat intelligence:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper: Extract which data sources were used
function extractSources(context: any): string[] {
  const sources: string[] = [];

  if (context.rankings?.length > 0) sources.push('Team Rankings');
  if (context.intelligenceSummary) sources.push('Game Intelligence');
  if (context.analystReport) sources.push('Weekly Analyst Report');
  if (context.predictionsSummary) sources.push('Predictions');

  return sources;
}

// Helper: Generate contextual follow-up questions
function generateFollowUpQuestions(question: string, context: any): string[] {
  const q = question.toLowerCase();
  const followUps: string[] = [];

  // Momentum-related follow-ups
  if (q.includes('momentum') || q.includes('hot') || q.includes('trending')) {
    followUps.push('Which teams have injury concerns?');
    followUps.push('What does the analyst report say about trends?');
  }

  // Injury-related follow-ups
  else if (q.includes('injury') || q.includes('injured') || q.includes('hurt')) {
    followUps.push('How does this impact predictions?');
    followUps.push('Which teams are healthiest?');
  }

  // Rankings-related follow-ups
  else if (q.includes('rank') || q.includes('best') || q.includes('top')) {
    followUps.push('What about defensive rankings?');
    followUps.push('Which teams have momentum?');
  }

  // Prediction-related follow-ups
  else if (q.includes('predict') || q.includes('forecast') || q.includes('expect')) {
    followUps.push('What are the biggest uncertainties?');
    followUps.push('How accurate were last week\'s predictions?');
  }

  // Weather-related follow-ups
  else if (q.includes('weather') || q.includes('wind') || q.includes('rain')) {
    followUps.push('Which games have injury concerns too?');
    followUps.push('How does weather affect predictions?');
  }

  // Generic follow-ups
  else {
    followUps.push('What teams have momentum this week?');
    followUps.push('Any significant injury concerns?');
  }

  return followUps.slice(0, 2); // Return max 2 suggestions
}
