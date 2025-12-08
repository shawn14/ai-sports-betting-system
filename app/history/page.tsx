'use client';

import { useEffect, useState } from 'react';
import LoggedInHeader from '@/components/LoggedInHeader';
import AILoadingAnimation from '@/components/AILoadingAnimation';
import { BarChart3, TrendingUp, Trophy, Database, Target, DollarSign, Percent } from 'lucide-react';

interface GameResult {
  game_id: string;
  week: number;
  matchup: string;
  home_score: number;
  away_score: number;
  predicted_spread: number;
  vegas_spread: number;
  actual_spread: number;
  result: 'WIN' | 'LOSS' | 'PUSH';
  predicted_total?: number;
  vegas_total?: number;
  actual_total?: number;
  ou_pick?: string;
  ou_result?: 'WIN' | 'LOSS' | 'PUSH';
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

  if (loading || !performanceData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <LoggedInHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AILoadingAnimation
            title="LOADING PERFORMANCE DATA"
            subtitle="Retrieving all 195 predictions and outcomes..."
            steps={[
              { label: 'Loading prediction data', icon: Database, delay: 0 },
              { label: 'Processing game results', icon: BarChart3, delay: 200 },
              { label: 'Calculating performance metrics', icon: TrendingUp, delay: 400 },
              { label: 'Preparing analysis', icon: Trophy, delay: 600 },
            ]}
          />
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'summary', label: 'Summary', icon: Trophy },
    { id: 'spread', label: 'Spread Bets', icon: Target },
    { id: 'totals', label: 'Totals (O/U)', icon: TrendingUp },
    { id: 'moneyline', label: 'Moneyline', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <LoggedInHeader />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            2025 Season Performance
          </h1>
          <p className="text-slate-400 mt-1">
            Complete analysis across 195 games - Spreads, Totals, and Moneyline
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-blue-400'
                      : 'text-slate-400 border-transparent hover:text-white hover:border-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'summary' && <SummaryTab performanceData={performanceData} totalGames={gameHistory.length} />}
        {activeTab === 'spread' && <SpreadTab games={gameHistory} performance={performanceData.spread_performance} />}
        {activeTab === 'totals' && <TotalsTab games={gameHistory} performance={performanceData.total_performance} />}
        {activeTab === 'moneyline' && <MoneylineTab games={gameHistory} performance={performanceData.moneyline_performance} />}
      </div>
    </div>
  );
}

