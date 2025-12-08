'use client';

import { useEffect, useState, useMemo } from 'react';
import LoggedInHeader from '@/components/LoggedInHeader';
import AILoadingAnimation from '@/components/AILoadingAnimation';
import { BarChart3, TrendingUp, Trophy, Database, Target, DollarSign, TrendingDown } from 'lucide-react';

interface GameResult {
  game_id: string;
  week: number;
  matchup: string;
  predicted_spread: number;
  vegas_spread: number;
  actual_spread: number;
  result: 'WIN' | 'LOSS' | 'PUSH';
  home_score: number;
  away_score: number;
  // O/U fields
  predicted_total?: number;
  vegas_total?: number;
  actual_total?: number;
  ou_pick?: string;
  ou_result?: 'WIN' | 'LOSS' | 'PUSH';
  // ML fields
  ml_pick?: string;
  ml_result?: 'WIN' | 'LOSS';
}

interface PerformanceData {
  spread_performance: {
    ats_wins: number;
    ats_losses: number;
    ats_pushes: number;
    win_rate: number;
    roi: number;
    profit_per_110_unit: number;
  };
  total_performance: {
    ou_wins: number;
    ou_losses: number;
    ou_pushes: number;
    win_rate: number;
    roi: number;
    profit_per_110_unit: number;
  };
  moneyline_performance: {
    ml_wins: number;
    ml_losses: number;
    win_rate: number;
  };
}

type TabType = 'summary' | 'spread' | 'totals' | 'moneyline';

