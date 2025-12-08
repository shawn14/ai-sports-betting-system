'use client';

import { useEffect, useState } from 'react';
import LoggedInHeader from '@/components/LoggedInHeader';
import { TrendingUp, CheckCircle, XCircle, Target, Filter } from 'lucide-react';

interface PredictionResult {
  week: number;
  homeTeam: string;
  awayTeam: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number;
  actualAwayScore: number;
  predictedWinner: string;
  actualWinner: string;
  correct: boolean;
  predictedSpread: number;
  actualSpread: number;
  spreadError: number;
  predictedTotal: number;
  actualTotal: number;
  totalError: number;
  confidence: number;
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      // Try loading from Firebase first
      console.log('Checking Firebase for cached predictions...');
      const cachedResponse = await fetch('/api/predictions/cached');

      if (cachedResponse.ok) {
        const cachedData = await cachedResponse.json();
        if (cachedData.predictions && cachedData.predictions.length > 0) {
          console.log(`Loaded ${cachedData.predictions.length} predictions from Firebase cache`);
          setPredictions(cachedData.predictions);
          setLoading(false);
          return;
        }
      }

      // Fall back to JSON file
      console.log('Loading predictions from JSON file...');
      const response = await fetch('/training/backtest_results_2025.json');
      const data = await response.json();

      const formattedPredictions: PredictionResult[] = data.allResults.map((result: any) => {
        const predictedWinner = result.predictedHome > result.predictedAway ? result.homeTeam : result.awayTeam;
        const actualWinner = result.actualHome > result.actualAway ? result.homeTeam : result.awayTeam;

        return {
          week: result.week,
          homeTeam: result.homeTeam,
          awayTeam: result.awayTeam,
          predictedHomeScore: result.predictedHome,
          predictedAwayScore: result.predictedAway,
          actualHomeScore: result.actualHome,
          actualAwayScore: result.actualAway,
          predictedWinner,
          actualWinner,
          correct: result.winnerCorrect,
          predictedSpread: result.predictedSpread,
          actualSpread: result.actualSpread,
          spreadError: result.spreadError,
          predictedTotal: result.predictedTotal,
          actualTotal: result.actualTotal,
          totalError: result.totalError,
          confidence: result.confidence
        };
      });

