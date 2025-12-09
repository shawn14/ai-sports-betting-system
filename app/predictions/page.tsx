'use client';

import { useEffect, useState } from 'react';
import LoggedInHeader from '@/components/LoggedInHeader';
import { Target, TrendingUp, Activity } from 'lucide-react';
import { NFLAPI } from '@/lib/api/nfl';

interface GamePrediction {
  gameId: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedSpread: number;
  predictedTotal: number;
  predictedWinner: string;
  confidence: number;
  gameTime: Date;
  status: string;
}

export default function PredictionsPage() {
  const [currentPredictions, setCurrentPredictions] = useState<GamePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(2024);
  const [currentWeek, setCurrentWeek] = useState(14);
  const [selectedWeek, setSelectedWeek] = useState(14);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentWeekPredictions();
  }, []);

  const loadCurrentWeekPredictions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current season and week
      console.log('Getting current season and week...');
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      console.log(`Current season: ${season}, week: ${week}`);

      setCurrentSeason(season);
      setCurrentWeek(week);
      setSelectedWeek(week);

      // Load games for current week
      await loadWeekPredictions(season, week);
    } catch (error: any) {
      console.error('Error loading predictions:', error);
      setError(error.message || 'Failed to load predictions');
      setLoading(false);
    }
  };

  const loadWeekPredictions = async (season: number, week: number) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedWeek(week);

      // Get games for the week
      console.log(`Loading games for ${season} week ${week}...`);
      const games = await NFLAPI.getWeekGames(season, week);
      console.log(`Found ${games.length} games`);

      if (games.length === 0) {
        setCurrentPredictions([]);
        setError(`No games found for ${season} week ${week}`);
        setLoading(false);
        return;
      }

      // Generate predictions
      console.log('Generating predictions...');
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          games,
          season,
          week,
          presetName: 'balanced'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate predictions');
      }

      const data = await response.json();
      console.log('Predictions generated:', data.count);

      // Convert predictions object to array
      const predictionsArray: GamePrediction[] = Object.entries(data.predictions).map(([gameId, pred]: [string, any]) => {
        const game = games.find(g => g.id === gameId);
        return {
          gameId,
          week,
          homeTeam: pred.homeTeam,
          awayTeam: pred.awayTeam,
          predictedHomeScore: pred.predictedHome,
          predictedAwayScore: pred.predictedAway,
          predictedSpread: pred.spread,
          predictedTotal: pred.total,
          predictedWinner: pred.predictedHome > pred.predictedAway ? pred.homeTeam : pred.awayTeam,
          confidence: pred.confidence || 75,
          gameTime: game?.gameTime || new Date(),
          status: game?.status || 'scheduled'
        };
      });

      setCurrentPredictions(predictionsArray);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading week predictions:', error);
      setError(error.message || 'Failed to load predictions');
      setLoading(false);
    }
  };

  const formatGameTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Generate week options (weeks 1-18)
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <LoggedInHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading predictions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <LoggedInHeader />

      {/* Header */}
      <div className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-gray-900">AI PREDICTIONS</h1>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>{currentSeason} Season</span>
                <span>•</span>
                <span>Week {selectedWeek}</span>
                <span>•</span>
                <span>{currentPredictions.length} Games</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Week Selector */}
        <div className="bg-white rounded border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-3">
            <label className="text-gray-600 text-xs font-semibold">SELECT WEEK:</label>
            <select
              value={selectedWeek}
              onChange={(e) => loadWeekPredictions(currentSeason, parseInt(e.target.value))}
              className="bg-white text-gray-900 rounded px-3 py-1.5 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {weeks.map(week => (
                <option key={week} value={week}>
                  Week {week} {week === currentWeek ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Predictions List */}
        <div className="space-y-3">
          {currentPredictions.map((pred) => (
            <div
              key={pred.gameId}
              className="bg-white rounded border border-gray-200 p-4"
            >
              {/* Game Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-gray-900 font-bold text-base">
                    {pred.awayTeam} @ {pred.homeTeam}
                  </div>
                  <div className="text-gray-600 text-xs mt-1">
                    {formatGameTime(pred.gameTime)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-600 font-semibold text-xs">
                    {pred.confidence}% CONFIDENCE
                  </div>
                  <div className="text-gray-500 text-[10px] uppercase mt-0.5">
                    {pred.status}
                  </div>
                </div>
              </div>

              {/* Prediction Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Winner Prediction */}
                <div className="bg-blue-50 rounded border border-blue-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <div className="text-blue-700 text-[10px] font-bold">PREDICTED WINNER</div>
                  </div>
                  <div className="text-gray-900 font-bold text-lg">
                    {pred.predictedWinner}
                  </div>
                  <div className="text-gray-600 text-xs mt-1">
                    {pred.predictedAwayScore.toFixed(1)} - {pred.predictedHomeScore.toFixed(1)}
                  </div>
                </div>

                {/* Spread Prediction */}
                <div className="bg-purple-50 rounded border border-purple-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <div className="text-purple-700 text-[10px] font-bold">SPREAD</div>
                  </div>
                  <div className="text-gray-900 font-bold text-lg">
                    {pred.homeTeam}
                  </div>
                  <div className="text-gray-600 text-xs mt-1">
                    {pred.predictedSpread > 0 ? '+' : ''}{pred.predictedSpread.toFixed(1)}
                  </div>
                </div>

                {/* Total Prediction */}
                <div className="bg-orange-50 rounded border border-orange-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-orange-600" />
                    <div className="text-orange-700 text-[10px] font-bold">TOTAL (O/U)</div>
                  </div>
                  <div className="text-gray-900 font-bold text-lg">
                    {pred.predictedTotal.toFixed(1)} pts
                  </div>
                  <div className="text-gray-600 text-xs mt-1">
                    Combined score
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && currentPredictions.length === 0 && (
          <div className="text-center py-12 bg-white rounded border border-red-200">
            <p className="text-red-600 text-sm font-semibold mb-2">Error</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        )}

        {!error && currentPredictions.length === 0 && !loading && (
          <div className="text-center py-12 bg-white rounded border border-gray-200">
            <p className="text-gray-500 text-sm">No games found for Week {selectedWeek}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
