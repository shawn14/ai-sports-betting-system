/**
 * Weekly Data Refresh Cron Job
 * Runs every Monday at 6am to update standings and odds
 */

import { NextRequest, NextResponse } from 'next/server';
import { upsertDocument } from '@/lib/firebase/restClient';
import { NFLAPI } from '@/lib/api/nfl';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  console.log('🔄 Weekly refresh cron job triggered');

  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { season, week } = await NFLAPI.getCurrentSeasonWeek();
    console.log(`📅 Current: ${season} Week ${week}`);

    const results = {
      season,
      week,
      standings: null as any,
      odds: null as any,
      predictions: null as any,
      errors: [] as string[]
    };

    // Upload standings from JSON file (ESPN API doesn't return the right format)
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'training', `standings_${season}_w${week}.json`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Standings file not found: standings_${season}_w${week}.json`);
      }

      const fileContents = fs.readFileSync(filePath, 'utf-8');
      const standings = JSON.parse(fileContents);

      const cleanedStandings = standings.map((team: any) => ({
        team: team.team || 'Unknown',
        wins: Number.isFinite(team.wins) ? team.wins : 0,
        losses: Number.isFinite(team.losses) ? team.losses : 0,
        ties: Number.isFinite(team.ties) ? team.ties : 0,
        pointsFor: Number.isFinite(team.pointsFor) ? team.pointsFor : 0,
        pointsAgainst: Number.isFinite(team.pointsAgainst) ? team.pointsAgainst : 0,
        conference: team.conference || 'Unknown',
        division: team.division || 'Unknown'
      }));

      await upsertDocument('standings_cache', `${season}-w${week}`, {
        season,
        week,
        standings: cleanedStandings,
        scrapedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      results.standings = { success: true, teams: cleanedStandings.length };
      console.log(`✅ Standings: ${cleanedStandings.length} teams`);
    } catch (error: any) {
      results.errors.push(`Standings: ${error.message}`);
      results.standings = { success: false, error: error.message };
    }

    // Cache odds
    try {
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?apiKey=${process.env.NEXT_PUBLIC_ODDS_API_KEY}&regions=us&markets=spreads,totals&oddsFormat=american`;
      const oddsResponse = await fetch(oddsUrl);
      const oddsData = await oddsResponse.json();

      await upsertDocument('odds_cache', `${season}-w${week}`, {
        season,
        week,
        odds: oddsData,
        lastUpdate: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      results.odds = { success: true, games: oddsData.length };
      console.log(`✅ Odds: ${oddsData.length} games`);
    } catch (error: any) {
      results.errors.push(`Odds: ${error.message}`);
      results.odds = { success: false, error: error.message };
    }

    // Step 3: Generate predictions and results for completed games
    try {
      console.log('🎯 Generating predictions for completed games...');

      const predictionsUrl = new URL('/api/cron/generate-predictions', request.url);
      const predictionsResponse = await fetch(predictionsUrl.toString(), {
        method: 'POST',
        headers: {
          'authorization': authHeader!
        }
      });

      const predictionsData = await predictionsResponse.json();

      if (predictionsData.success) {
        results.predictions = {
          success: true,
          ...predictionsData.summary
        };
        console.log(`✅ Predictions: ${predictionsData.summary.predictionsCreated} created, ${predictionsData.summary.resultsCreated} results`);
      } else {
        results.predictions = {
          success: false,
          error: predictionsData.error
        };
        results.errors.push(`Predictions: ${predictionsData.error}`);
      }
    } catch (error: any) {
      results.errors.push(`Predictions: ${error.message}`);
      results.predictions = { success: false, error: error.message };
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