      setPredictions(formattedPredictions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading predictions:', error);
      setLoading(false);
    }
  };

  const filteredPredictions = predictions.filter(pred => {
    if (selectedWeek !== 'all' && pred.week !== selectedWeek) return false;
    if (filterType === 'correct' && !pred.correct) return false;
    if (filterType === 'incorrect' && pred.correct) return false;
    return true;
  });

  const weeks = Array.from(new Set(predictions.map(p => p.week))).sort((a, b) => a - b);

  const syncToFirebase = async () => {
    setSyncing(true);
    setSyncStatus('Syncing predictions to Firebase...');

    try {
      const response = await fetch('/api/predictions/sync', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setSyncStatus(`✅ Successfully synced ${data.count} predictions!`);
        // Reload predictions from Firebase
        setTimeout(() => {
          loadPredictions();
          setSyncStatus(null);
        }, 2000);
      } else {
        setSyncStatus(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setSyncStatus(`❌ Error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const stats = {
    total: filteredPredictions.length,
    correct: filteredPredictions.filter(p => p.correct).length,
    accuracy: filteredPredictions.length > 0
      ? (filteredPredictions.filter(p => p.correct).length / filteredPredictions.length * 100).toFixed(1)
      : '0.0',
    avgSpreadError: filteredPredictions.length > 0
      ? (filteredPredictions.reduce((sum, p) => sum + p.spreadError, 0) / filteredPredictions.length).toFixed(1)
      : '0.0',
    avgTotalError: filteredPredictions.length > 0
      ? (filteredPredictions.reduce((sum, p) => sum + p.totalError, 0) / filteredPredictions.length).toFixed(1)
      : '0.0'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <LoggedInHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading predictions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <LoggedInHeader />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Target className="w-10 h-10 text-blue-400" />
            All Predictions
          </h1>
          <p className="text-slate-300 text-lg">
            2025 Season • Weeks 2-14 • {predictions.length} Games
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-sm">Games</div>
          </div>
          <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/50">
            <div className="text-2xl font-bold text-green-400">{stats.correct}</div>
            <div className="text-slate-400 text-sm">Correct</div>
          </div>
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50">
            <div className="text-2xl font-bold text-blue-400">{stats.accuracy}%</div>
            <div className="text-slate-400 text-sm">Accuracy</div>
          </div>
          <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50">
            <div className="text-2xl font-bold text-purple-400">±{stats.avgSpreadError}</div>
            <div className="text-slate-400 text-sm">Avg Spread Error</div>
          </div>
          <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-700/50">
            <div className="text-2xl font-bold text-orange-400">±{stats.avgTotalError}</div>
            <div className="text-slate-400 text-sm">Avg Total Error</div>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mb-4">
            <p className="text-blue-300 text-sm">{syncStatus}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <span className="text-white font-semibold">Filters</span>
            </div>
            <button
              onClick={syncToFirebase}
              disabled={syncing}
              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded transition"
            >
              {syncing ? 'Syncing...' : '🔄 Sync to Firebase'}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Week Filter */}
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Week</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600"
              >
                <option value="all">All Weeks</option>
                {weeks.map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
            </div>

            {/* Result Filter */}
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Result</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-slate-700 text-white rounded px-3 py-2 text-sm border border-slate-600"
              >
                <option value="all">All Results</option>
                <option value="correct">Correct Only</option>
                <option value="incorrect">Incorrect Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Predictions List */}
        <div className="space-y-3">
          {filteredPredictions.map((pred, idx) => (
            <div
              key={idx}
              className={`bg-slate-800/50 rounded-lg p-4 border ${
                pred.correct ? 'border-green-700/50' : 'border-red-700/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    pred.correct ? 'bg-green-900/30' : 'bg-red-900/30'
                  }`}>
                    {pred.correct ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-lg">
                      {pred.awayTeam} @ {pred.homeTeam}
                    </div>
                    <div className="text-slate-400 text-sm">Week {pred.week}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${pred.correct ? 'text-green-400' : 'text-red-400'}`}>
                    {pred.correct ? 'CORRECT' : 'INCORRECT'}
                  </div>
                  <div className="text-slate-400 text-xs">{pred.confidence}% confidence</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Moneyline */}
                <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/30">
                  <div className="text-blue-300 text-xs font-semibold mb-2">MONEYLINE (WINNER)</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Predicted:</span>
                      <span className="text-white font-semibold">{pred.predictedWinner}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Actual:</span>
                      <span className="text-white font-semibold">{pred.actualWinner}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Score:</span>
                      <span className="text-white">{pred.actualAwayScore}-{pred.actualHomeScore}</span>
                    </div>
                  </div>
                </div>

                {/* Spread */}
                <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-700/30">
                  <div className="text-purple-300 text-xs font-semibold mb-2">SPREAD</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Predicted:</span>
                      <span className="text-white font-semibold">{pred.predictedSpread > 0 ? '+' : ''}{pred.predictedSpread.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Actual:</span>
                      <span className="text-white font-semibold">{pred.actualSpread > 0 ? '+' : ''}{pred.actualSpread.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Error:</span>
                      <span className={`font-semibold ${
                        pred.spreadError <= 3 ? 'text-green-400' :
                        pred.spreadError <= 7 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        ±{pred.spreadError.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-orange-900/20 rounded-lg p-3 border border-orange-700/30">
                  <div className="text-orange-300 text-xs font-semibold mb-2">TOTAL (O/U)</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Predicted:</span>
                      <span className="text-white font-semibold">{pred.predictedTotal.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Actual:</span>
                      <span className="text-white font-semibold">{pred.actualTotal.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Error:</span>
                      <span className={`font-semibold ${
                        pred.totalError <= 3 ? 'text-green-400' :
                        pred.totalError <= 7 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        ±{pred.totalError.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPredictions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No predictions match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
