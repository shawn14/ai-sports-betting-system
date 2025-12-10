'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import LoggedInHeader from '@/components/LoggedInHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Trophy, Target } from 'lucide-react';

interface TeamAnalytics {
  team: string;
  logo: string;
  abbreviation: string;
  conference: 'AFC' | 'NFC';
  division: string;

  // Spread Coverage Stats
  spreadCovered: number;
  spreadTotal: number;
  spreadCoverageRate: number;

  // Over/Under Stats
  totalOvers: number;
  totalUnders: number;
  totalGames: number;
  overRate: number;

  // Accuracy Stats
  correctPredictions: number;
  totalPredictions: number;
  accuracyRate: number;
}

type MetricType = 'spread' | 'overUnder' | 'accuracy';
type FilterType = 'all' | 'AFC' | 'NFC';
type SortKey = 'team' | 'spreadRate' | 'overRate' | 'accuracyRate' | 'games';
type SortDirection = 'asc' | 'desc';

export default function AnalyticsPage() {
  const [teams, setTeams] = useState<TeamAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>('spread');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortKey, setSortKey] = useState<SortKey>('spreadRate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  useEffect(() => {
    loadTeamAnalytics();
  }, []);

  async function loadTeamAnalytics() {
    try {
      // Query all results for 2025 season
      const resultsQuery = query(
        collection(db, 'results'),
        where('season', '==', 2025)
      );
      const resultsSnapshot = await getDocs(resultsQuery);

      // Aggregate by team
      const teamStatsMap = new Map<string, TeamAnalytics>();

      resultsSnapshot.forEach(doc => {
        const result = doc.data();

        // Skip if game data is missing
        if (!result.game?.homeTeam?.name || !result.game?.awayTeam?.name) return;

        const homeTeam = result.game.homeTeam.name;
        const awayTeam = result.game.awayTeam.name;

        // Process home team
        if (!teamStatsMap.has(homeTeam)) {
          teamStatsMap.set(homeTeam, {
            team: homeTeam,
            logo: result.game.homeTeam.logo || '',
            abbreviation: result.game.homeTeam.abbreviation || homeTeam.substring(0, 3).toUpperCase(),
            conference: result.game.homeTeam.conference || 'AFC',
            division: result.game.homeTeam.division || '',
            spreadCovered: 0,
            spreadTotal: 0,
            spreadCoverageRate: 0,
            totalOvers: 0,
            totalUnders: 0,
            totalGames: 0,
            overRate: 0,
            correctPredictions: 0,
            totalPredictions: 0,
            accuracyRate: 0,
          });
        }

        const homeStats = teamStatsMap.get(homeTeam)!;
        homeStats.totalGames++;
        homeStats.totalPredictions++;
        if (result.spreadCovered) homeStats.spreadCovered++;
        homeStats.spreadTotal++;
        if (result.totalOver) homeStats.totalOvers++;
        else homeStats.totalUnders++;
        if (result.winnerCorrect) homeStats.correctPredictions++;

        // Process away team
        if (!teamStatsMap.has(awayTeam)) {
          teamStatsMap.set(awayTeam, {
            team: awayTeam,
            logo: result.game.awayTeam.logo || '',
            abbreviation: result.game.awayTeam.abbreviation || awayTeam.substring(0, 3).toUpperCase(),
            conference: result.game.awayTeam.conference || 'NFC',
            division: result.game.awayTeam.division || '',
            spreadCovered: 0,
            spreadTotal: 0,
            spreadCoverageRate: 0,
            totalOvers: 0,
            totalUnders: 0,
            totalGames: 0,
            overRate: 0,
            correctPredictions: 0,
            totalPredictions: 0,
            accuracyRate: 0,
          });
        }

        const awayStats = teamStatsMap.get(awayTeam)!;
        awayStats.totalGames++;
        awayStats.totalPredictions++;
        if (result.spreadCovered) awayStats.spreadCovered++;
        awayStats.spreadTotal++;
        if (result.totalOver) awayStats.totalOvers++;
        else awayStats.totalUnders++;
        if (result.winnerCorrect) awayStats.correctPredictions++;
      });

      // Calculate percentages
      const teamAnalytics = Array.from(teamStatsMap.values()).map(stats => ({
        ...stats,
        spreadCoverageRate: stats.spreadTotal > 0 ? (stats.spreadCovered / stats.spreadTotal) * 100 : 0,
        overRate: stats.totalGames > 0 ? (stats.totalOvers / stats.totalGames) * 100 : 0,
        accuracyRate: stats.totalPredictions > 0 ? (stats.correctPredictions / stats.totalPredictions) * 100 : 0,
      }));

      setTeams(teamAnalytics);
      setLoading(false);
    } catch (error) {
      console.error('Error loading team analytics:', error);
      setLoading(false);
    }
  }

  const filteredTeams = teams.filter(team => {
    if (filter === 'all') return true;
    return team.conference === filter;
  });

  const sortedTeams = [...filteredTeams].sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortKey) {
      case 'team':
        aVal = a.team;
        bVal = b.team;
        break;
      case 'spreadRate':
        aVal = a.spreadCoverageRate;
        bVal = b.spreadCoverageRate;
        break;
      case 'overRate':
        aVal = a.overRate;
        bVal = b.overRate;
        break;
      case 'accuracyRate':
        aVal = a.accuracyRate;
        bVal = b.accuracyRate;
        break;
      case 'games':
        aVal = a.totalGames;
        bVal = b.totalGames;
        break;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-900 text-lg">Loading team analytics...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <LoggedInHeader />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-gray-900">TEAM ANALYTICS</h1>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>2025 Season</span>
                <span>•</span>
                <span>{teams.length} Teams</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Hero Metrics */}
        <HeroMetrics teams={teams} />

        {/* Conference Filter */}
        <div className="bg-white rounded border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-600 font-semibold text-xs">Conference:</span>
            {(['all', 'AFC', 'NFC'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-xs transition ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All Teams' : f} ({f === 'all' ? teams.length : teams.filter(t => t.conference === f).length})
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selector */}
        <div className="bg-white rounded border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-600 font-semibold text-xs">Metric:</span>
            {[
              { key: 'spread' as MetricType, label: 'Spread Coverage', icon: Target },
              { key: 'overUnder' as MetricType, label: 'Over/Under', icon: TrendingUp },
              { key: 'accuracy' as MetricType, label: 'Prediction Accuracy', icon: Trophy }
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-3 py-1.5 rounded text-xs transition flex items-center gap-1 ${
                  metric === m.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <m.icon className="w-3 h-3" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <TeamPerformanceChart teams={filteredTeams} metric={metric} />

        {/* Data Table */}
        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">RANK</th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('team')}
                >
                  TEAM {sortKey === 'team' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-right px-4 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('games')}
                >
                  GAMES {sortKey === 'games' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-right px-4 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('spreadRate')}
                >
                  SPREAD % {sortKey === 'spreadRate' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-right px-4 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('overRate')}
                >
                  OVER % {sortKey === 'overRate' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-right px-4 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('accuracyRate')}
                >
                  WINNER % {sortKey === 'accuracyRate' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, idx) => (
                <tr key={team.team} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {team.logo && <img src={team.logo} alt={team.team} className="w-6 h-6" />}
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{team.abbreviation}</div>
                        <div className="text-[10px] text-gray-500">{team.team}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{team.totalGames}</td>
                  <td
                    className={`px-4 py-3 text-sm font-semibold text-right ${
                      team.spreadCoverageRate >= 60
                        ? 'text-green-600'
                        : team.spreadCoverageRate >= 50
                        ? 'text-blue-600'
                        : team.spreadCoverageRate >= 40
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {team.spreadCoverageRate.toFixed(1)}%
                    <div className="text-[10px] text-gray-500 font-normal">
                      {team.spreadCovered}-{team.spreadTotal - team.spreadCovered}
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-semibold text-right ${
                      team.overRate >= 60
                        ? 'text-orange-600'
                        : team.overRate >= 40
                        ? 'text-gray-600'
                        : 'text-purple-600'
                    }`}
                  >
                    {team.overRate.toFixed(1)}%
                    <div className="text-[10px] text-gray-500 font-normal">
                      {team.totalOvers}O-{team.totalUnders}U
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-semibold text-right ${
                      team.accuracyRate >= 70
                        ? 'text-green-600'
                        : team.accuracyRate >= 60
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {team.accuracyRate.toFixed(1)}%
                    <div className="text-[10px] text-gray-500 font-normal">
                      {team.correctPredictions}-{team.totalPredictions - team.correctPredictions}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function HeroMetrics({ teams }: { teams: TeamAnalytics[] }) {
  if (teams.length === 0) return null;

  const leagueAvgATS = teams.reduce((sum, t) => sum + t.spreadCoverageRate, 0) / teams.length;
  const topATS = [...teams].sort((a, b) => b.spreadCoverageRate - a.spreadCoverageRate)[0];
  const topOver = [...teams].sort((a, b) => b.overRate - a.overRate)[0];
  const bottomOver = [...teams].sort((a, b) => a.overRate - b.overRate)[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {/* League Average ATS */}
      <div className="bg-white rounded border border-gray-200 p-3">
        <div className="mb-2">
          <span className="text-[10px] text-blue-600 font-semibold">LEAGUE AVG</span>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-1">{leagueAvgATS.toFixed(1)}%</div>
        <div className="text-xs text-gray-600">Spread Coverage</div>
        <div className="text-[10px] text-gray-500 mt-1">Across all {teams.length} teams</div>
      </div>

      {/* Top ATS Team */}
      <div className="bg-white rounded border border-green-200 p-3">
        <div className="mb-2">
          <span className="text-[10px] text-green-600 font-semibold">BEST ATS</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          {topATS.logo && <img src={topATS.logo} alt={topATS.team} className="w-6 h-6" />}
          <div className="text-2xl font-bold text-gray-900">{topATS.spreadCoverageRate.toFixed(1)}%</div>
        </div>
        <div className="text-xs text-gray-600">{topATS.team}</div>
        <div className="text-[10px] text-gray-500 mt-1">
          {topATS.spreadCovered}-{topATS.spreadTotal - topATS.spreadCovered} record
        </div>
      </div>

      {/* Top Over Team */}
      <div className="bg-white rounded border border-orange-200 p-3">
        <div className="mb-2">
          <span className="text-[10px] text-orange-600 font-semibold">MOST OVERS</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          {topOver.logo && <img src={topOver.logo} alt={topOver.team} className="w-6 h-6" />}
          <div className="text-2xl font-bold text-gray-900">{topOver.overRate.toFixed(1)}%</div>
        </div>
        <div className="text-xs text-gray-600">{topOver.team}</div>
        <div className="text-[10px] text-gray-500 mt-1">
          {topOver.totalOvers} overs in {topOver.totalGames} games
        </div>
      </div>

      {/* Bottom Over Team (Most Unders) */}
      <div className="bg-white rounded border border-purple-200 p-3">
        <div className="mb-2">
          <span className="text-[10px] text-purple-600 font-semibold">MOST UNDERS</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          {bottomOver.logo && <img src={bottomOver.logo} alt={bottomOver.team} className="w-6 h-6" />}
          <div className="text-2xl font-bold text-gray-900">{(100 - bottomOver.overRate).toFixed(1)}%</div>
        </div>
        <div className="text-xs text-gray-600">{bottomOver.team}</div>
        <div className="text-[10px] text-gray-500 mt-1">
          {bottomOver.totalUnders} unders in {bottomOver.totalGames} games
        </div>
      </div>
    </div>
  );
}

function TeamPerformanceChart({ teams, metric }: { teams: TeamAnalytics[]; metric: MetricType }) {
  // Sort teams by selected metric
  const sortedTeams = [...teams]
    .sort((a, b) => {
      if (metric === 'spread') return b.spreadCoverageRate - a.spreadCoverageRate;
      if (metric === 'overUnder') return b.overRate - a.overRate;
      return b.accuracyRate - a.accuracyRate;
    })
    .slice(0, 10);

  const chartData = sortedTeams.map(team => ({
    name: team.abbreviation,
    value:
      metric === 'spread' ? team.spreadCoverageRate : metric === 'overUnder' ? team.overRate : team.accuracyRate,
    logo: team.logo
  }));

  return (
    <div className="bg-white rounded border border-gray-200 p-4 mb-4">
      <h2 className="text-sm font-bold text-gray-900 mb-4">
        Top 10 Teams -{' '}
        {metric === 'spread' ? 'Spread Coverage' : metric === 'overUnder' ? 'Over Rate' : 'Prediction Accuracy'}
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(1)}%`}
            contentStyle={{
              fontSize: 13,
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
            }}
            labelStyle={{ color: '#9ca3af', fontSize: 12, marginBottom: '2px' }}
            itemStyle={{ color: '#ffffff', fontWeight: '600' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', formatter: (value: number) => `${value.toFixed(1)}%`, fontSize: 11 }}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? '#22c55e' : index < 3 ? '#3b82f6' : '#6b7280'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
