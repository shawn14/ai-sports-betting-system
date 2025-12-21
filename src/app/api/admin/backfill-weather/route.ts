import { NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

const OPENWEATHER_HISTORY_BASE = 'https://history.openweathermap.org/data/2.5/history/city';

// NFL stadium coordinates
const NFL_STADIUMS: Record<string, { lat: number; lon: number; indoor: boolean }> = {
  'Arrowhead Stadium': { lat: 39.0489, lon: -94.4839, indoor: false },
  'Highmark Stadium': { lat: 42.7738, lon: -78.7870, indoor: false },
  'Empower Field at Mile High': { lat: 39.7439, lon: -105.0201, indoor: false },
  'FirstEnergy Stadium': { lat: 41.5061, lon: -81.6995, indoor: false },
  'Huntington Bank Field': { lat: 41.5061, lon: -81.6995, indoor: false },
  'Gillette Stadium': { lat: 42.0909, lon: -71.2643, indoor: false },
  'Hard Rock Stadium': { lat: 25.9580, lon: -80.2389, indoor: false },
  'Lumen Field': { lat: 47.5952, lon: -122.3316, indoor: false },
  'M&T Bank Stadium': { lat: 39.2780, lon: -76.6227, indoor: false },
  'MetLife Stadium': { lat: 40.8128, lon: -74.0742, indoor: false },
  'Nissan Stadium': { lat: 36.1665, lon: -86.7713, indoor: false },
  'Paycor Stadium': { lat: 39.0955, lon: -84.5160, indoor: false },
  'Raymond James Stadium': { lat: 27.9759, lon: -82.5033, indoor: false },
  'Soldier Field': { lat: 41.8623, lon: -87.6167, indoor: false },
  'TIAA Bank Field': { lat: 30.3239, lon: -81.6373, indoor: false },
  'EverBank Stadium': { lat: 30.3239, lon: -81.6373, indoor: false },
  'Levi\'s Stadium': { lat: 37.4033, lon: -121.9694, indoor: false },
  'Lambeau Field': { lat: 44.5013, lon: -88.0622, indoor: false },
  'Lincoln Financial Field': { lat: 39.9008, lon: -75.1675, indoor: false },
  'Acrisure Stadium': { lat: 40.4468, lon: -80.0158, indoor: false },
  'FedExField': { lat: 38.9076, lon: -76.8645, indoor: false },
  'Northwest Stadium': { lat: 38.9076, lon: -76.8645, indoor: false },
  'Bank of America Stadium': { lat: 35.2258, lon: -80.8528, indoor: false },
  // Indoor stadiums
  'SoFi Stadium': { lat: 33.9535, lon: -118.3392, indoor: true },
  'AT&T Stadium': { lat: 32.7473, lon: -97.0945, indoor: true },
  'Caesars Superdome': { lat: 29.9511, lon: -90.0812, indoor: true },
  'Ford Field': { lat: 42.3400, lon: -83.0456, indoor: true },
  'Lucas Oil Stadium': { lat: 39.7601, lon: -86.1639, indoor: true },
  'Mercedes-Benz Stadium': { lat: 33.7554, lon: -84.4010, indoor: true },
  'State Farm Stadium': { lat: 33.5276, lon: -112.2626, indoor: true },
  'U.S. Bank Stadium': { lat: 44.9736, lon: -93.2575, indoor: true },
  'Allegiant Stadium': { lat: 36.0909, lon: -115.1833, indoor: true },
  'NRG Stadium': { lat: 29.6847, lon: -95.4107, indoor: true },
};

// Team to home stadium mapping
const TEAM_STADIUMS: Record<string, string> = {
  'ARI': 'State Farm Stadium',
  'ATL': 'Mercedes-Benz Stadium',
  'BAL': 'M&T Bank Stadium',
  'BUF': 'Highmark Stadium',
  'CAR': 'Bank of America Stadium',
  'CHI': 'Soldier Field',
  'CIN': 'Paycor Stadium',
  'CLE': 'Huntington Bank Field',
  'DAL': 'AT&T Stadium',
  'DEN': 'Empower Field at Mile High',
  'DET': 'Ford Field',
  'GB': 'Lambeau Field',
  'HOU': 'NRG Stadium',
  'IND': 'Lucas Oil Stadium',
  'JAX': 'EverBank Stadium',
  'KC': 'Arrowhead Stadium',
  'LAC': 'SoFi Stadium',
  'LAR': 'SoFi Stadium',
  'LV': 'Allegiant Stadium',
  'MIA': 'Hard Rock Stadium',
  'MIN': 'U.S. Bank Stadium',
  'NE': 'Gillette Stadium',
  'NO': 'Caesars Superdome',
  'NYG': 'MetLife Stadium',
  'NYJ': 'MetLife Stadium',
  'PHI': 'Lincoln Financial Field',
  'PIT': 'Acrisure Stadium',
  'SEA': 'Lumen Field',
  'SF': 'Levi\'s Stadium',
  'TB': 'Raymond James Stadium',
  'TEN': 'Nissan Stadium',
  'WAS': 'Northwest Stadium',
};

interface HistoricalWeather {
  temperature: number;
  windSpeed: number;
  precipitation: number;
  conditions: string;
  humidity: number;
}

async function fetchHistoricalWeather(
  lat: number,
  lon: number,
  gameTime: Date,
  apiKey: string
): Promise<HistoricalWeather | null> {
  // Get weather for the hour of the game
  const start = Math.floor(gameTime.getTime() / 1000) - 3600; // 1 hour before
  const end = Math.floor(gameTime.getTime() / 1000) + 3600; // 1 hour after

  const url = `${OPENWEATHER_HISTORY_BASE}?lat=${lat}&lon=${lon}&type=hour&start=${start}&end=${end}&appid=${apiKey}&units=imperial`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Weather API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.list || data.list.length === 0) {
      return null;
    }

    // Find closest hour to game time
    const targetTime = gameTime.getTime();
    let closest = data.list[0];
    let closestDiff = Math.abs(new Date(closest.dt * 1000).getTime() - targetTime);

    for (const record of data.list) {
      const diff = Math.abs(new Date(record.dt * 1000).getTime() - targetTime);
      if (diff < closestDiff) {
        closest = record;
        closestDiff = diff;
      }
    }

    return {
      temperature: Math.round(closest.main.temp),
      windSpeed: Math.round(closest.wind.speed),
      precipitation: closest.rain?.['1h'] || closest.snow?.['1h'] || 0,
      conditions: closest.weather?.[0]?.description || 'Unknown',
      humidity: closest.main.humidity,
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

function calculateWeatherImpact(weather: HistoricalWeather | null, isIndoor: boolean): number {
  if (!weather || isIndoor) return 0;

  let impact = 0;

  // Wind impact
  if (weather.windSpeed > 15) impact += 0.5;
  if (weather.windSpeed > 25) impact += 1.0;

  // Temperature impact
  if (weather.temperature < 32) impact += 0.5;
  if (weather.temperature < 20) impact += 0.5;
  if (weather.temperature < 10) impact += 0.5;

  // Precipitation impact
  if (weather.precipitation > 0) impact += 0.5;
  if (weather.precipitation > 0.1) impact += 0.5;

  return impact;
}

interface BacktestResult {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  week: number;
  gameTime: string;
  predictedTotal: number;
  actualTotal: number;
  vegasTotal?: number;
  ouVegasResult?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam) : 20;

  const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Weather API key not configured' }, { status: 500 });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    // 1. Read existing blob
    log('Reading blob data...');
    const blobInfo = await head('prediction-matrix-data.json');
    if (!blobInfo?.url) {
      return NextResponse.json({ error: 'No blob data found' }, { status: 404 });
    }

    const response = await fetch(blobInfo.url);
    const blobData = await response.json();

    const results: BacktestResult[] = blobData.backtest?.results || [];
    const historicalWeather: Record<string, HistoricalWeather & { isIndoor: boolean; impact: number }> =
      blobData.historicalWeather || {};

    log(`Found ${results.length} backtest results, ${Object.keys(historicalWeather).length} already have weather`);

    // 2. Find games that need weather data
    const gamesNeedingWeather = results.filter(r =>
      !historicalWeather[r.gameId] &&
      r.gameTime &&
      r.homeTeam
    ).slice(0, limit);

    log(`Fetching weather for ${gamesNeedingWeather.length} games...`);

    let fetchedCount = 0;
    let indoorCount = 0;
    let outdoorCount = 0;

    for (const game of gamesNeedingWeather) {
      const stadiumName = TEAM_STADIUMS[game.homeTeam];
      const stadium = stadiumName ? NFL_STADIUMS[stadiumName] : null;

      if (!stadium) {
        log(`  Unknown stadium for ${game.homeTeam}`);
        continue;
      }

      if (stadium.indoor) {
        // Indoor - no weather impact
        historicalWeather[game.gameId] = {
          temperature: 72,
          windSpeed: 0,
          precipitation: 0,
          conditions: 'Indoor',
          humidity: 50,
          isIndoor: true,
          impact: 0,
        };
        indoorCount++;
        fetchedCount++;
        continue;
      }

      // Fetch historical weather for outdoor games
      const gameTime = new Date(game.gameTime);
      const weather = await fetchHistoricalWeather(stadium.lat, stadium.lon, gameTime, apiKey);

      if (weather) {
        const impact = calculateWeatherImpact(weather, false);
        historicalWeather[game.gameId] = {
          ...weather,
          isIndoor: false,
          impact,
        };
        outdoorCount++;
        fetchedCount++;

        if (impact > 0) {
          log(`  ${game.awayTeam}@${game.homeTeam} Wk${game.week}: ${weather.temperature}°F, ${weather.windSpeed}mph wind, impact=${impact}`);
        }
      }

      // Rate limit - 60 calls/minute for free tier
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    log(`Fetched ${fetchedCount} weather records (${indoorCount} indoor, ${outdoorCount} outdoor)`);

    // 3. Calculate what-if O/U results with weather adjustment
    let originalWins = 0, originalLosses = 0;
    let adjustedWins = 0, adjustedLosses = 0;
    let gamesWithWeatherAndOdds = 0;

    for (const game of results) {
      if (!game.vegasTotal || !game.ouVegasResult) continue;

      const weather = historicalWeather[game.gameId];

      // Original result
      if (game.ouVegasResult === 'win') originalWins++;
      else if (game.ouVegasResult === 'loss') originalLosses++;

      if (!weather) continue;
      gamesWithWeatherAndOdds++;

      // Adjusted prediction
      const adjustedTotal = game.predictedTotal - (weather.impact * 3);
      const originalPick = game.predictedTotal > game.vegasTotal ? 'over' : 'under';
      const adjustedPick = adjustedTotal > game.vegasTotal ? 'over' : 'under';

      // Calculate adjusted result
      let adjustedResult: string;
      if (adjustedPick === 'over') {
        adjustedResult = game.actualTotal > game.vegasTotal ? 'win' :
                        game.actualTotal < game.vegasTotal ? 'loss' : 'push';
      } else {
        adjustedResult = game.actualTotal < game.vegasTotal ? 'win' :
                        game.actualTotal > game.vegasTotal ? 'loss' : 'push';
      }

      if (adjustedResult === 'win') adjustedWins++;
      else if (adjustedResult === 'loss') adjustedLosses++;
    }

    // 4. Save updated blob with historical weather
    blobData.historicalWeather = historicalWeather;
    blobData.generated = new Date().toISOString();

    const jsonString = JSON.stringify(blobData);
    log(`Uploading updated blob (${Math.round(jsonString.length / 1024)}KB)...`);

    await put('prediction-matrix-data.json', jsonString, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    const originalPct = originalWins + originalLosses > 0
      ? Math.round((originalWins / (originalWins + originalLosses)) * 1000) / 10
      : 0;
    const adjustedPct = adjustedWins + adjustedLosses > 0
      ? Math.round((adjustedWins / (adjustedWins + adjustedLosses)) * 1000) / 10
      : 0;

    log('Done!');

    return NextResponse.json({
      success: true,
      stats: {
        totalGames: results.length,
        gamesWithWeather: Object.keys(historicalWeather).length,
        newWeatherFetched: fetchedCount,
        indoorGames: indoorCount,
        outdoorGames: outdoorCount,
      },
      ouComparison: {
        gamesWithWeatherAndOdds,
        original: { wins: originalWins, losses: originalLosses, pct: originalPct },
        withWeatherAdj: { wins: adjustedWins, losses: adjustedLosses, pct: adjustedPct },
        improvement: Math.round((adjustedPct - originalPct) * 10) / 10,
      },
      logs,
    });
  } catch (error) {
    console.error('Backfill weather error:', error);
    return NextResponse.json({
      error: 'Failed to backfill weather',
      message: error instanceof Error ? error.message : 'Unknown error',
      logs,
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
