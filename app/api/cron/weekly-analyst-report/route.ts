/**
 * Weekly Analyst Report Generator
 * Called by cron job every Wednesday to generate comprehensive
 * ESPN-style analysis of model performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { NFLAPI } from '@/lib/api/nfl';
import { getDocuments, upsertDocument } from '@/lib/firebase/restClient';
import { aggregateWeeklyMetrics, formatMetricsForPrompt } from '@/lib/models/weeklyAnalytics';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for deep analysis

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  console.log('📊 Generate weekly analyst report cron job triggered');

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get current season/week (will be generating report for completed week)
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();
    const reportWeek = week - 1; // Report on previous week
    console.log(`📅 Generating analyst report for: ${season} Week ${reportWeek}`);

    if (reportWeek < 1) {
      return NextResponse.json({
        success: false,
        error: 'Cannot generate report for week 0 or negative weeks',
        season,
        week: reportWeek
      }, { status: 400 });
    }

    // Fetch results for the completed week
    const results = await getDocuments('results', [
      { field: 'season', operator: '==', value: season },
      { field: 'week', operator: '==', value: reportWeek }
    ]);

    if (results.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No results found for ${season} Week ${reportWeek}`,
        message: 'Results must be generated before analyst report'
      }, { status: 404 });
    }

    console.log(`✅ Found ${results.length} results for Week ${reportWeek}`);

    // Aggregate metrics
    const weeklyMetrics = aggregateWeeklyMetrics(results);
    const metricsJson = formatMetricsForPrompt(weeklyMetrics);

    // Optionally fetch previous week for comparison
    let previousWeekMetrics = null;
    if (reportWeek > 1) {
      const previousResults = await getDocuments('results', [
        { field: 'season', operator: '==', value: season },
        { field: 'week', operator: '==', value: reportWeek - 1 }
      ]);
      if (previousResults.length > 0) {
        previousWeekMetrics = aggregateWeeklyMetrics(previousResults);
      }
    }

    // Build comprehensive prompt for Claude
    const prompt = buildAnalystPrompt(weeklyMetrics, previousWeekMetrics, season, reportWeek);

    // Generate analysis with Claude
    console.log('🤖 Generating AI analyst report...');
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.3, // Slightly creative but focused
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

    console.log('✅ Claude analyst report generated');

    // Parse structured response
    const report = parseAnalystReport(responseText, weeklyMetrics, season, reportWeek);

    // Save to Firestore
    const reportId = `${season}-w${reportWeek}`;
    await upsertDocument('analyst_reports', reportId, report);

    console.log(`✅ Analyst report saved: ${reportId}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      reportId,
      season,
      week: reportWeek,
      summary: {
        totalGames: results.length,
        spreadAccuracy: `${weeklyMetrics.spreadAccuracy.toFixed(1)}%`,
        roi: `${weeklyMetrics.roi.toFixed(1)}%`,
        profit: `$${weeklyMetrics.profit.toFixed(2)}`
      }
    });

  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Build comprehensive analyst prompt for Claude
 */
