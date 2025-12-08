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
      // Load from JSON file directly
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
              <h1 className="text-lg font-bold text-gray-900">PREDICTIONS</h1>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>2025 Season</span>
                <span>•</span>
                <span>{predictions.length} Games</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-gray-600 text-xs">Games</div>
          </div>
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="text-xl font-bold text-green-600">{stats.correct}</div>
            <div className="text-gray-600 text-xs">Correct</div>
          </div>
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="text-xl font-bold text-blue-600">{stats.accuracy}%</div>
            <div className="text-gray-600 text-xs">Accuracy</div>
          </div>
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="text-xl font-bold text-purple-600">±{stats.avgSpreadError}</div>
            <div className="text-gray-600 text-xs">Avg Spread Error</div>
          </div>
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="text-xl font-bold text-orange-600">±{stats.avgTotalError}</div>
            <div className="text-gray-600 text-xs">Avg Total Error</div>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-blue-700 text-xs">{syncStatus}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded border border-gray-200 p-3 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-gray-900 font-semibold text-sm">Filters</span>
            </div>
            <button
              onClick={syncToFirebase}
              disabled={syncing}
              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded transition"
            >
              {syncing ? 'Syncing...' : 'Sync to Firebase'}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Week Filter */}
            <div>
              <label className="text-gray-600 text-xs mb-1 block">Week</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="bg-white text-gray-900 rounded px-3 py-1.5 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Weeks</option>
                {weeks.map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
            </div>

            {/* Result Filter */}
            <div>
              <label className="text-gray-600 text-xs mb-1 block">Result</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-white text-gray-900 rounded px-3 py-1.5 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Results</option>
                <option value="correct">Correct Only</option>
                <option value="incorrect">Incorrect Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Predictions List */}
        <div className="space-y-2">
          {filteredPredictions.map((pred, idx) => (
            <div
              key={idx}
              className={`bg-white rounded border p-3 ${
                pred.correct ? 'border-green-200' : 'border-red-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    pred.correct ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {pred.correct ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-gray-900 font-bold text-sm">
                      {pred.awayTeam} @ {pred.homeTeam}
                    </div>
                    <div className="text-gray-600 text-[11px]">Week {pred.week}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[11px] font-semibold ${pred.correct ? 'text-green-600' : 'text-red-600'}`}>
                    {pred.correct ? 'CORRECT' : 'INCORRECT'}
                  </div>
                  <div className="text-gray-600 text-[10px]">{pred.confidence}% confidence</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Moneyline */}
                <div className="bg-blue-50 rounded border border-blue-200 p-2">
                  <div className="text-blue-700 text-[10px] font-semibold mb-2">MONEYLINE (WINNER)</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Predicted:</span>
                      <span className="text-gray-900 font-semibold">{pred.predictedWinner}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Actual:</span>
                      <span className="text-gray-900 font-semibold">{pred.actualWinner}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Score:</span>
                      <span className="text-gray-900">{pred.actualAwayScore}-{pred.actualHomeScore}</span>
                    </div>
                  </div>
                </div>

                {/* Spread */}
                <div className="bg-purple-50 rounded border border-purple-200 p-2">
                  <div className="text-purple-700 text-[10px] font-semibold mb-2">SPREAD</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Predicted:</span>
                      <span className="text-gray-900 font-semibold">{pred.predictedSpread > 0 ? '+' : ''}{pred.predictedSpread.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Actual:</span>
                      <span className="text-gray-900 font-semibold">{pred.actualSpread > 0 ? '+' : ''}{pred.actualSpread.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Error:</span>
                      <span className={`font-semibold ${
                        pred.spreadError <= 3 ? 'text-green-600' :
                        pred.spreadError <= 7 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        ±{pred.spreadError.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-orange-50 rounded border border-orange-200 p-2">
                  <div className="text-orange-700 text-[10px] font-semibold mb-2">TOTAL (O/U)</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Predicted:</span>
                      <span className="text-gray-900 font-semibold">{pred.predictedTotal.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Actual:</span>
                      <span className="text-gray-900 font-semibold">{pred.actualTotal.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Error:</span>
                      <span className={`font-semibold ${
                        pred.totalError <= 3 ? 'text-green-600' :
                        pred.totalError <= 7 ? 'text-yellow-600' : 'text-red-600'
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
            <p className="text-gray-500 text-sm">No predictions match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
