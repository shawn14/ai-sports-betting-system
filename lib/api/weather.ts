import axios from 'axios';
import { WeatherData } from '@/types';

const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';
const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

// NFL Stadium locations (city coordinates)
const STADIUM_LOCATIONS: Record<string, { lat: number; lon: number; city: string }> = {
  // AFC East
  'Buffalo Bills': { lat: 42.7738, lon: -78.7870, city: 'Buffalo' },
  'Miami Dolphins': { lat: 25.9580, lon: -80.2389, city: 'Miami Gardens' },
  'New England Patriots': { lat: 42.0909, lon: -71.2643, city: 'Foxborough' },
  'New York Jets': { lat: 40.8135, lon: -74.0745, city: 'East Rutherford' },

  // AFC North
  'Baltimore Ravens': { lat: 39.2780, lon: -76.6227, city: 'Baltimore' },
  'Cincinnati Bengals': { lat: 39.0954, lon: -84.5160, city: 'Cincinnati' },
  'Cleveland Browns': { lat: 41.5061, lon: -81.6995, city: 'Cleveland' },
  'Pittsburgh Steelers': { lat: 40.4468, lon: -80.0158, city: 'Pittsburgh' },

  // AFC South
  'Houston Texans': { lat: 29.6847, lon: -95.4107, city: 'Houston' },
  'Indianapolis Colts': { lat: 39.7601, lon: -86.1639, city: 'Indianapolis' },
  'Jacksonville Jaguars': { lat: 30.3240, lon: -81.6373, city: 'Jacksonville' },
  'Tennessee Titans': { lat: 36.1665, lon: -86.7713, city: 'Nashville' },

  // AFC West
  'Denver Broncos': { lat: 39.7439, lon: -105.0201, city: 'Denver' },
  'Kansas City Chiefs': { lat: 39.0489, lon: -94.4839, city: 'Kansas City' },
  'Las Vegas Raiders': { lat: 36.0908, lon: -115.1835, city: 'Las Vegas' },
  'Los Angeles Chargers': { lat: 33.9534, lon: -118.3390, city: 'Inglewood' },

  // NFC East
  'Dallas Cowboys': { lat: 32.7473, lon: -97.0945, city: 'Arlington' },
  'New York Giants': { lat: 40.8135, lon: -74.0745, city: 'East Rutherford' },
  'Philadelphia Eagles': { lat: 39.9008, lon: -75.1675, city: 'Philadelphia' },
  'Washington Commanders': { lat: 38.9076, lon: -76.8645, city: 'Landover' },

  // NFC North
  'Chicago Bears': { lat: 41.8623, lon: -87.6167, city: 'Chicago' },
  'Detroit Lions': { lat: 42.3400, lon: -83.0456, city: 'Detroit' },
  'Green Bay Packers': { lat: 44.5013, lon: -88.0622, city: 'Green Bay' },
  'Minnesota Vikings': { lat: 44.9738, lon: -93.2575, city: 'Minneapolis' },

  // NFC South
  'Atlanta Falcons': { lat: 33.7555, lon: -84.4009, city: 'Atlanta' },
  'Carolina Panthers': { lat: 35.2258, lon: -80.8528, city: 'Charlotte' },
  'New Orleans Saints': { lat: 29.9511, lon: -90.0812, city: 'New Orleans' },
  'Tampa Bay Buccaneers': { lat: 27.9759, lon: -82.5033, city: 'Tampa' },

  // NFC West
  'Arizona Cardinals': { lat: 33.5276, lon: -112.2626, city: 'Glendale' },
  'Los Angeles Rams': { lat: 33.9534, lon: -118.3390, city: 'Inglewood' },
  'San Francisco 49ers': { lat: 37.4030, lon: -121.9697, city: 'Santa Clara' },
  'Seattle Seahawks': { lat: 47.5952, lon: -122.3316, city: 'Seattle' },
};

export class WeatherAPI {
  /**
   * Get current weather for a stadium location
   */
  static async getCurrentWeather(teamName: string): Promise<WeatherData | null> {
    const location = STADIUM_LOCATIONS[teamName];
    if (!location || !API_KEY) {
      return null;
    }

    try {
      const response = await axios.get(`${WEATHER_API_BASE}/weather`, {
        params: {
          lat: location.lat,
          lon: location.lon,
          appid: API_KEY,
          units: 'imperial',
        },
      });

      return this.transformWeatherData(response.data);
    } catch (error) {
      console.error('Weather API Error:', error);
      return null;
    }
  }

