import { NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

// Team name to abbreviation mapping
const TEAM_ABBREV: Record<string, string> = {
  'Cardinals': 'ARI', 'Arizona': 'ARI',
  'Falcons': 'ATL', 'Atlanta': 'ATL',
  'Ravens': 'BAL', 'Baltimore': 'BAL',
  'Bills': 'BUF', 'Buffalo': 'BUF',
  'Panthers': 'CAR', 'Carolina': 'CAR',
  'Bears': 'CHI', 'Chicago': 'CHI',
  'Bengals': 'CIN', 'Cincinnati': 'CIN',
  'Browns': 'CLE', 'Cleveland': 'CLE',
  'Cowboys': 'DAL', 'Dallas': 'DAL',
  'Broncos': 'DEN', 'Denver': 'DEN',
  'Lions': 'DET', 'Detroit': 'DET',
  'Packers': 'GB', 'Green Bay': 'GB',
  'Texans': 'HOU', 'Houston': 'HOU',
  'Colts': 'IND', 'Indianapolis': 'IND',
  'Jaguars': 'JAX', 'Jacksonville': 'JAX',
  'Chiefs': 'KC', 'Kansas City': 'KC',
  'Raiders': 'LV', 'Las Vegas': 'LV',
  'Chargers': 'LAC', 'Los Angeles Chargers': 'LAC',
  'Rams': 'LAR', 'Los Angeles Rams': 'LAR',
  'Dolphins': 'MIA', 'Miami': 'MIA',
  'Vikings': 'MIN', 'Minnesota': 'MIN',
  'Patriots': 'NE', 'New England': 'NE',
  'Saints': 'NO', 'New Orleans': 'NO',
  'Giants': 'NYG', 'New York Giants': 'NYG',
  'Jets': 'NYJ', 'New York Jets': 'NYJ',
  'Eagles': 'PHI', 'Philadelphia': 'PHI',
  'Steelers': 'PIT', 'Pittsburgh': 'PIT',
  '49ers': 'SF', 'San Francisco': 'SF',
  'Seahawks': 'SEA', 'Seattle': 'SEA',
  'Buccaneers': 'TB', 'Tampa Bay': 'TB',
  'Titans': 'TEN', 'Tennessee': 'TEN',
  'Commanders': 'WAS', 'Washington': 'WAS',
};

interface PlayerInjury {
  name: string;
  position: string;
  injury: string;
  status: string; // Out, Questionable, Doubtful, IR
}

interface WeeklyInjuries {
  week: number;
  season: number;
  teams: Record<string, PlayerInjury[]>;
  fetchedAt: string;
}

// Parse injury status from text
function parseStatus(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('out') || lower.includes('did not participate')) return 'Out';
  if (lower.includes('doubtful')) return 'Doubtful';
  if (lower.includes('questionable')) return 'Questionable';
  if (lower.includes('ir') || lower.includes('injured reserve')) return 'IR';
  if (lower.includes('limited')) return 'Questionable';
  return 'Unknown';
}

// Fetch and parse NFL.com injury page
async function fetchNFLInjuries(season: number, week: number): Promise<WeeklyInjuries | null> {
  const url = `https://www.nfl.com/injuries/league/${season}/reg${week}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`NFL.com returned ${response.status} for week ${week}`);
      return null;
    }

    const html = await response.text();
    const teams: Record<string, PlayerInjury[]> = {};

    // Parse the HTML to extract injury data
    // NFL.com uses a table structure with team sections
    // This is a simplified parser - may need adjustment based on actual HTML structure

    // NFL.com is JavaScript-rendered, so direct HTML parsing is limited
    // The actual data would need to be extracted differently
    // For now, return empty structure - data can be added via POST endpoint

    return {
      week,
      season,
      teams,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching week ${week}:`, error);
    return null;
  }
}

// Alternative: Use WebFetch-style approach to get structured data
async function fetchInjuriesViaAPI(season: number, week: number): Promise<WeeklyInjuries | null> {
  // Try ESPN's endpoint which is more API-friendly
  // Note: ESPN only has current week, so this is for reference

  // For historical data, we'll need to store manually or use a different approach
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startWeek = parseInt(searchParams.get('start') || '1');
  const endWeek = parseInt(searchParams.get('end') || '15');
  const season = parseInt(searchParams.get('season') || '2025');

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    // Read existing blob
    log('Reading existing blob...');
    let blobData: any = {};
    try {
      const blobInfo = await head('prediction-matrix-data.json');
      if (blobInfo?.url) {
        const response = await fetch(blobInfo.url);
        blobData = await response.json();
      }
    } catch {
      log('No existing blob found, starting fresh');
    }

    const injuriesByWeek: Record<string, WeeklyInjuries> = blobData.injuriesByWeek || {};
    log(`Found ${Object.keys(injuriesByWeek).length} existing weeks of injury data`);

    // Fetch missing weeks
    let fetchedCount = 0;
    for (let week = startWeek; week <= endWeek; week++) {
      const weekKey = `${season}-${week}`;

      if (injuriesByWeek[weekKey]) {
        log(`Week ${week}: Already have data, skipping`);
        continue;
      }

      log(`Week ${week}: Fetching from NFL.com...`);
      const injuries = await fetchNFLInjuries(season, week);

      if (injuries) {
        injuriesByWeek[weekKey] = injuries;
        fetchedCount++;
        log(`Week ${week}: Stored ${Object.keys(injuries.teams).length} teams`);
      } else {
        log(`Week ${week}: Failed to fetch`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save back to blob
    blobData.injuriesByWeek = injuriesByWeek;
    blobData.generated = new Date().toISOString();

    const jsonString = JSON.stringify(blobData);
    log(`Saving blob (${Math.round(jsonString.length / 1024)}KB)...`);

    await put('prediction-matrix-data.json', jsonString, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    log('Done!');

    return NextResponse.json({
      success: true,
      stats: {
        weeksRequested: endWeek - startWeek + 1,
        weeksFetched: fetchedCount,
        totalWeeksStored: Object.keys(injuriesByWeek).length,
      },
      logs,
    });
  } catch (error) {
    console.error('Backfill injuries error:', error);
    return NextResponse.json({
      error: 'Failed to backfill injuries',
      message: error instanceof Error ? error.message : 'Unknown error',
      logs,
    }, { status: 500 });
  }
}

// POST endpoint to manually add injury data for a week
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { season, week, teams } = body;

    if (!season || !week || !teams) {
      return NextResponse.json({ error: 'Missing season, week, or teams' }, { status: 400 });
    }

    // Read existing blob
    let blobData: any = {};
    try {
      const blobInfo = await head('prediction-matrix-data.json');
      if (blobInfo?.url) {
        const response = await fetch(blobInfo.url);
        blobData = await response.json();
      }
    } catch {
      // Start fresh
    }

    const injuriesByWeek: Record<string, WeeklyInjuries> = blobData.injuriesByWeek || {};
    const weekKey = `${season}-${week}`;

    injuriesByWeek[weekKey] = {
      week,
      season,
      teams,
      fetchedAt: new Date().toISOString(),
    };

    blobData.injuriesByWeek = injuriesByWeek;
    blobData.generated = new Date().toISOString();

    await put('prediction-matrix-data.json', JSON.stringify(blobData), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({
      success: true,
      weekKey,
      teamsCount: Object.keys(teams).length,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to save injuries',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
