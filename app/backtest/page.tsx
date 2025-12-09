'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NFLAPI } from '@/lib/api/nfl';
import { MatrixHelperClient } from '@/lib/models/matrixHelperClient';
import { PredictionAnalytics, PredictionResult } from '@/lib/models/analytics';
import { FirestoreService } from '@/lib/firebase/firestore';
import AILoadingAnimation from '@/components/AILoadingAnimation';
import { format } from 'date-fns';
import { Trophy, XCircle, TrendingUp, TrendingDown, BarChart3, Database, Brain, Activity } from 'lucide-react';

export default function BacktestPage() {
  const [season, setSeason] = useState(2024);
  const [startWeek, setStartWeek] = useState(1);
  const [endWeek, setEndWeek] = useState(14);
  const [results, setResults] = useState<PredictionResult[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analytics] = useState(() => new PredictionAnalytics());

  const runBacktest = async () => {
    try {
      setLoading(true);
      setResults([]);
      analytics.clearResults();

      console.log(`Running backtest for ${season} weeks ${startWeek}-${endWeek}...`);

      const allResults: PredictionResult[] = [];

      // Loop through each week
      for (let week = startWeek; week <= endWeek; week++) {
        console.log(`Loading week ${week}...`);

        try {
          // Check if standings data exists for this week
          const hasStandings = await MatrixHelperClient.hasStandingsData(season, week);
          if (!hasStandings) {
            console.warn(`⚠️  Missing standings data for ${season} week ${week}. Skipping this week.`);
            continue;
          }

          const weekGames = await NFLAPI.getWeekGames(season, week);
          const completedGames = weekGames.filter(g => g.status === 'completed');

          console.log(`Week ${week}: Found ${completedGames.length} completed games`);

          for (const game of completedGames) {
            try {
              // Generate prediction using Matrix system
              const prediction = await MatrixHelperClient.predictGame(
                game,
                season,
                week,
                'balanced'
              );

              // Calculate result
              const result = PredictionAnalytics.calculateResult(game, prediction);
              allResults.push(result);
              analytics.addResult(result);

              // Save to Firebase
              try {
                await FirestoreService.saveGame(game);
                await FirestoreService.savePrediction(prediction);
                await FirestoreService.saveResult(result);
              } catch (fbError) {
                console.error('Error saving to Firebase:', fbError);
              }

              console.log(`  ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}: Predicted ${prediction.predictedScore.away}-${prediction.predictedScore.home}, Actual ${game.awayScore}-${game.homeScore}`);
            } catch (error) {
              console.error(`Error processing game ${game.id}:`, error);
            }
          }

          // Update UI after each week
          setResults([...allResults]);
          setPerformance(analytics.getPerformance());

        } catch (error) {
          console.error(`Error loading week ${week}:`, error);
        }
      }

      console.log(`Backtest complete! Analyzed ${allResults.length} games`);
      setPerformance(analytics.getPerformance());

    } catch (error) {
      console.error('Error running backtest:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 60) return 'text-green-400';
    if (accuracy >= 52) return 'text-blue-400';
    if (accuracy >= 45) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-400';
    if (profit < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-white">Backtest System</h1>
          <p className="text-slate-400 mt-2">
            Test predictions against historical games to validate model accuracy
          </p>
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
            <Link href="/backtest" className="text-white font-semibold border-b-2 border-blue-500 pb-1">
              Backtest
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Backtest Configuration */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-white font-semibold mb-4">Configure Backtest</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-slate-400 text-sm block mb-2">Season</label>
              <select
                value={season}
                onChange={(e) => setSeason(parseInt(e.target.value))}
                className="w-full bg-slate-900 text-white rounded px-3 py-2 border border-slate-700"
              >
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
                <option value={2022}>2022</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-2">Start Week</label>
              <input
                type="number"
                min="1"
                max="18"
                value={startWeek}
                onChange={(e) => setStartWeek(parseInt(e.target.value))}
                className="w-full bg-slate-900 text-white rounded px-3 py-2 border border-slate-700"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-2">End Week</label>
              <input
                type="number"
                min="1"
                max="18"
                value={endWeek}
                onChange={(e) => setEndWeek(parseInt(e.target.value))}
                className="w-full bg-slate-900 text-white rounded px-3 py-2 border border-slate-700"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={runBacktest}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg transition"
              >
                {loading ? 'Running...' : 'Run Backtest'}
              </button>
            </div>
          </div>
          <p className="text-slate-500 text-sm">
            This will analyze all completed games in the selected range and show how the model would have performed.
          </p>
        </div>

        {loading && (
          <AILoadingAnimation
            title="BACKTEST ENGINE RUNNING"
            subtitle={`Analyzing historical games... ${results.length} processed so far`}
            steps={[
              { label: 'Loading historical game data', icon: Database, delay: 0 },
              { label: 'Running ML predictions', icon: Brain, delay: 200 },
              { label: 'Comparing to actual results', icon: BarChart3, delay: 400 },
              { label: 'Calculating win rates', icon: Trophy, delay: 600 },
              { label: 'Computing performance metrics', icon: Activity, delay: 800 },
              { label: 'Generating backtest report', icon: TrendingUp, delay: 1000 },
            ]}
          />
        )}

        {/* Performance Summary */}
        {performance && performance.totalGames > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">Games Analyzed</h3>
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-4xl font-bold text-white">{performance.totalGames}</p>
                <p className="text-slate-400 text-sm mt-1">
                  Weeks {startWeek}-{endWeek}
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">Winner Accuracy</h3>
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <p className={`text-4xl font-bold ${getAccuracyColor(performance.winnerPredictions.accuracy)}`}>
                  {performance.winnerPredictions.accuracy.toFixed(1)}%
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {performance.winnerPredictions.correct}W - {performance.winnerPredictions.incorrect}L
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">ATS Record</h3>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className={`text-4xl font-bold ${getAccuracyColor(performance.spreadPredictions.accuracy)}`}>
                  {performance.spreadPredictions.accuracy.toFixed(1)}%
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {performance.spreadPredictions.wins}-{performance.spreadPredictions.losses}-{performance.spreadPredictions.pushes}
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">Profit/Loss</h3>
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <p className={`text-4xl font-bold ${getProfitColor(performance.profitability.units)}`}>
                  {performance.profitability.units > 0 ? '+' : ''}{performance.profitability.units.toFixed(1)}
                </p>
                <p className="text-slate-400 text-sm mt-1">Units</p>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">
                All Results ({results.length} games)
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {results.map((result, idx) => (
                  <div key={idx} className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold">
                          {result.game.awayTeam.abbreviation} @ {result.game.homeTeam.abbreviation}
                        </h4>
                        <p className="text-slate-400 text-sm">
                          Week {result.game.week} - {format(result.game.gameTime, 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {result.outcomes.predictedWinnerCorrect ? (
                          <Trophy className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {/* Predicted */}
                      <div>
                        <div className="text-slate-500 text-xs mb-1">PREDICTED</div>
                        <div className="text-white font-mono">
                          {result.prediction.predictedScore.away} - {result.prediction.predictedScore.home}
                        </div>
                      </div>

                      {/* Actual */}
                      <div>
                        <div className="text-slate-500 text-xs mb-1">ACTUAL</div>
                        <div className="text-white font-mono font-bold">
                          {result.actualScore.away} - {result.actualScore.home}
                        </div>
                      </div>

                      {/* Error */}
                      <div>
                        <div className="text-slate-500 text-xs mb-1">ERROR</div>
                        <div className={`font-mono ${
                          Math.abs(result.outcomes.scoreAccuracy.totalError) <= 3 ? 'text-green-400' :
                          Math.abs(result.outcomes.scoreAccuracy.totalError) <= 7 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          ±{Math.abs(result.outcomes.scoreAccuracy.totalError).toFixed(1)} pts
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <span className={result.outcomes.predictedWinnerCorrect ? 'text-green-400' : 'text-red-400'}>
                          Winner: {result.outcomes.predictedWinnerCorrect ? '✓' : '✗'}
                        </span>
                        <span className="text-slate-500">|</span>
                        <span className={result.outcomes.spreadCovered ? 'text-green-400' : 'text-red-400'}>
                          ATS: {result.outcomes.spreadCovered ? '✓' : '✗'}
                        </span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">
                          Confidence: {result.prediction.confidence}%
                        </span>
                      </div>
                      {result.profitLoss && (
                        <div className={getProfitColor(result.profitLoss.spread)}>
                          ${result.profitLoss.spread > 0 ? '+' : ''}{result.profitLoss.spread}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Instructions */}
        {!loading && results.length === 0 && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
            <h3 className="text-blue-400 font-semibold mb-3">How to Use Backtest</h3>
            <ol className="text-slate-300 space-y-2 text-sm list-decimal list-inside">
              <li>Select a season (2024, 2023, or 2022)</li>
              <li>Choose which weeks to analyze (e.g., weeks 1-10)</li>
              <li>Click &quot;Run Backtest&quot; to analyze all completed games</li>
              <li>Review prediction accuracy, ATS record, and profit/loss</li>
              <li>Examine individual game results to see where the model was right/wrong</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
              <p className="text-yellow-400 text-sm">
                <strong>Note:</strong> Backtesting uses historical data to simulate how the model would have performed.
                This helps validate the prediction algorithm before using it for live betting.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