  /**
   * Get weather forecast for a future game
   */
  static async getForecast(teamName: string, gameTime: Date): Promise<WeatherData | null> {
    const location = STADIUM_LOCATIONS[teamName];
    if (!location || !API_KEY) {
      return null;
    }

    try {
      // Use 5-day forecast API
      const response = await axios.get(`${WEATHER_API_BASE}/forecast`, {
        params: {
          lat: location.lat,
          lon: location.lon,
          appid: API_KEY,
          units: 'imperial',
        },
      });

      // Find forecast closest to game time
      const gameTimestamp = gameTime.getTime();
      let closestForecast = response.data.list[0];
      let minDiff = Math.abs(new Date(closestForecast.dt * 1000).getTime() - gameTimestamp);

      response.data.list.forEach((forecast: any) => {
        const forecastTime = new Date(forecast.dt * 1000).getTime();
        const diff = Math.abs(forecastTime - gameTimestamp);
        if (diff < minDiff) {
          minDiff = diff;
          closestForecast = forecast;
        }
      });

      return this.transformWeatherData(closestForecast);
    } catch (error) {
      console.error('Weather Forecast API Error:', error);
      return null;
    }
  }

  /**
   * Transform OpenWeather API response to WeatherData type
   */
  private static transformWeatherData(data: any): WeatherData {
    return {
      temperature: Math.round(data.main?.temp || 0),
      conditions: data.weather?.[0]?.description || 'Unknown',
      windSpeed: Math.round(data.wind?.speed || 0),
      windDirection: this.degreesToDirection(data.wind?.deg || 0),
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      humidity: data.main?.humidity || 0,
    };
  }

  /**
   * Convert wind degrees to cardinal direction
   */
  private static degreesToDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(((degrees % 360) / 22.5));
    return directions[index % 16];
  }

  /**
   * Analyze weather impact on game
   */
  static analyzeWeatherImpact(weather: WeatherData): {
    severity: 'none' | 'low' | 'moderate' | 'high' | 'extreme';
    factors: string[];
    passingImpact: number; // -100 to 100
    runningImpact: number; // -100 to 100
  } {
    const factors: string[] = [];
    let severity: 'none' | 'low' | 'moderate' | 'high' | 'extreme' = 'none';
    let passingImpact = 0;
    let runningImpact = 0;

    // Temperature impact
    if (weather.temperature < 20) {
      factors.push('Extremely cold conditions');
      passingImpact -= 15;
      severity = 'high';
    } else if (weather.temperature < 32) {
      factors.push('Freezing temperatures');
      passingImpact -= 10;
      severity = severity === 'none' ? 'moderate' : severity;
    } else if (weather.temperature > 95) {
      factors.push('Extreme heat');
      passingImpact -= 5;
      runningImpact -= 5;
      severity = severity === 'none' ? 'moderate' : severity;
    }

    // Wind impact
    if (weather.windSpeed > 25) {
      factors.push('Very high winds');
      passingImpact -= 30;
      severity = 'extreme';
    } else if (weather.windSpeed > 15) {
      factors.push('Strong winds');
      passingImpact -= 20;
      severity = severity === 'none' ? 'high' : severity;
    } else if (weather.windSpeed > 10) {
      factors.push('Moderate winds');
      passingImpact -= 10;
      severity = severity === 'none' ? 'moderate' : severity;
    }

    // Precipitation impact
    if (weather.precipitation > 0.5) {
      factors.push('Heavy precipitation');
      passingImpact -= 20;
      runningImpact += 5;
      severity = 'high';
    } else if (weather.precipitation > 0.1) {
      factors.push('Light precipitation');
      passingImpact -= 10;
      severity = severity === 'none' ? 'moderate' : severity;
    }

    // Rain/snow in conditions
    if (weather.conditions.toLowerCase().includes('rain') ||
        weather.conditions.toLowerCase().includes('snow')) {
      runningImpact += 10;
      passingImpact -= 15;
    }

    if (factors.length === 0) {
      factors.push('Ideal conditions');
    }

    return {
      severity,
      factors,
      passingImpact: Math.max(-100, Math.min(100, passingImpact)),
      runningImpact: Math.max(-100, Math.min(100, runningImpact)),
    };
  }
}