function buildAnalystPrompt(
  weeklyMetrics: any,
  previousWeekMetrics: any | null,
  season: number,
  week: number
): string {
  const comparisonText = previousWeekMetrics
    ? `\n\n## Previous Week Comparison (Week ${week - 1})
- Spread Accuracy: ${previousWeekMetrics.spreadAccuracy.toFixed(1)}%
- Moneyline Accuracy: ${previousWeekMetrics.moneylineAccuracy.toFixed(1)}%
- ROI: ${previousWeekMetrics.roi.toFixed(1)}%
- Profit: $${previousWeekMetrics.profit.toFixed(2)}

**Week-over-Week Changes:**
- Spread Accuracy: ${(weeklyMetrics.spreadAccuracy - previousWeekMetrics.spreadAccuracy).toFixed(1)}% ${weeklyMetrics.spreadAccuracy > previousWeekMetrics.spreadAccuracy ? '📈' : '📉'}
- ROI: ${(weeklyMetrics.roi - previousWeekMetrics.roi).toFixed(1)}% ${weeklyMetrics.roi > previousWeekMetrics.roi ? '📈' : '📉'}
`
    : '';

  return `You are an expert NFL betting analyst writing a comprehensive weekly performance report for an AI prediction model.

## Assignment
Write an ESPN-style analyst report analyzing the performance of our NFL prediction model for **${season} Season, Week ${week}**.

## Performance Data

### Current Week Metrics
\`\`\`json
${formatMetricsForPrompt(weeklyMetrics)}
\`\`\`
${comparisonText}

## Report Requirements

Your report must include these EXACT sections:

### 1. Executive Summary
Write a 2-3 sentence high-level overview of the week's performance. Be direct and data-driven.

### 2. Model Performance Diagnosis
Analyze:
- Overall accuracy trends (spread, moneyline, O/U)
- How does performance compare to industry benchmarks? (52.4% ATS = breakeven)
- Confidence calibration: Are 80% confident predictions actually 80% accurate?
- ROI and profitability analysis
- Key strengths and weaknesses this week

### 3. Pattern Detection
Identify patterns in the data:
- Which types of games did the model predict best/worst?
- Home vs away performance
- Favorite vs underdog trends
- Team-specific patterns (look at top/bottom performers)
- Any outlier games that skewed results?

### 4. Betting Strategy Recommendations
Provide actionable advice:
- What bet types should bettors focus on based on this week's data?
- Optimal confidence thresholds for placing bets
- Teams/situations to target or avoid
- Risk management suggestions

### 5. Weekly Trends & Momentum
Assess trajectory:
- Is performance improving or declining week-over-week?
- How does this week compare to the previous week?
- Season-to-date outlook
- What to watch for in upcoming weeks

## Formatting Instructions
- Use clear paragraphs with markdown formatting
- Include specific numbers and percentages
- Be honest about weaknesses, not just strengths
- Write in a professional but engaging ESPN analyst tone
- Use bullet points for key insights
- Reference specific games/teams when relevant

## Output Format
Return your analysis as plain text with markdown formatting. Do NOT wrap it in JSON.`;
}

/**
 * Parse Claude's response into structured report
 */
function parseAnalystReport(responseText: string, metrics: any, season: number, week: number): any {
  // Extract executive summary (first paragraph or section)
  const summaryMatch = responseText.match(/(?:Executive Summary|## Executive Summary)([\s\S]*?)(?=##|$)/i);
  const executiveSummary = summaryMatch
    ? summaryMatch[1].trim().replace(/^[:\-\s]+/, '')
    : responseText.split('\n\n')[0];

  // Split into sections
  const sections = [];

  // Model Performance Diagnosis
  const perfMatch = responseText.match(/(?:Model Performance Diagnosis|## Model Performance)([\s\S]*?)(?=##|$)/i);
  if (perfMatch) {
    sections.push({
      title: 'Model Performance Diagnosis',
      content: perfMatch[1].trim(),
      keyMetrics: {
        spreadAccuracy: `${metrics.spreadAccuracy.toFixed(1)}%`,
        moneylineAccuracy: `${metrics.moneylineAccuracy.toFixed(1)}%`,
        overUnderAccuracy: `${metrics.overUnderAccuracy.toFixed(1)}%`,
        roi: `${metrics.roi.toFixed(1)}%`
      }
    });
  }

  // Pattern Detection
  const patternMatch = responseText.match(/(?:Pattern Detection|## Pattern)([\s\S]*?)(?=##|$)/i);
  if (patternMatch) {
    const patternContent = patternMatch[1].trim();
    const insights = patternContent.match(/[-•]\s*(.+)/g)?.map(i => i.replace(/^[-•]\s*/, '').trim()) || [];
    sections.push({
      title: 'Pattern Detection',
      content: patternContent,
      insights
    });
  }

  // Betting Strategy Recommendations
  const strategyMatch = responseText.match(/(?:Betting Strategy|## Betting Strategy Recommendations)([\s\S]*?)(?=##|$)/i);
  if (strategyMatch) {
    sections.push({
      title: 'Betting Strategy Recommendations',
      content: strategyMatch[1].trim()
    });
  }

  // Weekly Trends & Momentum
  const trendsMatch = responseText.match(/(?:Weekly Trends|## Weekly Trends & Momentum)([\s\S]*?)(?=##|$)/i);
  if (trendsMatch) {
    sections.push({
      title: 'Weekly Trends & Momentum',
      content: trendsMatch[1].trim()
    });
  }

  // Build final report
  return {
    reportId: `${season}-w${week}`,
    season,
    week,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    sections,
    dataSnapshot: {
      totalGames: metrics.totalGames,
      dateRange: {
        from: metrics.dateRange.from.toISOString(),
        to: metrics.dateRange.to.toISOString()
      },
      bestPerformingTeams: metrics.bestPredictions.map((p: any) => p.teams),
      worstPerformingTeams: metrics.worstPredictions.map((p: any) => p.teams),
      overallROI: metrics.roi
    },
    fullText: responseText // Store full response for display
  };
}