export default function HistoryPage() {
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'week',
    direction: 'asc'
  });
  const [filterResult, setFilterResult] = useState<'ALL' | 'WIN' | 'LOSS' | 'PUSH'>('ALL');

  useEffect(() => {
    loadGameHistory();
  }, []);

  const loadGameHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/training/complete_performance_2025.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || !data.detailed_results) {
        throw new Error('Invalid data format');
      }
      setGameHistory(data.detailed_results);
      setPerformanceData({
        spread_performance: data.spread_performance,
        total_performance: data.total_performance,
        moneyline_performance: data.moneyline_performance
      });
    } catch (error) {
      console.error('Error loading game history:', error);
      alert(`Failed to load game history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const formatSpread = (spread: number) => {
    if (spread > 0) return `+${spread.toFixed(1)}`;
    return spread.toFixed(1);
  };

  const getOurPick = (game: GameResult) => {
    // Figure out which side we bet based on model vs Vegas
    const [away, home] = game.matchup.split(' @ ');
    const homeAbbr = home.split(' ').pop() || home;
    const awayAbbr = away.split(' ').pop() || away;

    // If model predicts home covers better than Vegas line, bet home
    // If model predicts away covers better than Vegas line, bet away
    const modelSaysHomeCover = game.predicted_spread > game.vegas_spread;

    if (modelSaysHomeCover) {
      // We bet on the home team against the Vegas spread
      return `${homeAbbr} ${formatSpread(game.vegas_spread)}`;
    } else {
      // We bet on the away team against the Vegas spread
      return `${awayAbbr} ${formatSpread(-game.vegas_spread)}`;
    }
  };

  const calculateMargin = (game: GameResult) => {
    // How much we won/lost by relative to Vegas spread
    const margin = game.actual_spread - game.vegas_spread;
    return formatSpread(Math.abs(margin));
  };

  // Filter and sort logic
  const filteredGames = useMemo(() => {
    let games = [...gameHistory];

    // Filter by result
    if (filterResult !== 'ALL') {
      games = games.filter(g => g.result === filterResult);
    }

    // Sort
    games.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof GameResult];
      const bVal = b[sortConfig.key as keyof GameResult];

      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return games;
  }, [gameHistory, filterResult, sortConfig]);

  // Calculate from filtered games, but total stats from all games
  const totalWins = gameHistory.filter(g => g.result === 'WIN').length;
  const totalLosses = gameHistory.filter(g => g.result === 'LOSS').length;
  const totalPushes = gameHistory.filter(g => g.result === 'PUSH').length;

  const wins = filteredGames.filter(g => g.result === 'WIN').length;
  const losses = filteredGames.filter(g => g.result === 'LOSS').length;
  const pushes = filteredGames.filter(g => g.result === 'PUSH').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <LoggedInHeader />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-8 h-8" />
                2025 Season Game History
              </h1>
              <p className="text-slate-400 mt-1">
                Complete record of all 195 predictions vs actual outcomes
              </p>
            </div>

            {/* Performance Summary */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="text-center">
                <div className="text-green-400 text-3xl font-bold">{totalWins}</div>
                <div className="text-slate-400 text-xs">Wins</div>
              </div>
              <div className="text-slate-600 text-2xl">-</div>
              <div className="text-center">
                <div className="text-red-400 text-3xl font-bold">{totalLosses}</div>
                <div className="text-slate-400 text-xs">Losses</div>
              </div>
              <div className="text-slate-600 text-2xl">-</div>
              <div className="text-center">
                <div className="text-yellow-400 text-3xl font-bold">{totalPushes}</div>
                <div className="text-slate-400 text-xs">Pushes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <AILoadingAnimation
            title="LOADING GAME HISTORY"
            subtitle="Retrieving all 195 predictions and outcomes..."
            steps={[
              { label: 'Loading prediction data', icon: Database, delay: 0 },
              { label: 'Processing game results', icon: BarChart3, delay: 200 },
              { label: 'Calculating performance metrics', icon: TrendingUp, delay: 400 },
              { label: 'Preparing table view', icon: Trophy, delay: 600 },
            ]}
          />
        ) : (
          <>
            {/* Game History Table */}
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                  All Games ({gameHistory.length})
                </h2>

                {/* Filters */}
                <div className="flex items-center space-x-3">
                  <select
                    value={filterResult}
                    onChange={(e) => setFilterResult(e.target.value as any)}
                    className="bg-slate-700 text-white rounded-lg px-4 py-2 text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Results ({gameHistory.length})</option>
                    <option value="WIN">Wins Only ({totalWins})</option>
                    <option value="LOSS">Losses Only ({totalLosses})</option>
                    <option value="PUSH">Pushes Only ({totalPushes})</option>
                  </select>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 border-b-2 border-slate-700">
                    <tr>
                      <th
                        onClick={() => handleSort('week')}
                        className="cursor-pointer px-4 py-3 text-left text-slate-300 hover:text-white transition"
                      >
                        <div className="flex items-center gap-1">
                          Week
                          {sortConfig.key === 'week' && (
                            <span className="text-blue-400">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-slate-300">Matchup</th>
                      <th className="px-4 py-3 text-center text-slate-300">Final Score</th>
                      <th className="px-4 py-3 text-center text-slate-300">Our Pick</th>
                      <th className="px-4 py-3 text-center text-slate-300">Vegas Line</th>
                      <th
                        onClick={() => handleSort('actual_spread')}
                        className="cursor-pointer px-4 py-3 text-center text-slate-300 hover:text-white transition"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Actual
                          {sortConfig.key === 'actual_spread' && (
                            <span className="text-blue-400">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('result')}
                        className="cursor-pointer px-4 py-3 text-center text-slate-300 hover:text-white transition"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Result
                          {sortConfig.key === 'result' && (
                            <span className="text-blue-400">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-slate-300">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGames.map((game, idx) => (
                      <tr
                        key={game.game_id}
                        className={`border-b border-slate-700 hover:bg-slate-700/50 transition ${
                          idx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-900/30'
                        }`}
                      >
                        {/* Week */}
                        <td className="px-4 py-3 text-slate-300 font-medium">{game.week}</td>

                        {/* Matchup */}
                        <td className="px-4 py-3 text-white">{game.matchup}</td>

                        {/* Final Score */}
                        <td className="px-4 py-3 text-center font-mono text-slate-300">
                          <span className="text-slate-400">{game.away_score}</span>
                          <span className="text-slate-500 mx-1">-</span>
                          <span className="text-white font-semibold">{game.home_score}</span>
                        </td>

                        {/* Our Pick */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-blue-400 font-semibold">
                            {getOurPick(game)}
                          </span>
                        </td>

                        {/* Vegas Line */}
                        <td className="px-4 py-3 text-center font-mono text-slate-400">
                          {formatSpread(game.vegas_spread)}
                        </td>

                        {/* Actual Spread */}
                        <td className="px-4 py-3 text-center font-mono text-white font-semibold">
                          {formatSpread(game.actual_spread)}
                        </td>

                        {/* Result Badge */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            game.result === 'WIN' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                            game.result === 'LOSS' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                            'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                          }`}>
                            {game.result}
                          </span>
                        </td>

                        {/* Margin */}
                        <td className="px-4 py-3 text-center font-mono font-semibold">
                          <span className={
                            game.result === 'WIN' ? 'text-green-400' :
                            game.result === 'LOSS' ? 'text-red-400' :
                            'text-slate-400'
                          }>
                            {calculateMargin(game)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredGames.map((game) => (
                  <div key={game.game_id} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-white font-semibold">{game.matchup}</div>
                        <div className="text-slate-400 text-xs mt-1">Week {game.week}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        game.result === 'WIN' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                        game.result === 'LOSS' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                        'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                      }`}>
                        {game.result}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-400 block text-xs">Final Score</span>
                        <span className="text-white font-mono">
                          {game.away_score}-{game.home_score}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs">Our Pick</span>
                        <span className="text-blue-400 font-semibold">{getOurPick(game)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs">Vegas Line</span>
                        <span className="text-slate-300 font-mono">{formatSpread(game.vegas_spread)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-xs">Margin</span>
                        <span className={`font-mono font-semibold ${
                          game.result === 'WIN' ? 'text-green-400' :
                          game.result === 'LOSS' ? 'text-red-400' :
                          'text-slate-400'
                        }`}>
                          {calculateMargin(game)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary at bottom */}
              <div className="mt-6 pt-4 border-t border-slate-700 text-sm text-slate-400 flex items-center justify-between">
                <div>
                  Showing <span className="text-white font-semibold">{filteredGames.length}</span> of <span className="text-white font-semibold">{gameHistory.length}</span> games
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-green-400">
                    ✓ {totalWins} Wins
                  </span>
                  <span className="text-red-400">
                    ✗ {totalLosses} Losses
                  </span>
                  <span className="text-yellow-400">
                    ⊘ {totalPushes} Pushes
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Summary Card */}
            <div className="mt-6 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-bold text-white">2025 Season Performance</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-slate-400 text-xs mb-1">ATS Win Rate</div>
                  <div className="text-2xl font-bold text-green-400">
                    {gameHistory.length > 0 ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1) : '0.0'}%
                  </div>
                  <div className="text-slate-500 text-xs mt-1">{totalWins}-{totalLosses} Record</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-slate-400 text-xs mb-1">Total Bets</div>
                  <div className="text-2xl font-bold text-white">{totalWins + totalLosses}</div>
                  <div className="text-slate-500 text-xs mt-1">{totalPushes} Pushes</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-slate-400 text-xs mb-1">Edge vs Breakeven</div>
                  <div className="text-2xl font-bold text-blue-400">
                    +{gameHistory.length > 0 ? (((totalWins / (totalWins + totalLosses)) * 100) - 52.38).toFixed(1) : '0.0'}%
                  </div>
                  <div className="text-slate-500 text-xs mt-1">Above 52.4%</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-slate-400 text-xs mb-1">Estimated ROI</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {gameHistory.length > 0 ? (((totalWins / (totalWins + totalLosses)) - 0.5238) * 100 / 1.05).toFixed(1) : '0.0'}%
                  </div>
                  <div className="text-slate-500 text-xs mt-1">Out-of-Sample</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
