/**
 * Generate test intelligence reports for Week 15 games
 * This bypasses the 60-90 minute window check and generates reports immediately
 */

import { NFLAPI } from '../lib/api/nfl';
import { upsertDocument } from '../lib/firebase/restClient';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateTestIntelligence() {
  console.log('🧪 Generating test intelligence reports for Week 15...\n');

  try {
    // Get Week 15 games
    const season = 2025;
    const week = 15;

    console.log(`📅 Fetching games for ${season} Week ${week}...`);
    const games = await NFLAPI.getWeekGames(season, week);
    console.log(`✅ Found ${games.length} games\n`);

    let successCount = 0;
    let errorCount = 0;

    // Process ALL games in the week
    for (const game of games) {
      console.log(`\n🏈 Processing: ${game.awayTeam.name} @ ${game.homeTeam.name}`);
      console.log(`   Game ID: ${game.id}`);
      console.log(`   Time: ${new Date(game.gameTime).toLocaleString()}`);

      try {
        // Build prompt for Claude
        const prompt = `You are an NFL prediction market analyst. Generate a pre-game intelligence report for this matchup:

**Game:** ${game.awayTeam.name} @ ${game.homeTeam.name}
**Date:** ${new Date(game.gameTime).toLocaleDateString()}
**Venue:** ${game.venue || 'TBD'}

Please provide analytical insights for prediction market participants:

1. **Injury Report**
   - Summary of key injuries affecting both teams
   - List specific players who are OUT, QUESTIONABLE, or DOUBTFUL
   - Rate the overall prediction impact: HIGH, MEDIUM, or LOW

2. **Weather Conditions**
   - Expected weather at game time (temperature, wind, precipitation)
   - How weather might affect game outcomes
   - Rate the prediction impact: HIGH, MEDIUM, or LOW

3. **News & Storylines**
   - Key storylines heading into this game
   - Recent team performance/momentum
   - Rate the prediction impact: HIGH, MEDIUM, or LOW

4. **Overall Assessment**
   - Model confidence adjustment (-20 to +20) based on all factors
   - Brief analytical summary for prediction markets

Format your response as JSON:
{
  "injuries": {
    "summary": "...",
    "keyInjuries": ["player1 (team) - status", "player2 (team) - status"],
    "impact": "high|medium|low"
  },
  "weather": {
    "summary": "...",
    "conditions": "temp, wind, precipitation details",
    "impact": "high|medium|low"
  },
  "news": {
    "summary": "...",
    "keyStorylines": ["storyline1", "storyline2"],
    "impact": "high|medium|low"
  },
  "overall": {
    "confidenceAdjustment": -10,
    "recommendation": "..."
  }
}`;

        console.log(`   🤖 Calling Claude AI...`);

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        const responseText = message.content[0].type === 'text'
          ? message.content[0].text
          : '';

        console.log(`   ✅ Received response from Claude`);

        // Parse JSON response
        let intelligence;
        try {
          // Extract JSON from markdown code blocks if present
          const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                           responseText.match(/```\n([\s\S]*?)\n```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
          intelligence = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('   ❌ Failed to parse JSON, using text response');
          // Fallback - create basic structure from text
          intelligence = {
            injuries: { summary: responseText.substring(0, 200), keyInjuries: [], impact: 'medium' },
            weather: { summary: 'Weather data unavailable', conditions: 'Unknown', impact: 'low' },
            news: { summary: 'Analysis generated', keyStorylines: [], impact: 'medium' },
            overall: { confidenceAdjustment: 0, recommendation: 'Standard analysis' }
          };
        }

        // Calculate minutes before kickoff
        const now = new Date();
        const gameTime = new Date(game.gameTime);
        const minutesBeforeKickoff = Math.round((gameTime.getTime() - now.getTime()) / (1000 * 60));

        // Save to Firestore
        const intelligenceData = {
          gameId: game.id,
          season,
          week,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name,
          gameTime: game.gameTime,
          intelligence,
          minutesBeforeKickoff: Math.max(0, minutesBeforeKickoff),
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(gameTime.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };

        await upsertDocument('game_intelligence_cache', game.id, intelligenceData);

        console.log(`   💾 Saved to Firestore: game_intelligence_cache/${game.id}`);
        console.log(`   📊 Injury Impact: ${intelligence.injuries.impact.toUpperCase()}`);
        console.log(`   🌤️  Weather Impact: ${intelligence.weather.impact.toUpperCase()}`);
        console.log(`   📰 News Impact: ${intelligence.news.impact.toUpperCase()}`);
        console.log(`   🎯 Confidence Adjustment: ${intelligence.overall.confidenceAdjustment > 0 ? '+' : ''}${intelligence.overall.confidenceAdjustment}%`);

        successCount++;

      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount} reports generated`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n🎉 Visit http://localhost:3000/intelligence to see the reports!`);

  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

generateTestIntelligence();
