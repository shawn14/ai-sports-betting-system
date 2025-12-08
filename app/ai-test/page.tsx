'use client';

import { useEffect, useState } from 'react';
import { NFLAPI } from '@/lib/api/nfl';
import { Game } from '@/types';
import AILoadingAnimation from '@/components/AILoadingAnimation';
import { Brain, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

interface AIPrediction {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  predictedSpread: number;
  predictedTotal: number;
  predictedScore: {
    home: number;
    away: number;
  };
  confidence: number;
  reasoning: string;
  recommendation: string;
}

interface GameComparison {
  game: Game;
  prediction: AIPrediction;
  actualScore: {
    home: number;
    away: number;
  };
  actualSpread: number;
  actualTotal: number;
  spreadError: number;
  totalError: number;
  predictedWinnerCorrect: boolean;
}

export default function AITestPage() {
  const [comparisons, setComparisons] = useState<GameComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    winnerCorrect: 0,
    avgSpreadError: 0,
    avgTotalError: 0
  });

  useEffect(() => {
    testPredictions();
  }, []);

  const testPredictions = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching Week 15 games (completed)...');

      // Get Week 15 2024 games (should be completed)
      const weekGames = await NFLAPI.getWeekGames(2024, 15);
      const completedGames = weekGames.filter(g => g.status === 'completed');

      console.log(`Found ${completedGames.length} completed Week 15 games`);

      if (completedGames.length === 0) {
        setError('No completed games found for Week 15, 2024');
        setLoading(false);
        return;
      }

      // Call our AI prediction API with Week 14 standings (before Week 15 was played)
      console.log('Generating AI predictions using Week 14 standings...');
      const response = await fetch('/api/ai-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          games: completedGames,
          season: 2024,
          week: 14 // Use Week 14 standings to predict Week 15 games
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI predictions');
      }

      const data = await response.json();
      const predictions: AIPrediction[] = data.predictions;

      console.log(`Generated ${predictions.length} predictions`);
      console.log('Sample prediction:', predictions[0]);

      // Compare predictions to actual results
      const comparisons: GameComparison[] = completedGames.map(game => {
        const prediction = predictions.find(p => p.gameId === game.id);

        if (!prediction) {
          console.warn(`No prediction found for game ${game.id}`);
          return null;
        }

        const actualHome = game.homeScore || 0;
        const actualAway = game.awayScore || 0;
        const actualSpread = actualHome - actualAway;
        const actualTotal = actualHome + actualAway;

        const spreadError = Math.abs((prediction.predictedSpread || 0) - actualSpread);
        const totalError = Math.abs((prediction.predictedTotal || 0) - actualTotal);

        const predictedWinner = prediction.predictedScore.home > prediction.predictedScore.away ? 'home' : 'away';
        const actualWinner = actualHome > actualAway ? 'home' : 'away';
        const predictedWinnerCorrect = predictedWinner === actualWinner;

        return {
          game,
          prediction,
          actualScore: { home: actualHome, away: actualAway },
          actualSpread,
          actualTotal,
          spreadError,
          totalError,
          predictedWinnerCorrect
        };
      }).filter(c => c !== null) as GameComparison[];

      setComparisons(comparisons);

      // Calculate stats
      const total = comparisons.length;
      const winnerCorrect = comparisons.filter(c => c.predictedWinnerCorrect).length;
      const avgSpreadError = comparisons.reduce((sum, c) => sum + c.spreadError, 0) / total;
      const avgTotalError = comparisons.reduce((sum, c) => sum + c.totalError, 0) / total;

      setStats({ total, winnerCorrect, avgSpreadError, avgTotalError });

    } catch (err) {
      console.error('Error testing predictions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AILoadingAnimation />
          <p className="text-white mt-4">Testing AI predictions on Week 15 games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p>{error}</p>
          <button
            onClick={testPredictions}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Brain className="h-10 w-10 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">AI Prediction Test Results</h1>
            <p className="text-slate-400">Week 15, 2024 - Predictions vs Actual Results</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">Games Analyzed</div>
            <div className="text-4xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">Winner Accuracy</div>
            <div className="text-4xl font-bold text-green-400">
              {stats.total > 0 ? ((stats.winnerCorrect / stats.total) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-slate-500 text-sm mt-1">
              {stats.winnerCorrect}W - {stats.total - stats.winnerCorrect}L
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">Avg Spread Error</div>
            <div className="text-4xl font-bold text-blue-400">
              ±{stats.avgSpreadError.toFixed(1)}
            </div>
            <div className="text-slate-500 text-sm mt-1">points</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">Avg Total Error</div>
            <div className="text-4xl font-bold text-purple-400">
              ±{stats.avgTotalError.toFixed(1)}
            </div>
            <div className="text-slate-500 text-sm mt-1">points</div>
          </div>
        </div>

        {/* Game Comparisons */}
        <div className="space-y-6">
          {comparisons.map((comp) => (
            <div
              key={comp.game.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {comp.game.awayTeam.abbreviation} @ {comp.game.homeTeam.abbreviation}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {new Date(comp.game.gameTime).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {comp.predictedWinnerCorrect ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                  <span className={`font-semibold ${comp.predictedWinnerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {comp.predictedWinnerCorrect ? 'CORRECT' : 'INCORRECT'}
                  </span>
                </div>
              </div>

              {/* Score Comparison */}
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-blue-300 text-sm font-semibold mb-2">AI PREDICTED</div>
                  <div className="text-3xl font-bold text-white">
                    {comp.prediction.predictedScore.away} - {comp.prediction.predictedScore.home}
                  </div>
                  <div className="text-slate-400 text-sm mt-2">
                    Spread: {comp.prediction.predictedSpread > 0 ? '+' : ''}{comp.prediction.predictedSpread?.toFixed(1) || 'N/A'} |
                    Total: {comp.prediction.predictedTotal?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-slate-500 text-sm mt-1">
                    Confidence: {comp.prediction.confidence || 0}%
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-green-300 text-sm font-semibold mb-2">ACTUAL RESULT</div>
                  <div className="text-3xl font-bold text-white">
                    {comp.actualScore.away} - {comp.actualScore.home}
                  </div>
                  <div className="text-slate-400 text-sm mt-2">
                    Spread: {comp.actualSpread > 0 ? '+' : ''}{comp.actualSpread.toFixed(1)} |
                    Total: {comp.actualTotal.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Error Analysis */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                  <div className="text-red-300 text-xs font-semibold mb-1">SPREAD ERROR</div>
                  <div className={`text-2xl font-bold ${
                    comp.spreadError <= 3 ? 'text-green-400' :
                    comp.spreadError <= 7 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    ±{comp.spreadError.toFixed(1)} pts
                  </div>
                </div>

                <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
                  <div className="text-purple-300 text-xs font-semibold mb-1">TOTAL ERROR</div>
                  <div className={`text-2xl font-bold ${
                    comp.totalError <= 3 ? 'text-green-400' :
                    comp.totalError <= 7 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    ±{comp.totalError.toFixed(1)} pts
                  </div>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="bg-slate-900/30 rounded-lg p-3">
                <div className="text-slate-400 text-xs font-semibold mb-1">AI REASONING</div>
                <p className="text-slate-300 text-sm">{comp.prediction.reasoning}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={testPredictions}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            Re-run Test
          </button>
        </div>
      </div>
    </div>
  );
}
