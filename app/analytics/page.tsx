'use client';

import LoggedInHeader from '@/components/LoggedInHeader';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NFLAPI } from '@/lib/api/nfl';
import { GamePredictor } from '@/lib/models/predictor';
import { PredictionAnalytics, PredictionResult, ModelPerformance } from '@/lib/models/analytics';
import { Game } from '@/types';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Target, Trophy, XCircle, DollarSign, Percent, BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  const [performance, setPerformance] = useState<ModelPerformance | null>(null);
  const [recentResults, setRecentResults] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [analytics] = useState(() => new PredictionAnalytics());

  useEffect(() => {
    loadAnalytics();
  }, [selectedWeek]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { season } = await NFLAPI.getCurrentSeasonWeek();

      // Load completed games from multiple weeks
      const results: PredictionResult[] = [];

      for (let week = 1; week <= selectedWeek; week++) {
        const weekGames = await NFLAPI.getWeekGames(season, week);
        const completedGames = weekGames.filter(g => g.status === 'completed');

        for (const game of completedGames) {
          // Get team stats
          const homeStats = await NFLAPI.getTeamStats(game.homeTeam.id);
          const awayStats = await NFLAPI.getTeamStats(game.awayTeam.id);

          // Generate prediction (what we would have predicted)
          const prediction = await GamePredictor.predictGame(
            game,
            homeStats,
            awayStats,
            null
          );

          // Calculate result
          const result = PredictionAnalytics.calculateResult(game, prediction);
          results.push(result);
          analytics.addResult(result);
        }
      }

      setRecentResults(results.slice(-10).reverse());
      setPerformance(analytics.getPerformance());
    } catch (error) {
      console.error('Error loading analytics:', error);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <LoggedInHeader />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-white mb-2">Model Performance Analytics</h1>
          <p className="text-slate-400">
            Track prediction accuracy and compare predicted vs actual results
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-400 mt-4">Analyzing prediction performance...</p>
          </div>
        ) : performance ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Games */}
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">Total Games</h3>
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-4xl font-bold text-white">{performance.totalGames}</p>
                <p className="text-slate-400 text-sm mt-1">Analyzed</p>
              </div>

              {/* Winner Accuracy */}
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

              {/* Spread Accuracy */}
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">ATS Record</h3>
                  <Target className="w-5 h-5 text-green-400" />
                </div>
                <p className={`text-4xl font-bold ${getAccuracyColor(performance.spreadPredictions.accuracy)}`}>
                  {performance.spreadPredictions.accuracy.toFixed(1)}%
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {performance.spreadPredictions.wins}-{performance.spreadPredictions.losses}-{performance.spreadPredictions.pushes}
                </p>
              </div>

              {/* ROI */}
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm font-semibold">ROI</h3>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <p className={`text-4xl font-bold ${getProfitColor(performance.profitability.roi)}`}>
                  {performance.profitability.roi > 0 ? '+' : ''}{performance.profitability.roi.toFixed(1)}%
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {performance.profitability.units > 0 ? '+' : ''}{performance.profitability.units.toFixed(1)} units
                </p>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Score Accuracy */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <Percent className="w-5 h-5 mr-2" />
                  Score Prediction Accuracy
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Avg Home Team Error</span>
                    <span className="text-white font-mono">
                      ±{performance.scoreAccuracy.avgHomeError.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Avg Away Team Error</span>
                    <span className="text-white font-mono">
                      ±{performance.scoreAccuracy.avgAwayError.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Avg Total Error</span>
                    <span className="text-white font-mono">
                      ±{performance.scoreAccuracy.avgTotalError.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                    <span className="text-slate-400">Median Home Error</span>
                    <span className="text-white font-mono">
                      ±{performance.scoreAccuracy.medianHomeError.toFixed(1)} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Median Away Error</span>
                    <span className="text-white font-mono">
                      ±{performance.scoreAccuracy.medianAwayError.toFixed(1)} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Confidence Breakdown */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4">Confidence Level Performance</h3>
                <div className="space-y-3">
                  {performance.confidenceBreakdown.map((cb, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400">{cb.range}</span>
                        <span className={`font-semibold ${getAccuracyColor(cb.accuracy)}`}>
                          {cb.accuracy.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            cb.accuracy >= 60 ? 'bg-green-500' :
                            cb.accuracy >= 52 ? 'bg-blue-500' :
                            cb.accuracy >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${cb.accuracy}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-500 text-xs">{cb.games} games</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Profitability Breakdown */}
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Profitability Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-1">Spread Bets</div>
                  <div className={`text-3xl font-bold ${getProfitColor(performance.profitability.spreadProfit)}`}>
                    ${performance.profitability.spreadProfit > 0 ? '+' : ''}
                    {performance.profitability.spreadProfit.toFixed(0)}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    {performance.spreadPredictions.wins}W - {performance.spreadPredictions.losses}L
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-1">Moneyline Bets</div>
                  <div className={`text-3xl font-bold ${getProfitColor(performance.profitability.moneylineProfit)}`}>
                    ${performance.profitability.moneylineProfit > 0 ? '+' : ''}
                    {performance.profitability.moneylineProfit.toFixed(0)}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    {performance.winnerPredictions.correct}W - {performance.winnerPredictions.incorrect}L
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-1">Total Bets</div>
                  <div className={`text-3xl font-bold ${getProfitColor(performance.profitability.totalProfit)}`}>
                    ${performance.profitability.totalProfit > 0 ? '+' : ''}
                    {performance.profitability.totalProfit.toFixed(0)}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    {performance.totalPredictions.overs + performance.totalPredictions.unders} total
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Results */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">Recent Prediction Results</h3>
              <div className="space-y-4">
                {recentResults.map((result, idx) => (
                  <div key={idx} className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold">
                          {result.game.awayTeam.name} @ {result.game.homeTeam.name}
                        </h4>
                        <p className="text-slate-400 text-sm">
                          {format(result.game.gameTime, 'MMM d, yyyy')} - Week {result.game.week}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {result.outcomes.predictedWinnerCorrect ? (
                          <Trophy className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`text-sm font-semibold ${
                          result.outcomes.predictedWinnerCorrect ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {result.outcomes.predictedWinnerCorrect ? 'CORRECT' : 'INCORRECT'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Predicted */}
                      <div>
                        <div className="text-slate-400 text-xs mb-1">PREDICTED</div>
                        <div className="bg-slate-800 rounded p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-300 text-sm">{result.game.awayTeam.abbreviation}</span>
                            <span className="text-white font-bold">{result.prediction.predictedScore.away}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 text-sm">{result.game.homeTeam.abbreviation}</span>
                            <span className="text-white font-bold">{result.prediction.predictedScore.home}</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Confidence: {result.prediction.confidence}%
                        </div>
                      </div>

                      {/* Actual */}
                      <div>
                        <div className="text-slate-400 text-xs mb-1">ACTUAL</div>
                        <div className="bg-slate-800 rounded p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-300 text-sm">{result.game.awayTeam.abbreviation}</span>
                            <span className="text-white font-bold">{result.actualScore.away}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 text-sm">{result.game.homeTeam.abbreviation}</span>
                            <span className="text-white font-bold">{result.actualScore.home}</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Error: ±{Math.abs(result.outcomes.scoreAccuracy.totalError).toFixed(1)} pts
                        </div>
                      </div>
                    </div>

                    {/* Outcome Details */}
                    <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <span className={result.outcomes.spreadCovered ? 'text-green-400' : 'text-red-400'}>
                          Spread: {result.outcomes.spreadCovered ? '✓' : '✗'}
                        </span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">
                          Total: {result.actualScore.home + result.actualScore.away}
                          ({result.outcomes.totalOver ? 'Over' : 'Under'})
                        </span>
                      </div>
                      {result.profitLoss && (
                        <div className={getProfitColor(result.profitLoss.spread)}>
                          P/L: ${result.profitLoss.spread > 0 ? '+' : ''}{result.profitLoss.spread}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-6">
              <h3 className="text-blue-400 font-semibold mb-3">Key Insights</h3>
              <ul className="text-slate-300 space-y-2 text-sm">
                <li>
                  • Model is performing at <strong className={getAccuracyColor(performance.winnerPredictions.accuracy)}>
                    {performance.winnerPredictions.accuracy.toFixed(1)}%
                  </strong> accuracy on winner predictions
                </li>
                <li>
                  • Against the spread: <strong className={getAccuracyColor(performance.spreadPredictions.accuracy)}>
                    {performance.spreadPredictions.accuracy.toFixed(1)}%
                  </strong> (need 52.4% to break even with -110 odds)
                </li>
                <li>
                  • Average score prediction is within <strong>±{performance.scoreAccuracy.avgTotalError.toFixed(1)} points</strong> of actual total
                </li>
                <li>
                  • Current ROI: <strong className={getProfitColor(performance.profitability.roi)}>
                    {performance.profitability.roi > 0 ? '+' : ''}{performance.profitability.roi.toFixed(1)}%
                  </strong>
                  {performance.profitability.roi > 5 && ' (Profitable!)'}
                  {performance.profitability.roi < 0 && ' (Need improvement)'}
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="bg-slate-800 rounded-lg p-12 text-center">
            <p className="text-slate-400 text-lg">No completed games yet</p>
            <p className="text-slate-500 mt-2">Analytics will appear once games are completed</p>
          </div>
        )}
      </div>
    </div>
  );
}
