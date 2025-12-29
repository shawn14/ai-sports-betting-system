import { NextResponse } from 'next/server';

// Fetch all available stats from ESPN to see what we can use
export async function GET() {
  try {
    // Get standings with full stats
    const standingsRes = await fetch('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings');
    const standingsData = await standingsRes.json();

    // Get a sample team's full stats
    const sampleStats: Record<string, any>[] = [];
    const allStatNames = new Set<string>();

    for (const conf of standingsData.children || []) {
      for (const entry of conf.standings?.entries || []) {
        const teamName = entry.team?.displayName;
        const teamAbbr = entry.team?.abbreviation;

        const stats: Record<string, number> = {};
        for (const s of entry.stats || []) {
          if (s.name && s.value !== undefined) {
            stats[s.name] = s.value;
            allStatNames.add(s.name);
          }
        }

        if (sampleStats.length < 5) {
          sampleStats.push({
            team: teamAbbr,
            name: teamName,
            stats,
          });
        }
      }
    }

    // Also check the scoreboard for game-level data
    const scoreboardRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard');
    const scoreboardData = await scoreboardRes.json();

    const gameFields: string[] = [];
    const sampleGame = scoreboardData.events?.[0];
    if (sampleGame) {
      const comp = sampleGame.competitions?.[0];
      if (comp) {
        gameFields.push(...Object.keys(comp));

        // Check competitor fields
        const competitor = comp.competitors?.[0];
        if (competitor) {
          gameFields.push('competitor fields: ' + Object.keys(competitor).join(', '));

          // Check statistics
          if (competitor.statistics) {
            gameFields.push('competitor.statistics: ' + JSON.stringify(competitor.statistics).slice(0, 200));
          }

          // Check records
          if (competitor.records) {
            gameFields.push('competitor.records: ' + JSON.stringify(competitor.records).slice(0, 200));
          }
        }
      }
    }

    // Check team stats endpoint
    const teamStatsRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/13/statistics');
    const teamStatsData = await teamStatsRes.json();

    const teamStatCategories: string[] = [];
    for (const cat of teamStatsData.results?.stats?.categories || []) {
      teamStatCategories.push(`${cat.name}: ${cat.stats?.map((s: any) => s.name).join(', ')}`);
    }

    return NextResponse.json({
      availableStandingsStats: Array.from(allStatNames).sort(),
      sampleTeams: sampleStats,
      gameFields,
      teamStatCategories,
      summary: {
        totalStandingsStats: allStatNames.size,
        note: 'These are all stats available from ESPN that we could use for predictions',
      },
    });

  } catch (error) {
    console.error('Fetch stats error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
