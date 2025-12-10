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
    <div className="min-h-screen bg-gray-50">
      <LoggedInHeader />

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {/* Compact Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Power Rankings</h1>
          <p className="text-xs text-gray-600">
            Team Strength Ratings based on six key performance metrics
          </p>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {/* Top Offense */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-red-600" />
              <h3 className="text-sm font-semibold text-gray-900">Top Offenses</h3>
            </div>
            <div className="space-y-1.5">
              {getTopTeams('offensive', 5).map((team, idx) => (
                <div key={team.team} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono w-4">{idx + 1}</span>
                    <span className="text-gray-900">{team.team}</span>
                  </div>
                  <span className="text-red-600">+{team.offensive.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Defense */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Top Defenses</h3>
            </div>
            <div className="space-y-1.5">
              {getTopTeams('defensive', 5).map((team, idx) => (
                <div key={team.team} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono w-4">{idx + 1}</span>
                    <span className="text-gray-900">{team.team}</span>
                  </div>
                  <span className="text-blue-600">+{team.defensive.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hottest Teams */}
          <div className="bg-white rounded border border-gray-200 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">Hottest Teams</h3>
            </div>
            <div className="space-y-1.5">
              {getTopTeams('momentum', 5).map((team, idx) => (
                <div key={team.team} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono w-4">{idx + 1}</span>
                    <span className="text-gray-900">{team.team}</span>
                  </div>
                  <span className="text-green-600">+{team.momentum.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded border border-gray-200 p-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">Filter:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setFilterConf('ALL')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  filterConf === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Teams
              </button>
              <button
                onClick={() => setFilterConf('AFC')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  filterConf === 'AFC'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                AFC
              </button>
              <button
                onClick={() => setFilterConf('NFC')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
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
        <div className="bg-white rounded border border-gray-200 overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <button
                      onClick={() => handleSort('rank')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                    >
                      Rank
                      {sortField === 'rank' && (sortDesc ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Team</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Record</th>
                  <th className="px-3 py-2 text-left">
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
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded shadow-lg -left-20 top-5">
                          Team Strength Rating - Overall team power score based on all metrics
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left">
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
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded shadow-lg -left-20 top-5">
                          Offensive Rating - Points scored per game vs league average
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left">
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
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded shadow-lg -left-20 top-5">
                          Defensive Rating - Points allowed per game vs league average
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left">
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
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded shadow-lg -left-20 top-5">
                          Momentum - How the team's last 5 games compare to their season average
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left">
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
                        <div className="invisible group-hover:visible absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded shadow-lg -right-2 top-5">
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
                    <td className="px-3 py-2">
                      <span className="text-sm text-gray-900">#{team.rank}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div>
                        <div className="text-sm text-gray-900">{team.team}</div>
                        <div className="text-xs text-gray-500">{team.conference} {team.division}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{team.record}</td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-blue-600">{team.tsr.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-red-600">+{team.offensive.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-blue-600">+{team.defensive.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-green-600">+{team.momentum.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-orange-600">+{team.homeAdvantage.toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Comparison */}
        <div className="bg-white rounded border border-gray-200 p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Compare Teams</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Team 1</label>
              <select
                value={compareTeam1}
                onChange={(e) => setCompareTeam1(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a team...</option>
                {teams.map((team) => (
                  <option key={team.team} value={team.team}>{team.team}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Team 2</label>
              <select
                value={compareTeam2}
                onChange={(e) => setCompareTeam2(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a team...</option>
                {teams.map((team) => (
                  <option key={team.team} value={team.team}>{team.team}</option>
                ))}
              </select>
            </div>
          </div>

          {team1Data && team2Data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded border border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{team1Data.team}</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overall TSR:</span>
                    <span className="text-gray-900">{team1Data.tsr.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Offensive:</span>
                    <span className="text-gray-900">+{team1Data.offensive.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Defensive:</span>
                    <span className="text-gray-900">+{team1Data.defensive.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Momentum:</span>
                    <span className="text-gray-900">+{team1Data.momentum.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Points:</span>
                    <span className="text-gray-900">+{team1Data.netPoints.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Home Advantage:</span>
                    <span className="text-gray-900">+{team1Data.homeAdvantage.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded border border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{team2Data.team}</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overall TSR:</span>
                    <span className="text-gray-900">{team2Data.tsr.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Offensive:</span>
                    <span className="text-gray-900">+{team2Data.offensive.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Defensive:</span>
                    <span className="text-gray-900">+{team2Data.defensive.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Momentum:</span>
                    <span className="text-gray-900">+{team2Data.momentum.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Points:</span>
                    <span className="text-gray-900">+{team2Data.netPoints.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Home Advantage:</span>
                    <span className="text-gray-900">+{team2Data.homeAdvantage.toFixed(1)}</span>
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
