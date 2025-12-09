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
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedSpread: number;
  predictedTotal: number;
  predictedWinner: string;
  confidence: number;
  gameTime: Date;
  status: string;
  actualHomeScore?: number;
  actualAwayScore?: number;
  actualWinner?: string;
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
      console.log('Sample prediction:', Object.values(data.predictions)[0]);

      // Convert predictions object to array
      const predictionsArray: GamePrediction[] = Object.entries(data.predictions).map(([gameId, pred]: [string, any]) => {
        const game = games.find(g => g.id === gameId);

        // Handle different possible field names from API
        const homeScore = pred.predictedScore?.home ?? pred.predictedHome ?? pred.homeScore ?? 0;
        const awayScore = pred.predictedScore?.away ?? pred.predictedAway ?? pred.awayScore ?? 0;

        // Extract spread and total from factors array if needed
        let spread = 0;
        let total = 0;
        if (pred.factors && Array.isArray(pred.factors)) {
          const spreadFactor = pred.factors.find((f: string) => f.includes('Predicted Spread:'));
          const totalFactor = pred.factors.find((f: string) => f.includes('Predicted Total:'));
          if (spreadFactor) {
            const match = spreadFactor.match(/([+-]?\d+\.?\d*)/);
            if (match) spread = parseFloat(match[1]);
          }
          if (totalFactor) {
            const match = totalFactor.match(/(\d+\.?\d*)/);
            if (match) total = parseFloat(match[1]);
          }
        }

        // Get actual scores if game is complete
        const actualHomeScore = game?.homeTeam?.score;
        const actualAwayScore = game?.awayTeam?.score;
        const actualWinner = actualHomeScore !== undefined && actualAwayScore !== undefined && actualHomeScore > actualAwayScore
          ? game?.homeTeam?.name
          : actualAwayScore !== undefined && actualHomeScore !== undefined && actualAwayScore > actualHomeScore
          ? game?.awayTeam?.name
          : undefined;

        return {
          gameId,
          week,
          homeTeam: pred.homeTeam || game?.homeTeam?.name || 'Unknown',
          awayTeam: pred.awayTeam || game?.awayTeam?.name || 'Unknown',
          homeTeamLogo: game?.homeTeam?.logo,
          awayTeamLogo: game?.awayTeam?.logo,
          predictedHomeScore: homeScore,
          predictedAwayScore: awayScore,
          predictedSpread: spread,
          predictedTotal: total,
          predictedWinner: homeScore > awayScore ? (pred.homeTeam || game?.homeTeam?.name) : (pred.awayTeam || game?.awayTeam?.name),
          confidence: pred.confidence || 75,
          gameTime: game?.gameTime || new Date(),
          status: game?.status || 'scheduled',
          actualHomeScore,
          actualAwayScore,
          actualWinner
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
          {currentPredictions.map((pred) => {
            const isComplete = pred.status === 'completed' && pred.actualHomeScore !== undefined && pred.actualAwayScore !== undefined;
            const actualTotal = isComplete ? (pred.actualHomeScore! + pred.actualAwayScore!) : 0;
            const actualSpread = isComplete ? (pred.actualHomeScore! - pred.actualAwayScore!) : 0;

            // Calculate bet results
            const moneylineWin = isComplete && pred.actualWinner === pred.predictedWinner;
            const spreadWin = isComplete && Math.abs(actualSpread - pred.predictedSpread) < 3;
            const totalWin = isComplete && Math.abs(actualTotal - pred.predictedTotal) < 3;

            return (
              <div
                key={pred.gameId}
                className="bg-white rounded border border-gray-200 p-4"
              >
                {/* Game Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {pred.awayTeamLogo && (
                        <img src={pred.awayTeamLogo} alt={pred.awayTeam} className="w-6 h-6" />
                      )}
                      <span className="text-gray-900 font-bold text-base">{pred.awayTeam}</span>
                    </div>
                    <span className="text-gray-500">@</span>
                    <div className="flex items-center gap-2">
                      {pred.homeTeamLogo && (
                        <img src={pred.homeTeamLogo} alt={pred.homeTeam} className="w-6 h-6" />
                      )}
                      <span className="text-gray-900 font-bold text-base">{pred.homeTeam}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-600 font-semibold text-xs">
                      {pred.confidence}% CONFIDENCE
                    </div>
                    <div className="text-gray-500 text-[10px] uppercase mt-0.5">
                      {isComplete ? 'COMPLETED' : pred.status}
                    </div>
                  </div>
                </div>

                {isComplete && (
                  <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">ACTUAL RESULT</div>
                    <div className="text-gray-900 font-bold">
                      {pred.awayTeam} {pred.actualAwayScore} - {pred.actualHomeScore} {pred.homeTeam}
                    </div>
                  </div>
                )}

                {/* Prediction Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Winner Prediction */}
                  <div className={`rounded border p-3 ${
                    !isComplete ? 'bg-blue-50 border-blue-200' :
                    moneylineWin ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className={`w-4 h-4 ${
                        !isComplete ? 'text-blue-600' :
                        moneylineWin ? 'text-green-600' : 'text-red-600'
                      }`} />
                      <div className={`text-[10px] font-bold ${
                        !isComplete ? 'text-blue-700' :
                        moneylineWin ? 'text-green-700' : 'text-red-700'
                      }`}>
                        PREDICTED WINNER {isComplete && (moneylineWin ? '✓' : '✗')}
                      </div>
                    </div>
                    <div className="text-gray-900 font-bold text-lg">
                      {pred.predictedWinner}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {pred.predictedAwayScore.toFixed(1)} - {pred.predictedHomeScore.toFixed(1)}
                    </div>
                  </div>

                  {/* Spread Prediction */}
                  <div className={`rounded border p-3 ${
                    !isComplete ? 'bg-purple-50 border-purple-200' :
                    spreadWin ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`w-4 h-4 ${
                        !isComplete ? 'text-purple-600' :
                        spreadWin ? 'text-green-600' : 'text-red-600'
                      }`} />
                      <div className={`text-[10px] font-bold ${
                        !isComplete ? 'text-purple-700' :
                        spreadWin ? 'text-green-700' : 'text-red-700'
                      }`}>
                        SPREAD {isComplete && (spreadWin ? '✓' : '✗')}
                      </div>
                    </div>
                    <div className="text-gray-900 font-bold text-lg">
                      {pred.homeTeam}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      Predicted: {pred.predictedSpread > 0 ? '+' : ''}{pred.predictedSpread.toFixed(1)}
                    </div>
                    {isComplete && (
                      <div className="text-gray-600 text-xs">
                        Actual: {actualSpread > 0 ? '+' : ''}{actualSpread.toFixed(1)}
                      </div>
                    )}
                  </div>

                  {/* Total Prediction */}
                  <div className={`rounded border p-3 ${
                    !isComplete ? 'bg-orange-50 border-orange-200' :
                    totalWin ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className={`w-4 h-4 ${
                        !isComplete ? 'text-orange-600' :
                        totalWin ? 'text-green-600' : 'text-red-600'
                      }`} />
                      <div className={`text-[10px] font-bold ${
                        !isComplete ? 'text-orange-700' :
                        totalWin ? 'text-green-700' : 'text-red-700'
                      }`}>
                        TOTAL (O/U) {isComplete && (totalWin ? '✓' : '✗')}
                      </div>
                    </div>
                    <div className="text-gray-900 font-bold text-lg">
                      {pred.predictedTotal.toFixed(1)} pts
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      Predicted total
                    </div>
                    {isComplete && (
                      <div className="text-gray-600 text-xs">
                        Actual: {actualTotal.toFixed(1)} pts
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
