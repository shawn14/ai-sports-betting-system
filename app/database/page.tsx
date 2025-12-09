'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FirestoreService } from '@/lib/firebase/firestore';
import AILoadingAnimation from '@/components/AILoadingAnimation';
import { Database, Trophy, TrendingUp, BarChart3, Trash2, RefreshCw, Activity, Eye } from 'lucide-react';

export default function DatabasePage() {
  const [stats, setStats] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      setLoading(true);

      // Get performance stats
      const performanceStats = await FirestoreService.getPerformanceStats();
      setStats(performanceStats);

      // Get recent predictions
      const recentPreds = await FirestoreService.getPredictionsByWeek(2024, 14);
      setPredictions(recentPreds.slice(0, 10));

      // Get recent results
      const recentResults = await FirestoreService.getAllResults();
      setResults(recentResults.slice(0, 10));

      console.log('Database stats loaded');
    } catch (error) {
      console.error('Error loading database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (confirm('Delete betting lines older than 90 days?')) {
      try {
        await FirestoreService.cleanupOldData(90);
        alert('Cleanup complete!');
        loadDatabaseStats();
      } catch (error) {
        console.error('Error during cleanup:', error);
        alert('Cleanup failed');
      }
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center">
                <Database className="w-10 h-10 mr-3" />
                Database Dashboard
              </h1>
              <p className="text-slate-400 mt-2">
                View and manage your stored predictions and results
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadDatabaseStats}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={handleCleanup}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cleanup Old Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            <Link href="/games" className="text-slate-400 hover:text-white transition pb-1">
              Games
            </Link>
            <Link href="/predictions" className="text-slate-400 hover:text-white transition pb-1">
              Predictions
            </Link>
            <Link href="/rankings" className="text-slate-400 hover:text-white transition pb-1">
              Rankings
            </Link>
            <Link href="/analytics" className="text-slate-400 hover:text-white transition pb-1">
              Analytics
            </Link>
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition pb-1">
              Dashboard
            </Link>
            <Link href="/backtest" className="text-slate-400 hover:text-white transition pb-1">
              Backtest
            </Link>
            <Link href="/database" className="text-white font-semibold border-b-2 border-blue-500 pb-1">
              Database
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <AILoadingAnimation
            title="DATABASE ENGINE ACTIVE"
            subtitle="Querying prediction and performance data..."
            steps={[
              { label: 'Connecting to Firestore', icon: Database, delay: 0 },
              { label: 'Loading cached predictions', icon: Activity, delay: 200 },
              { label: 'Fetching performance results', icon: BarChart3, delay: 400 },
              { label: 'Counting total records', icon: Trophy, delay: 600 },
              { label: 'Analyzing data patterns', icon: Eye, delay: 800 },
              { label: 'Compiling statistics', icon: TrendingUp, delay: 1000 },
            ]}
          />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">Total Games</h3>
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-4xl font-bold text-white">{stats?.totalGames || 0}</p>
                <p className="text-slate-400 text-sm mt-1">Stored in database</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">Accuracy</h3>
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-4xl font-bold text-green-400">
                  {stats?.accuracy ? stats.accuracy.toFixed(1) : '0.0'}%
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {stats?.correctPredictions || 0} correct predictions
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">Avg Confidence</h3>
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-4xl font-bold text-blue-400">
                  {stats?.avgConfidence ? stats.avgConfidence.toFixed(1) : '0.0'}%
                </p>
                <p className="text-slate-400 text-sm mt-1">Model confidence</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">Predictions</h3>
                  <Database className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-4xl font-bold text-white">{predictions.length}</p>
                <p className="text-slate-400 text-sm mt-1">Recent predictions</p>
              </div>
            </div>

            {/* Recent Predictions */}
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
              <h3 className="text-white font-semibold mb-4">Recent Predictions</h3>
              {predictions.length > 0 ? (
                <div className="space-y-3">
                  {predictions.map((pred, idx) => (
                    <div key={idx} className="bg-slate-900 rounded p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">
                            Week {pred.week} - Season {pred.season}
                          </div>
                          <div className="text-slate-400 text-sm">
                            Predicted: {pred.predictedScore?.away || '?'} - {pred.predictedScore?.home || '?'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold">
                            {pred.confidence}% confidence
                          </div>
                          <div className={`text-sm ${
                            pred.recommendation === 'strong_bet' ? 'text-green-400' :
                            pred.recommendation === 'value_bet' ? 'text-blue-400' :
                            pred.recommendation === 'avoid' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {pred.recommendation?.toUpperCase().replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No predictions stored yet</p>
              )}
            </div>

            {/* Recent Results */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">Recent Results</h3>
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((result, idx) => (
                    <div key={idx} className="bg-slate-900 rounded p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">
                            Week {result.week} - Season {result.season}
                          </div>
                          <div className="text-slate-400 text-sm">
                            Predicted: {result.prediction?.predictedScore?.away || '?'} - {result.prediction?.predictedScore?.home || '?'}
                            {' | '}
                            Actual: {result.actualScore?.away || '?'} - {result.actualScore?.home || '?'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            result.outcomes?.predictedWinnerCorrect ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {result.outcomes?.predictedWinnerCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
                          </div>
                          <div className="text-slate-400 text-sm">
                            {result.prediction?.confidence}% confidence
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No results stored yet</p>
              )}
            </div>

            {/* Firebase Info */}
            <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-6">
              <h3 className="text-blue-400 font-semibold mb-3">Firebase Firestore</h3>
              <div className="text-slate-300 space-y-2 text-sm">
                <p>✓ Connected to: <strong>betanalytics-f095a</strong></p>
                <p>✓ Collections: games, predictions, betting_lines, results, bets</p>
                <p>✓ Auto-saving: Predictions page saves automatically</p>
                <p>✓ Backtest: Saves results to database</p>
                <p className="pt-2 text-slate-400">
                  View your data in Firebase Console:{' '}
                  <a
                    href="https://console.firebase.google.com/u/0/project/betanalytics-f095a/firestore/databases/-default-/data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Open Firestore
                  </a>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