// Summary Tab Component
function SummaryTab({ performanceData, totalGames }: { performanceData: PerformanceData; totalGames: number }) {
  const { spread_performance, total_performance, moneyline_performance } = performanceData;

  return (
    <div className="space-y-6">
      {/* Overall Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Spread Card */}
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Spread Bets (ATS)
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-black text-green-400">
                {spread_performance.win_rate.toFixed(1)}%
              </div>
              <div className="text-slate-400 text-sm">Win Rate</div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Record:</span>
              <span className="text-white font-semibold">
                {spread_performance.ats_wins}-{spread_performance.ats_losses}-{spread_performance.ats_pushes}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">ROI:</span>
              <span className="text-green-400 font-semibold">
                +{spread_performance.roi.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Profit:</span>
              <span className="text-green-400 font-semibold">
                ${spread_performance.profit_per_110_unit.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Totals Card */}
        <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Totals (Over/Under)
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-black text-blue-400">
                {total_performance.win_rate.toFixed(1)}%
              </div>
              <div className="text-slate-400 text-sm">Win Rate</div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Record:</span>
              <span className="text-white font-semibold">
                {total_performance.ou_wins}-{total_performance.ou_losses}-{total_performance.ou_pushes}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">ROI:</span>
              <span className={`font-semibold ${total_performance.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {total_performance.roi > 0 ? '+' : ''}{total_performance.roi.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Profit:</span>
              <span className={`font-semibold ${total_performance.profit_per_110_unit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${total_performance.profit_per_110_unit > 0 ? '+' : ''}{total_performance.profit_per_110_unit.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Moneyline Card */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-400" />
              Moneyline (Straight Up)
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-black text-purple-400">
                {moneyline_performance.win_rate.toFixed(1)}%
              </div>
              <div className="text-slate-400 text-sm">Win Rate</div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Record:</span>
              <span className="text-white font-semibold">
                {moneyline_performance.ml_wins}-{moneyline_performance.ml_losses}
              </span>
            </div>
            <div className="pt-2 text-xs text-slate-500">
              ROI varies by game odds
            </div>
          </div>
        </div>
      </div>

      {/* Historical Performance by Season */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Historical Performance by Season (ATS Spread Bets)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr>
                <th className="px-4 py-2 text-left text-slate-400">Season</th>
                <th className="px-4 py-2 text-center text-slate-400">Record</th>
                <th className="px-4 py-2 text-center text-slate-400">Win Rate</th>
                <th className="px-4 py-2 text-center text-slate-400">ROI</th>
                <th className="px-4 py-2 text-center text-slate-400">Profit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 text-slate-300">2021</td>
                <td className="px-4 py-3 text-center font-mono text-slate-300">101-105-2</td>
                <td className="px-4 py-3 text-center font-semibold text-red-400">49.0%</td>
                <td className="px-4 py-3 text-center font-semibold text-red-400">-6.40%</td>
                <td className="px-4 py-3 text-center font-mono text-red-400">-$1,450</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 text-slate-300">2022</td>
                <td className="px-4 py-3 text-center font-mono text-slate-300">99-102-7</td>
                <td className="px-4 py-3 text-center font-semibold text-red-400">49.3%</td>
                <td className="px-4 py-3 text-center font-semibold text-red-400">-5.97%</td>
                <td className="px-4 py-3 text-center font-mono text-red-400">-$1,320</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 text-slate-300">2023</td>
                <td className="px-4 py-3 text-center font-mono text-slate-300">101-97-10</td>
                <td className="px-4 py-3 text-center font-semibold text-yellow-400">51.0%</td>
                <td className="px-4 py-3 text-center font-semibold text-red-400">-2.62%</td>
                <td className="px-4 py-3 text-center font-mono text-red-400">-$570</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 text-slate-300">2024</td>
                <td className="px-4 py-3 text-center font-mono text-slate-300">112-92-4</td>
                <td className="px-4 py-3 text-center font-semibold text-green-400">54.9%</td>
                <td className="px-4 py-3 text-center font-semibold text-green-400">+4.81%</td>
                <td className="px-4 py-3 text-center font-mono text-green-400">+$1,080</td>
              </tr>
              <tr className="bg-green-900/20 border-b-2 border-green-700/50">
                <td className="px-4 py-3 text-white font-bold">2025</td>
                <td className="px-4 py-3 text-center font-mono text-white font-bold">135-55-5</td>
                <td className="px-4 py-3 text-center font-bold text-green-400 text-lg">71.1%</td>
                <td className="px-4 py-3 text-center font-bold text-green-400">+35.65%</td>
                <td className="px-4 py-3 text-center font-mono text-green-400 font-bold">+$7,450</td>
              </tr>
              <tr className="bg-slate-900/50">
                <td className="px-4 py-3 text-slate-400">Average (2021-2024)</td>
                <td className="px-4 py-3 text-center font-mono text-slate-400">413-396-23</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-300">51.1%</td>
                <td className="px-4 py-3 text-center font-semibold text-red-400">-2.54%</td>
                <td className="px-4 py-3 text-center font-mono text-red-400">-$2,260</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-green-400 font-semibold mb-2">🎯 2025 Performance</div>
            <div className="text-slate-300">
              <span className="text-white font-bold">{spread_performance.win_rate.toFixed(1)}%</span> win rate
              on spread bets - <span className="text-yellow-400">exceptional year, likely above long-term average</span>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-blue-400 font-semibold mb-2">📊 Historical Average</div>
            <div className="text-slate-300">
              51.1% win rate across 2021-2024 seasons - <span className="text-slate-400">more realistic long-term expectation</span>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-purple-400 font-semibold mb-2">📈 Model Evolution</div>
            <div className="text-slate-300">
              Performance improved from <span className="text-red-400">49%</span> (2021-22) to <span className="text-green-400">55%</span> (2024) to <span className="text-green-400 font-bold">71%</span> (2025)
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-yellow-400 font-semibold mb-2">⚠️ Variance Note</div>
            <div className="text-slate-300">
              Win rates vary <span className="text-white">49-71%</span> by season. Expect regression toward <span className="text-yellow-400">52-56% range</span> long-term.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Spread Tab Component
function SpreadTab({ games, performance }: { games: GameResult[]; performance: any }) {
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'PUSH'>('ALL');
  const filteredGames = games.filter((g: GameResult) => filter === 'ALL' || g.result === filter);

  const getOurPick = (game: GameResult) => {
    const [away, home] = game.matchup.split(' @ ');
    const modelSaysHomeCover = game.predicted_spread > game.vegas_spread;
    return modelSaysHomeCover ? home : away;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Spread Performance (ATS)</h3>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{performance.ats_wins}</div>
              <div className="text-xs text-slate-400">Wins</div>
            </div>
            <div className="text-slate-600">-</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{performance.ats_losses}</div>
              <div className="text-xs text-slate-400">Losses</div>
            </div>
            <div className="text-slate-600">-</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{performance.ats_pushes}</div>
              <div className="text-xs text-slate-400">Pushes</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded p-3">
            <div className="text-slate-400 text-xs">Win Rate</div>
            <div className="text-xl font-bold text-green-400">{performance.win_rate.toFixed(1)}%</div>
          </div>
          <div className="bg-slate-800/50 rounded p-3">
            <div className="text-slate-400 text-xs">ROI</div>
            <div className="text-xl font-bold text-green-400">+{performance.roi.toFixed(2)}%</div>
          </div>
          <div className="bg-slate-800/50 rounded p-3">
            <div className="text-slate-400 text-xs">Profit ($110 units)</div>
            <div className="text-xl font-bold text-green-400">${performance.profit_per_110_unit.toFixed(0)}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">All Games ({filteredGames.length})</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="bg-slate-700 text-white rounded-lg px-4 py-2 text-sm border border-slate-600">
          <option value="ALL">All Results ({games.length})</option>
          <option value="WIN">Wins ({performance.ats_wins})</option>
          <option value="LOSS">Losses ({performance.ats_losses})</option>
          <option value="PUSH">Pushes ({performance.ats_pushes})</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300">Week</th>
                <th className="px-4 py-3 text-left text-slate-300">Matchup</th>
                <th className="px-4 py-3 text-center text-slate-300">Score</th>
                <th className="px-4 py-3 text-center text-slate-300">Our Pick</th>
                <th className="px-4 py-3 text-center text-slate-300">Vegas Line</th>
                <th className="px-4 py-3 text-center text-slate-300">Actual Spread</th>
                <th className="px-4 py-3 text-center text-slate-300">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game: GameResult, idx: number) => (
                <tr key={game.game_id} className={`border-b border-slate-700 ${idx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-900/30'}`}>
                  <td className="px-4 py-3 text-slate-300">{game.week}</td>
                  <td className="px-4 py-3 text-white">{game.matchup}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-300">{game.away_score}-{game.home_score}</td>
                  <td className="px-4 py-3 text-center text-blue-400 font-semibold">{getOurPick(game)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-400">{game.vegas_spread > 0 ? '+' : ''}{game.vegas_spread.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center font-mono text-white font-semibold">{game.actual_spread > 0 ? '+' : ''}{game.actual_spread.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      game.result === 'WIN' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                      game.result === 'LOSS' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                      'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                    }`}>{game.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TotalsTab({ games, performance }: { games: GameResult[]; performance: any }) {
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'PUSH'>('ALL');
  const filteredGames = games.filter((g: GameResult) => filter === 'ALL' || g.ou_result === filter);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Over/Under Performance</h3>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{performance.ou_wins}</div>
              <div className="text-xs text-slate-400">Wins</div>
            </div>
            <div className="text-slate-600">-</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{performance.ou_losses}</div>
              <div className="text-xs text-slate-400">Losses</div>
            </div>
            <div className="text-slate-600">-</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{performance.ou_pushes}</div>
              <div className="text-xs text-slate-400">Pushes</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded p-3">
            <div className="text-slate-400 text-xs">Win Rate</div>
            <div className="text-xl font-bold text-blue-400">{performance.win_rate.toFixed(1)}%</div>
          </div>
          <div className="bg-slate-800/50 rounded p-3">
            <div className="text-slate-400 text-xs">ROI</div>
            <div className={`text-xl font-bold ${performance.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>{performance.roi > 0 ? '+' : ''}{performance.roi.toFixed(2)}%</div>
          </div>
          <div className="bg-slate-800/50 rounded p-3">
            <div className="text-slate-400 text-xs">Profit ($110 units)</div>
            <div className={`text-xl font-bold ${performance.profit_per_110_unit > 0 ? 'text-green-400' : 'text-red-400'}`}>${performance.profit_per_110_unit > 0 ? '+' : ''}{performance.profit_per_110_unit.toFixed(0)}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">All Games ({filteredGames.length})</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="bg-slate-700 text-white rounded-lg px-4 py-2 text-sm border border-slate-600">
          <option value="ALL">All Results ({games.length})</option>
          <option value="WIN">Wins ({performance.ou_wins})</option>
          <option value="LOSS">Losses ({performance.ou_losses})</option>
          <option value="PUSH">Pushes ({performance.ou_pushes})</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300">Week</th>
                <th className="px-4 py-3 text-left text-slate-300">Matchup</th>
                <th className="px-4 py-3 text-center text-slate-300">Score</th>
                <th className="px-4 py-3 text-center text-slate-300">Our Pick</th>
                <th className="px-4 py-3 text-center text-slate-300">Vegas Line</th>
                <th className="px-4 py-3 text-center text-slate-300">Actual Total</th>
                <th className="px-4 py-3 text-center text-slate-300">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game: GameResult, idx: number) => (
                <tr key={game.game_id} className={`border-b border-slate-700 ${idx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-900/30'}`}>
                  <td className="px-4 py-3 text-slate-300">{game.week}</td>
                  <td className="px-4 py-3 text-white">{game.matchup}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-300">{game.away_score}-{game.home_score}</td>
                  <td className="px-4 py-3 text-center text-blue-400 font-semibold">{game.ou_pick} {game.vegas_total?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-400">{game.vegas_total?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center font-mono text-white font-semibold">{game.actual_total?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      game.ou_result === 'WIN' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                      game.ou_result === 'LOSS' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                      'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                    }`}>{game.ou_result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MoneylineTab({ games, performance }: { games: GameResult[]; performance: any }) {
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const filteredGames = games.filter((g: GameResult) => filter === 'ALL' || g.ml_result === filter);

  const getMLPick = (game: GameResult) => {
    const [away, home] = game.matchup.split(' @ ');
    return game.ml_pick === 'home' ? home : away;
  };

  const getActualWinner = (game: GameResult) => {
    const [away, home] = game.matchup.split(' @ ');
    return game.actual_spread > 0 ? home : away;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Moneyline Performance (Straight Up)</h3>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{performance.ml_wins}</div>
              <div className="text-xs text-slate-400">Wins</div>
            </div>
            <div className="text-slate-600">-</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{performance.ml_losses}</div>
              <div className="text-xs text-slate-400">Losses</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded p-3">
            <div className="text-slate-400 text-xs">Win Rate</div>
            <div className="text-xl font-bold text-purple-400">{performance.win_rate.toFixed(1)}%</div>
          </div>
          <div className="bg-slate-800/50 rounded p-3">
            <div className="text-slate-400 text-xs">Note</div>
            <div className="text-xs text-slate-500">ROI varies by game odds</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">All Games ({filteredGames.length})</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="bg-slate-700 text-white rounded-lg px-4 py-2 text-sm border border-slate-600">
          <option value="ALL">All Results ({games.length})</option>
          <option value="WIN">Wins ({performance.ml_wins})</option>
          <option value="LOSS">Losses ({performance.ml_losses})</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300">Week</th>
                <th className="px-4 py-3 text-left text-slate-300">Matchup</th>
                <th className="px-4 py-3 text-center text-slate-300">Score</th>
                <th className="px-4 py-3 text-center text-slate-300">Our Pick</th>
                <th className="px-4 py-3 text-center text-slate-300">Actual Winner</th>
                <th className="px-4 py-3 text-center text-slate-300">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game: GameResult, idx: number) => (
                <tr key={game.game_id} className={`border-b border-slate-700 ${idx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-900/30'}`}>
                  <td className="px-4 py-3 text-slate-300">{game.week}</td>
                  <td className="px-4 py-3 text-white">{game.matchup}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-300">{game.away_score}-{game.home_score}</td>
                  <td className="px-4 py-3 text-center text-purple-400 font-semibold">{getMLPick(game)}</td>
                  <td className="px-4 py-3 text-center text-white font-semibold">{getActualWinner(game)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      game.ml_result === 'WIN' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                      'bg-red-900/50 text-red-300 border border-red-700'
                    }`}>{game.ml_result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
