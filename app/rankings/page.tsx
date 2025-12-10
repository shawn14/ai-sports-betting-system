'use client';

import { useEffect, useState } from 'react';
import LoggedInHeader from '@/components/LoggedInHeader';
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Zap, Shield, Home, BarChart3, Info } from 'lucide-react';

interface TeamRating {
  team: string;
  conference: 'AFC' | 'NFC';
  division: string;
  record: string;
  tsr: number;
  netPoints: number;
  momentum: number;
  conferenceScore: number;
  homeAdvantage: number;
  offensive: number;
  defensive: number;
  rank: number;
  trend: 'up' | 'down' | 'same';
}

type SortField = 'rank' | 'tsr' | 'netPoints' | 'momentum' | 'offensive' | 'defensive' | 'homeAdvantage';
type FilterConference = 'ALL' | 'AFC' | 'NFC';

export default function RankingsPage() {
  const [teams, setTeams] = useState<TeamRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDesc, setSortDesc] = useState(true);
  const [filterConf, setFilterConf] = useState<FilterConference>('ALL');
  const [compareTeam1, setCompareTeam1] = useState<string>('');
  const [compareTeam2, setCompareTeam2] = useState<string>('');

  useEffect(() => {
    loadTeamRatings();
  }, []);

  const loadTeamRatings = async () => {
    try {
      // Fetch real TSR rankings from API
      const response = await fetch('/api/rankings?season=2025&week=14');

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to load rankings:', error);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setTeams(data.teams);
      setLoading(false);
    } catch (error) {
      console.error('Error loading team ratings:', error);
      setLoading(false);
    }
  };

  const getSortedTeams = () => {
    let filtered = teams;

    if (filterConf !== 'ALL') {
      filtered = teams.filter(t => t.conference === filterConf);
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // For rank, lower is better (1 is best), so reverse the sort
      if (sortField === 'rank') {
        return sortDesc ? aVal - bVal : bVal - aVal;
      }

      // For other fields, higher is better
      return sortDesc ? bVal - aVal : aVal - bVal;
    });
  };

  const getTopTeams = (field: keyof TeamRating, count: number = 5) => {
    return [...teams]
      .sort((a, b) => (b[field] as number) - (a[field] as number))
      .slice(0, count);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const sortedTeams = getSortedTeams();
  const team1Data = teams.find(t => t.team === compareTeam1);
  const team2Data = teams.find(t => t.team === compareTeam2);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <LoggedInHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-600">Loading team rankings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <LoggedInHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-8 h-8 text-yellow-600" />
            <h1 className="text-4xl font-bold text-gray-900">Team Power Rankings</h1>
          </div>
          <p className="text-lg text-gray-600">
            Matrix TSR ratings for all NFL teams, updated weekly based on performance across six key metrics.
          </p>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Top Offense */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">Top Offenses</h3>
            </div>
            <div className="space-y-2">
              {getTopTeams('offensive', 5).map((team, idx) => (
                <div key={team.team} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono w-4">{idx + 1}</span>
                    <span className="text-gray-900">{team.team}</span>
                  </div>
                  <span className="font-bold text-red-600">+{team.offensive.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Defense */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Top Defenses</h3>
            </div>
            <div className="space-y-2">
              {getTopTeams('defensive', 5).map((team, idx) => (
                <div key={team.team} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono w-4">{idx + 1}</span>
                    <span className="text-gray-900">{team.team}</span>
                  </div>
                  <span className="font-bold text-blue-600">+{team.defensive.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hottest Teams */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-gray-900">Hottest Teams (Momentum)</h3>
            </div>
            <div className="space-y-2">
              {getTopTeams('momentum', 5).map((team, idx) => (
                <div key={team.team} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono w-4">{idx + 1}</span>
                    <span className="text-gray-900">{team.team}</span>
                  </div>
                  <span className="font-bold text-green-600">+{team.momentum.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">Filter:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterConf('ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  filterConf === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Teams
              </button>
              <button
                onClick={() => setFilterConf('AFC')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  filterConf === 'AFC'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                AFC
              </button>
              <button
                onClick={() => setFilterConf('NFC')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  filterConf === 'NFC'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                NFC
              </button>
            </div>
          </div>
        </div>

        {/* Rankings Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('rank')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                    >
                      Rank
                      {sortField === 'rank' && (sortDesc ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Record</th>
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSort('tsr')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                      >
                        TSR
                        {sortField === 'tsr' && (sortDesc ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                      </button>
                      <div className="group relative">
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -left-20 top-5">
                          Team Strength Rating - Overall team power score based on all metrics
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSort('offensive')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                      >
                        <Zap className="w-3 h-3" /> OFF
                        {sortField === 'offensive' && (sortDesc ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                      </button>
                      <div className="group relative">
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -left-20 top-5">
                          Offensive Rating - Points scored per game vs league average
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSort('defensive')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                      >
                        <Shield className="w-3 h-3" /> DEF
                        {sortField === 'defensive' && (sortDesc ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                      </button>
                      <div className="group relative">
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -left-20 top-5">
                          Defensive Rating - Points allowed per game vs league average
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSort('momentum')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                      >
                        <TrendingUp className="w-3 h-3" /> MOM
                        {sortField === 'momentum' && (sortDesc ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                      </button>
                      <div className="group relative">
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -left-20 top-5">
                          Momentum - How the team's last 5 games compare to their season average
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSort('homeAdvantage')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                      >
                        <Home className="w-3 h-3" /> HOME
                        {sortField === 'homeAdvantage' && (sortDesc ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                      </button>
                      <div className="group relative">
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -right-2 top-5">
                          Home Advantage - Difference between home and away win percentages
                        </div>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedTeams.map((team) => (
                  <tr key={team.team} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-900">#{team.rank}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-semibold text-gray-900">{team.team}</div>
                        <div className="text-xs text-gray-500">{team.conference} {team.division}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{team.record}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-blue-600">{team.tsr.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-red-600 font-semibold">+{team.offensive.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-blue-600 font-semibold">+{team.defensive.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-600 font-semibold">+{team.momentum.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-orange-600 font-semibold">+{team.homeAdvantage.toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Comparison */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Compare Teams</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Team 1</label>
              <select
                value={compareTeam1}
                onChange={(e) => setCompareTeam1(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a team...</option>
                {teams.map((team) => (
                  <option key={team.team} value={team.team}>{team.team}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Team 2</label>
              <select
                value={compareTeam2}
                onChange={(e) => setCompareTeam2(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a team...</option>
                {teams.map((team) => (
                  <option key={team.team} value={team.team}>{team.team}</option>
                ))}
              </select>
            </div>
          </div>

          {team1Data && team2Data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-blue-900 mb-4">{team1Data.team}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-800">Overall TSR:</span>
                    <strong className="text-blue-900">{team1Data.tsr.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">Offensive:</span>
                    <strong className="text-blue-900">+{team1Data.offensive.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">Defensive:</span>
                    <strong className="text-blue-900">+{team1Data.defensive.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">Momentum:</span>
                    <strong className="text-blue-900">+{team1Data.momentum.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">Net Points:</span>
                    <strong className="text-blue-900">+{team1Data.netPoints.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800">Home Advantage:</span>
                    <strong className="text-blue-900">+{team1Data.homeAdvantage.toFixed(1)}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <h3 className="text-xl font-bold text-red-900 mb-4">{team2Data.team}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-800">Overall TSR:</span>
                    <strong className="text-red-900">{team2Data.tsr.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-800">Offensive:</span>
                    <strong className="text-red-900">+{team2Data.offensive.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-800">Defensive:</span>
                    <strong className="text-red-900">+{team2Data.defensive.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-800">Momentum:</span>
                    <strong className="text-red-900">+{team2Data.momentum.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-800">Net Points:</span>
                    <strong className="text-red-900">+{team2Data.netPoints.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-800">Home Advantage:</span>
                    <strong className="text-red-900">+{team2Data.homeAdvantage.toFixed(1)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
