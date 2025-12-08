'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, TrendingUp, Target, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import LoggedInHeader from '@/components/LoggedInHeader';

interface GameResult {
  week: number;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  predictedHome: number;
  predictedAway: number;
  predictedSpread: number;
  predictedTotal: number;
  actualHome: number;
  actualAway: number;
  actualSpread: number;
  actualTotal: number;
  winnerCorrect: boolean;
  spreadError: number;
  totalError: number;
  confidence: number;
  recommendation: string;
}

interface WeekStats {
  week: number;
  games: number;
  winnerCorrect: number;
  winnerAccuracy: number;
  avgSpreadError: number;
  avgTotalError: number;
  avgConfidence: number;
  strongBets: number;
  strongBetsCorrect: number;
  strongBetsAccuracy: number;
}

interface BacktestResults {
  totalGames: number;
  totalWinnerCorrect: number;
  overallWinnerAccuracy: number;
  overallAvgSpreadError: number;
  overallAvgTotalError: number;
  overallAvgConfidence: number;
  weeklyStats: WeekStats[];
  allResults: GameResult[];
}

export default function BacktestResultsPage() {
  const [data, setData] = useState<BacktestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'strong' | 'good' | 'edge'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/training/backtest_results_2025.json');
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Error loading backtest results:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleWeek = (week: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(week)) {
      newExpanded.delete(week);
    } else {
      newExpanded.add(week);
    }
    setExpandedWeeks(newExpanded);
  };

  const getFilteredWeeks = () => {
    if (!data) return [];
    switch (filter) {
      case 'strong':
        return data.weeklyStats.filter(w => w.winnerAccuracy >= 70);
      case 'good':
        return data.weeklyStats.filter(w => w.winnerAccuracy >= 65);
      case 'edge':
        return data.weeklyStats.filter(w => w.winnerAccuracy >= 55);
      default:
        return data.weeklyStats;
    }
  };

  const getWeekGames = (week: number): GameResult[] => {
    if (!data) return [];
    return data.allResults.filter(r => r.week === week);
  };

  const calculateProfit = () => {
    if (!data) return 0;
    const totalGames = data.totalGames;
    const winRate = data.overallWinnerAccuracy / 100;
    const wins = winRate * totalGames;
    const losses = totalGames - wins;
    // At -110 odds: win $100 on wins, lose $110 on losses
    return (wins * 100) - (losses * 110);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading backtest results...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error loading backtest data</div>
      </main>
    );
  }

  const profit = calculateProfit();
  const filteredWeeks = getFilteredWeeks();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <LoggedInHeader />

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-white">2025 Season Backtest Results</h1>
          <p className="text-slate-400 mt-2">
            Comprehensive historical performance analysis (Weeks 2-14)
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Winner Accuracy */}
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 rounded-lg p-6 border border-green-700/50">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-green-300" />
              <span className="text-xs text-green-300 font-semibold">WINNER</span>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              {data.overallWinnerAccuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-green-200">
              {data.totalWinnerCorrect}W - {data.totalGames - data.totalWinnerCorrect}L
            </div>
            <div className="text-xs text-green-300 mt-2">
              {data.totalGames} games analyzed
            </div>
          </div>

          {/* Spread Error */}
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 rounded-lg p-6 border border-purple-700/50">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-purple-300" />
              <span className="text-xs text-purple-300 font-semibold">SPREAD</span>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              ±{data.overallAvgSpreadError.toFixed(1)}
            </div>
            <div className="text-sm text-purple-200">
              avg spread error
            </div>
            <div className="text-xs text-purple-300 mt-2">
              points differential
            </div>
          </div>

          {/* Total Error */}
          <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/40 rounded-lg p-6 border border-orange-700/50">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-orange-300" />
              <span className="text-xs text-orange-300 font-semibold">TOTAL</span>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              ±{data.overallAvgTotalError.toFixed(1)}
            </div>
            <div className="text-sm text-orange-200">
              avg total error
            </div>
            <div className="text-xs text-orange-300 mt-2">
              combined score
            </div>
          </div>

          {/* Estimated Profit */}
          <div className={`bg-gradient-to-br ${
            profit > 0
              ? 'from-blue-900/40 to-blue-800/40 border-blue-700/50'
              : 'from-red-900/40 to-red-800/40 border-red-700/50'
          } rounded-lg p-6 border`}>
            <div className="flex items-center justify-between mb-2">
              <DollarSign className={`w-8 h-8 ${profit > 0 ? 'text-blue-300' : 'text-red-300'}`} />
              <span className={`text-xs font-semibold ${profit > 0 ? 'text-blue-300' : 'text-red-300'}`}>
                PROFIT
              </span>
            </div>
            <div className={`text-4xl font-bold ${profit > 0 ? 'text-white' : 'text-white'} mb-1`}>
              ${profit > 0 ? '+' : ''}{profit.toFixed(0)}
            </div>
            <div className={`text-sm ${profit > 0 ? 'text-blue-200' : 'text-red-200'}`}>
              $100/game @ -110
            </div>
            <div className={`text-xs mt-2 ${profit > 0 ? 'text-blue-300' : 'text-red-300'}`}>
              {data.totalGames} total bets
            </div>
          </div>
        </div>

        {/* Profitability Analysis */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">💰 Profitability Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-slate-400 mb-1">Breakeven (at -110 odds)</div>
              <div className="text-2xl font-bold text-yellow-400">52.4%</div>
              <div className="text-xs text-slate-500 mt-1">Industry standard</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Your System</div>
              <div className={`text-2xl font-bold ${
                data.overallWinnerAccuracy >= 52.4 ? 'text-green-400' : 'text-red-400'
              }`}>
                {data.overallWinnerAccuracy.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {data.overallWinnerAccuracy >= 52.4 ? 'Above breakeven ✅' : 'Below breakeven ⚠️'}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Edge Over Breakeven</div>
              <div className={`text-2xl font-bold ${
                data.overallWinnerAccuracy >= 52.4 ? 'text-green-400' : 'text-red-400'
              }`}>
                +{(data.overallWinnerAccuracy - 52.4).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Percentage points above breakeven
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
          <div className="flex items-center space-x-4">
            <span className="text-slate-400 font-semibold">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All Weeks ({data.weeklyStats.length})
            </button>
            <button
              onClick={() => setFilter('strong')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'strong'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Strong (70%+)
            </button>
            <button
              onClick={() => setFilter('good')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'good'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Good (65%+)
            </button>
            <button
              onClick={() => setFilter('edge')}
              className={`px-4 py-2 rounded-lg transition ${
                filter === 'edge'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Edge (55%+)
            </button>
          </div>
        </div>

        {/* Week-by-Week Table */}
        <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Winner Accuracy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Spread Error
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Error
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Avg Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Strong Bets
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredWeeks.map((week) => {
                  const isExpanded = expandedWeeks.has(week.week);
                  const weekGames = getWeekGames(week.week);

                  return (
                    <React.Fragment key={week.week}>
                      <tr className="hover:bg-slate-700/50 transition cursor-pointer">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-white">
                          Week {week.week}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                          {week.games}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className={`font-bold ${
                            week.winnerAccuracy >= 70 ? 'text-green-400' :
                            week.winnerAccuracy >= 65 ? 'text-blue-400' :
                            week.winnerAccuracy >= 55 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {week.winnerAccuracy.toFixed(1)}%
                          </span>
                          <span className="text-slate-500 text-xs ml-2">
                            ({week.winnerCorrect}/{week.games})
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                          ±{week.avgSpreadError.toFixed(1)} pts
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                          ±{week.avgTotalError.toFixed(1)} pts
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                          {week.avgConfidence.toFixed(1)}%
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                          {week.strongBets > 0 ? (
                            <>
                              {week.strongBetsCorrect}/{week.strongBets}
                              <span className="text-slate-500 ml-1">
                                ({week.strongBetsAccuracy.toFixed(0)}%)
                              </span>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => toggleWeek(week.week)}
                            className="text-blue-400 hover:text-blue-300 transition"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 inline" />
                            ) : (
                              <ChevronDown className="w-5 h-5 inline" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Game Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-slate-900/50 px-4 py-4">
                            <div className="space-y-2">
                              {weekGames.map((game, idx) => (
                                <div key={idx} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <div className="text-white font-semibold">
                                        {game.awayTeam} @ {game.homeTeam}
                                      </div>
                                      <div className="text-xs text-slate-400 mt-1">
                                        Confidence: {game.confidence}% • {game.recommendation}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {game.winnerCorrect ? (
                                        <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded text-xs font-bold">
                                          ✓ CORRECT
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-xs font-bold">
                                          ✗ WRONG
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    {/* Predicted Score */}
                                    <div>
                                      <div className="text-slate-500 text-xs mb-1">PREDICTED</div>
                                      <div className="text-white font-mono">
                                        {game.predictedAway} - {game.predictedHome}
                                      </div>
                                      <div className="text-xs text-slate-400 mt-1">
                                        Spread: {game.predictedSpread > 0 ? '+' : ''}{game.predictedSpread.toFixed(1)}
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        Total: {game.predictedTotal.toFixed(1)}
                                      </div>
                                    </div>

                                    {/* Actual Score */}
                                    <div>
                                      <div className="text-slate-500 text-xs mb-1">ACTUAL</div>
                                      <div className="text-white font-mono font-bold">
                                        {game.actualAway} - {game.actualHome}
                                      </div>
                                      <div className="text-xs text-slate-400 mt-1">
                                        Spread: {game.actualSpread > 0 ? '+' : ''}{game.actualSpread.toFixed(1)}
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        Total: {game.actualTotal.toFixed(1)}
                                      </div>
                                    </div>

                                    {/* Errors */}
                                    <div>
                                      <div className="text-slate-500 text-xs mb-1">ERROR</div>
                                      <div className={`font-mono ${
                                        game.spreadError <= 7 ? 'text-green-400' :
                                        game.spreadError <= 14 ? 'text-yellow-400' : 'text-red-400'
                                      }`}>
                                        Spread: ±{game.spreadError.toFixed(1)}
                                      </div>
                                      <div className={`font-mono mt-1 ${
                                        game.totalError <= 7 ? 'text-green-400' :
                                        game.totalError <= 14 ? 'text-yellow-400' : 'text-red-400'
                                      }`}>
                                        Total: ±{game.totalError.toFixed(1)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 mt-8">
          <h3 className="text-blue-400 font-semibold mb-3">📊 Methodology</h3>
          <div className="text-slate-300 space-y-2 text-sm">
            <p>
              <strong>Temporal Integrity:</strong> Week N predictions used ONLY Week N-1 standings data (no future data leakage).
            </p>
            <p>
              <strong>Matrix TSR Algorithm:</strong> 6-component Team Strength Rating (Net Points, Momentum, Conference, Home/Away, Offense, Defense).
            </p>
            <p>
              <strong>Data Source:</strong> ESPN API for games + manually scraped NFL.com standings for team statistics.
            </p>
            <p>
              <strong>Profit Calculation:</strong> Assumes $100 bet per game at standard -110 odds (win $100, lose $110).
            </p>
            <p>
              <strong>Breakeven:</strong> 52.4% win rate required to break even with -110 juice.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// Add React import for Fragment
import React from 'react';
