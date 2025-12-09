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

  const calculateWinLoss = () => {
    if (!data) return { wins: 0, losses: 0, winRate: 0 };
    const wins = data.totalWinnerCorrect;
    const losses = data.totalGames - data.totalWinnerCorrect;
    const winRate = data.overallWinnerAccuracy;
    return { wins, losses, winRate };
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-900 text-lg">Loading backtest results...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-600 text-lg">Error loading backtest data</div>
      </main>
    );
  }

  const { wins, losses, winRate } = calculateWinLoss();
  const filteredWeeks = getFilteredWeeks();

  return (
    <main className="min-h-screen bg-gray-100">
      <LoggedInHeader />

      {/* Header */}
      <div className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-gray-900">BACKTEST RESULTS</h1>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>2025 Season</span>
                <span>•</span>
                <span>Weeks 2-14</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* Winner Accuracy */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="mb-2">
              <span className="text-[10px] text-green-600 font-semibold">WINNER</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {data.overallWinnerAccuracy.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">
              {data.totalWinnerCorrect}W - {data.totalGames - data.totalWinnerCorrect}L
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              {data.totalGames} games analyzed
            </div>
          </div>

          {/* Spread Error */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="mb-2">
              <span className="text-[10px] text-purple-600 font-semibold">SPREAD</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              ±{data.overallAvgSpreadError.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">
              avg spread error
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              points differential
            </div>
          </div>

          {/* Total Error */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="mb-2">
              <span className="text-[10px] text-orange-600 font-semibold">TOTAL</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              ±{data.overallAvgTotalError.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">
              avg total error
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              combined score
            </div>
          </div>

          {/* ATS Record */}
          <div className={`bg-white rounded border p-3 ${
            winRate >= 52.4 ? 'border-green-200' : 'border-gray-200'
          }`}>
            <div className="mb-2">
              <span className={`text-[10px] font-semibold ${winRate >= 52.4 ? 'text-green-600' : 'text-gray-600'}`}>
                ATS RECORD
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {wins}-{losses}
            </div>
            <div className="text-xs text-gray-600">
              {winRate.toFixed(1)}% win rate
            </div>
            <div className="text-[10px] mt-1 text-gray-500">
              {data.totalGames} total games
            </div>
          </div>
        </div>

        {/* Performance Analysis */}
        <div className="bg-white rounded border border-gray-200 p-3 mb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Performance Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">Breakeven (at -110 odds)</div>
              <div className="text-2xl font-bold text-yellow-600">52.4%</div>
              <div className="text-[10px] text-gray-500 mt-1">Industry standard</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Your System</div>
              <div className={`text-2xl font-bold ${
                data.overallWinnerAccuracy >= 52.4 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.overallWinnerAccuracy.toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {data.overallWinnerAccuracy >= 52.4 ? 'Above breakeven ✓' : 'Below breakeven ✗'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Edge Over Breakeven</div>
              <div className={`text-2xl font-bold ${
                data.overallWinnerAccuracy >= 52.4 ? 'text-green-600' : 'text-red-600'
              }`}>
                +{(data.overallWinnerAccuracy - 52.4).toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Percentage points above breakeven
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-600 font-semibold text-xs">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded text-xs transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Weeks ({data.weeklyStats.length})
            </button>
            <button
              onClick={() => setFilter('strong')}
              className={`px-3 py-1.5 rounded text-xs transition ${
                filter === 'strong'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Strong (70%+)
            </button>
            <button
              onClick={() => setFilter('good')}
              className={`px-3 py-1.5 rounded text-xs transition ${
                filter === 'good'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Good (65%+)
            </button>
            <button
              onClick={() => setFilter('edge')}
              className={`px-3 py-1.5 rounded text-xs transition ${
                filter === 'edge'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Edge (55%+)
            </button>
          </div>
        </div>

        {/* Week-by-Week Table */}
        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Winner Accuracy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Spread Error
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Error
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Avg Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Strong Bets
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredWeeks.map((week) => {
                  const isExpanded = expandedWeeks.has(week.week);
                  const weekGames = getWeekGames(week.week);

                  return (
                    <React.Fragment key={week.week}>
                      <tr className="hover:bg-gray-50 transition cursor-pointer">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                          Week {week.week}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {week.games}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`font-bold ${
                            week.winnerAccuracy >= 70 ? 'text-green-600' :
                            week.winnerAccuracy >= 65 ? 'text-blue-600' :
                            week.winnerAccuracy >= 55 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {week.winnerAccuracy.toFixed(1)}%
                          </span>
                          <span className="text-gray-500 text-xs ml-2">
                            ({week.winnerCorrect}/{week.games})
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          ±{week.avgSpreadError.toFixed(1)} pts
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          ±{week.avgTotalError.toFixed(1)} pts
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {week.avgConfidence.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {week.strongBets > 0 ? (
                            <>
                              {week.strongBetsCorrect}/{week.strongBets}
                              <span className="text-gray-500 ml-1">
                                ({week.strongBetsAccuracy.toFixed(0)}%)
                              </span>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => toggleWeek(week.week)}
                            className="text-blue-600 hover:text-blue-700 transition"
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
                          <td colSpan={8} className="bg-gray-50 px-4 py-4">
                            <div className="space-y-2">
                              {weekGames.map((game, idx) => (
                                <div key={idx} className="bg-white rounded border border-gray-200 p-3">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <div className="text-gray-900 font-semibold text-sm">
                                        {game.awayTeam} @ {game.homeTeam}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        Confidence: {game.confidence}% • {game.recommendation}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {game.winnerCorrect ? (
                                        <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-bold">
                                          ✓ CORRECT
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-bold">
                                          ✗ WRONG
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-4 text-xs">
                                    {/* Predicted Score */}
                                    <div>
                                      <div className="text-gray-500 text-[10px] mb-1 font-semibold">PREDICTED</div>
                                      <div className="text-gray-900 font-mono text-sm">
                                        {game.predictedAway} - {game.predictedHome}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        Spread: {game.predictedSpread > 0 ? '+' : ''}{game.predictedSpread.toFixed(1)}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Total: {game.predictedTotal.toFixed(1)}
                                      </div>
                                    </div>

                                    {/* Actual Score */}
                                    <div>
                                      <div className="text-gray-500 text-[10px] mb-1 font-semibold">ACTUAL</div>
                                      <div className="text-gray-900 font-mono font-bold text-sm">
                                        {game.actualAway} - {game.actualHome}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        Spread: {game.actualSpread > 0 ? '+' : ''}{game.actualSpread.toFixed(1)}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Total: {game.actualTotal.toFixed(1)}
                                      </div>
                                    </div>

                                    {/* Errors */}
                                    <div>
                                      <div className="text-gray-500 text-[10px] mb-1 font-semibold">ERROR</div>
                                      <div className={`font-mono text-sm ${
                                        game.spreadError <= 7 ? 'text-green-600' :
                                        game.spreadError <= 14 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                        Spread: ±{game.spreadError.toFixed(1)}
                                      </div>
                                      <div className={`font-mono mt-1 text-sm ${
                                        game.totalError <= 7 ? 'text-green-600' :
                                        game.totalError <= 14 ? 'text-yellow-600' : 'text-red-600'
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
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
          <h3 className="text-blue-700 font-semibold mb-3 text-sm">Methodology</h3>
          <div className="text-gray-700 space-y-2 text-xs">
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
