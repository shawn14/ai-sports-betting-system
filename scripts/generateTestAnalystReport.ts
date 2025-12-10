/**
 * Generate test analyst report
 * Uses real results data to create an ESPN-style weekly analysis
 */

import { getDocuments, upsertDocument } from '../lib/firebase/restClient';
import { aggregateWeeklyMetrics, formatMetricsForPrompt } from '../lib/models/weeklyAnalytics';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateTestAnalystReport() {
  console.log('🧪 Generating test analyst report...\n');

  try {
    const season = 2025;
    const week = 14; // Analyzing week 14

    console.log(`📅 Fetching results for ${season} Week ${week}...`);

    // Fetch results for week 14
    const results = await getDocuments('results', [
      { field: 'season', operator: '==', value: season },
      { field: 'week', operator: '==', value: week }
    ]);

    console.log(`✅ Found ${results.length} results for Week ${week}\n`);

    if (results.length === 0) {
      console.log('⚠️  No results found for Week 14. Let me check what weeks have data...\n');

      // Try to find any results
      const allResults = await getDocuments('results', [
        { field: 'season', operator: '==', value: season }
      ]);

      if (allResults.length === 0) {
        console.log('❌ No results found for season 2025 at all.');
        console.log('💡 The analyst report needs completed game results to analyze.');
        console.log('   Try running predictions and results for previous weeks first.\n');
        return;
      }

      // Find which weeks have data
      const weeksWithData = [...new Set(allResults.map(r => r.week))].sort((a, b) => a - b);
      console.log(`📊 Available weeks with data: ${weeksWithData.join(', ')}`);

      // Use the most recent week with data
      const useWeek = Math.max(...weeksWithData);
      const weekResults = allResults.filter(r => r.week === useWeek);

      console.log(`\n✅ Using Week ${useWeek} instead (${weekResults.length} games)\n`);

      return await generateReport(season, useWeek, weekResults);
    }

    return await generateReport(season, week, results);

  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

async function generateReport(season: number, week: number, results: any[]) {
  console.log(`📊 Aggregating metrics for Week ${week}...`);

  // Aggregate metrics
  const weeklyMetrics = aggregateWeeklyMetrics(results);
  const metricsJson = formatMetricsForPrompt(weeklyMetrics);

  console.log(`   Total Games: ${weeklyMetrics.totalGames}`);
  console.log(`   Spread Accuracy: ${weeklyMetrics.spreadAccuracy.toFixed(1)}%`);
  console.log(`   Moneyline Accuracy: ${weeklyMetrics.moneylineAccuracy.toFixed(1)}%`);
  console.log(`   O/U Accuracy: ${weeklyMetrics.overUnderAccuracy.toFixed(1)}%`);
  console.log(`   ROI: ${weeklyMetrics.roi > 0 ? '+' : ''}${weeklyMetrics.roi.toFixed(1)}%`);
  console.log(`   Profit: $${weeklyMetrics.profit.toFixed(2)}\n`);

  // Build Claude prompt
  const prompt = `You are an expert NFL prediction analyst writing a comprehensive weekly performance report for a prediction market analytics platform.

## Performance Data (Week ${week}, ${season} Season)

${metricsJson}

## Analysis Request

Write a comprehensive analytical report with the following sections. Focus on prediction accuracy, model optimization, and market analysis. Avoid gambling terminology - use analytical language about prediction markets instead.

### 1. Executive Summary (2-3 sentences)
Provide a high-level overview of the week's prediction performance and key analytical takeaways.

### 2. Model Performance Diagnosis
- Analyze spread prediction accuracy, winner prediction performance, and total score predictions
- Compare to market benchmarks (52.4% against the spread represents market efficiency)
- Evaluate confidence calibration and prediction reliability
- Return on investment analysis for model predictions

### 3. Pattern Detection
- Which types of games did the model predict most/least accurately?
- Home vs away prediction patterns
- High-confidence vs low-confidence prediction outcomes
- Team-specific prediction patterns and market inefficiencies
- Identify where the model found edges versus market consensus

### 4. Model Optimization Insights
Provide 2-3 specific analytical insights with priority levels for model improvement:
- **HIGH PRIORITY**: Critical model adjustments that could improve prediction accuracy
- **MEDIUM PRIORITY**: Recommended calibration improvements
- **LOW PRIORITY**: Optional refinements for edge cases

Each insight should include the observation and analytical reasoning focused on improving predictive accuracy.

### 5. Weekly Trends & Momentum
- Week-over-week prediction performance comparison
- Consistency trends in model predictions
- Season-to-date trajectory analysis
- Analytical outlook for upcoming prediction opportunities

## Format Guidelines
- Write in professional analytical tone (think prediction markets, not gambling)
- Be specific with numbers, percentages, and statistical measures
- Provide data-driven insights about model performance
- Use clear section headers with ### for subsections
- Include bullet points for key analytical findings
- Focus on prediction accuracy and model optimization, not betting advice

Please provide your response in a structured format with clear sections using ## for main sections and ### for subsections.`;

  console.log(`🤖 Calling Claude AI for deep analysis...\n`);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const responseText = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  console.log(`✅ Received ${responseText.length} characters of analysis\n`);

  // Parse the response into structured sections
  const report = parseAnalystReport(responseText, weeklyMetrics, season, week);

  // Save to Firestore
  const reportId = `${season}-w${week}`;
  await upsertDocument('analyst_reports', reportId, report);

  console.log(`💾 Saved analyst report to Firestore: analyst_reports/${reportId}\n`);

  // Display summary
  console.log('📊 Report Summary:');
  console.log('=' .repeat(60));
  console.log(`\n${report.executiveSummary}\n`);
  console.log('=' .repeat(60));
  console.log(`\n✅ Report generated successfully!`);
  console.log(`🎉 Visit http://localhost:3000/analyst to view the full report!\n`);
}

function parseAnalystReport(responseText: string, weeklyMetrics: any, season: number, week: number): any {
  // Extract executive summary - must come BEFORE Model Performance
  const summaryMatch = responseText.match(/##\s*Executive Summary\s*\n+([\s\S]*?)(?=\n##\s)/i);
  const executiveSummary = summaryMatch
    ? summaryMatch[1].trim()
    : 'Analysis of model performance for Week ' + week;

  // Extract sections
  const sections = [];

  // Performance Diagnosis
  const perfMatch = responseText.match(/##\s*Model Performance Diagnosis\s*\n+([\s\S]*?)(?=\n##\s|$)/i);
  if (perfMatch) {
    sections.push({
      title: 'Model Performance Diagnosis',
      content: perfMatch[1].trim(),
      keyMetrics: {
        'Spread Accuracy': `${weeklyMetrics.spreadAccuracy.toFixed(1)}%`,
        'Moneyline Accuracy': `${weeklyMetrics.moneylineAccuracy.toFixed(1)}%`,
        'Over/Under Accuracy': `${weeklyMetrics.overUnderAccuracy.toFixed(1)}%`,
        'ROI': `${weeklyMetrics.roi > 0 ? '+' : ''}${weeklyMetrics.roi.toFixed(1)}%`
      }
    });
  }

  // Pattern Detection
  const patternMatch = responseText.match(/##\s*Pattern Detection\s*\n+([\s\S]*?)(?=\n##\s|$)/i);
  if (patternMatch) {
    const patternText = patternMatch[1].trim();
    const insights = extractBulletPoints(patternText);
    sections.push({
      title: 'Pattern Detection',
      content: patternText,
      insights: insights.length > 0 ? insights : undefined
    });
  }

  // Model Optimization Insights
  const strategyMatch = responseText.match(/##\s*(Model Optimization Insights|Betting Strategy Recommendations)\s*\n+([\s\S]*?)(?=\n##\s|$)/i);
  if (strategyMatch) {
    const strategyText = strategyMatch[2].trim();
    const recommendations = extractRecommendations(strategyText);
    sections.push({
      title: 'Model Optimization Insights',
      content: strategyText,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    });
  }

  // Trends & Momentum
  const trendsMatch = responseText.match(/##\s*Weekly Trends & Momentum\s*\n+([\s\S]*?)(?=\n##\s|$)/i);
  if (trendsMatch) {
    sections.push({
      title: 'Weekly Trends & Momentum',
      content: trendsMatch[1].trim()
    });
  }

  return {
    reportId: `${season}-w${week}`,
    season,
    week,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    sections,
    dataSnapshot: {
      totalGames: weeklyMetrics.totalGames,
      dateRange: {
        from: weeklyMetrics.dateRange.from.toISOString(),
        to: weeklyMetrics.dateRange.to.toISOString()
      },
      bestPerformingTeams: weeklyMetrics.bestPerformingTeams || [],
      worstPerformingTeams: weeklyMetrics.worstPerformingTeams || [],
      overallROI: weeklyMetrics.roi
    }
  };
}

function extractBulletPoints(text: string): string[] {
  const bullets = text.match(/[-•*]\s+(.+)/g);
  return bullets ? bullets.map(b => b.replace(/^[-•*]\s+/, '').trim()) : [];
}

function extractRecommendations(text: string): Array<{priority: string; action: string; reasoning: string}> {
  const recommendations = [];

  const highMatch = text.match(/\*\*HIGH PRIORITY[:\]]*\*\*[:\s]*(.+?)(?=\*\*MEDIUM|$)/is);
  if (highMatch) {
    const parts = highMatch[1].split(/reasoning:|because:/i);
    recommendations.push({
      priority: 'HIGH',
      action: parts[0].trim(),
      reasoning: parts[1]?.trim() || 'Critical for next week performance'
    });
  }

  const medMatch = text.match(/\*\*MEDIUM PRIORITY[:\]]*\*\*[:\s]*(.+?)(?=\*\*LOW|$)/is);
  if (medMatch) {
    const parts = medMatch[1].split(/reasoning:|because:/i);
    recommendations.push({
      priority: 'MEDIUM',
      action: parts[0].trim(),
      reasoning: parts[1]?.trim() || 'Recommended adjustment'
    });
  }

  const lowMatch = text.match(/\*\*LOW PRIORITY[:\]]*\*\*[:\s]*(.+?)(?=##|$)/is);
  if (lowMatch) {
    const parts = lowMatch[1].split(/reasoning:|because:/i);
    recommendations.push({
      priority: 'LOW',
      action: parts[0].trim(),
      reasoning: parts[1]?.trim() || 'Optional optimization'
    });
  }

  return recommendations;
}

generateTestAnalystReport();
