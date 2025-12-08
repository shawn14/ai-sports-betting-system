'use client';

import { useEffect, useState } from 'react';
import { NFLAPI } from '@/lib/api/nfl';
import { Game } from '@/types';
import AILoadingAnimation from '@/components/AILoadingAnimation';
import { Brain } from 'lucide-react';

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

export default function AIPredictionsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current week games
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      const weekGames = await NFLAPI.getWeekGames(season, week);
      const scheduledGames = weekGames.filter(g => g.status === 'scheduled');

      setGames(scheduledGames);

      // Call our HYBRID prediction API (Matrix + AI + Web Search)
      const response = await fetch('/api/hybrid-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          games: scheduledGames,
          season,
          week
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI predictions');
      }

      const data = await response.json();
      setPredictions(data.predictions);
    } catch (err) {
      console.error('Error loading predictions:', err);
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
          <p className="text-white mt-4">Matrix calculating + AI analyzing with web search...</p>
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
            onClick={loadPredictions}
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
            <h1 className="text-3xl font-bold text-white">AI-Powered Matrix Predictions</h1>
            <p className="text-slate-400">Claude analyzing games with the Matrix formula</p>
          </div>
        </div>

        <div className="space-y-6">
          {predictions.map((pred) => (
            <div
              key={pred.gameId}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {pred.awayTeam} @ {pred.homeTeam}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {games.find(g => g.id === pred.gameId)?.gameTime && (
                      <span className="mr-3">
                        {new Date(games.find(g => g.id === pred.gameId)!.gameTime).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZoneName: 'short'
                        })}
                      </span>
                    )}
                    Confidence: {pred.confidence}%
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">
                    {pred.predictedScore.home} - {pred.predictedScore.away}
                  </div>
                  <div className="text-sm text-slate-400">
                    Spread: {pred.predictedSpread > 0 ? '+' : ''}{pred.predictedSpread.toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-400">
                    Total: {pred.predictedTotal.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 mb-3">
                <h4 className="text-sm font-semibold text-blue-300 mb-2">Claude's Analysis:</h4>
                <p className="text-slate-300 text-sm whitespace-pre-line">{pred.reasoning}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  pred.recommendation === 'STRONG BET' ? 'bg-green-900/50 text-green-300' :
                  pred.recommendation === 'GOOD BET' ? 'bg-blue-900/50 text-blue-300' :
                  pred.recommendation === 'SLIGHT EDGE' ? 'bg-yellow-900/50 text-yellow-300' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {pred.recommendation}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={loadPredictions}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            Regenerate Predictions
          </button>
        </div>
      </div>
    </div>
  );
}
