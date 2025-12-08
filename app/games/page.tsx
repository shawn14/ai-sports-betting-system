'use client';

import { useEffect, useState } from 'react';
import LoggedInHeader from '@/components/LoggedInHeader';
import { Calendar, Clock, MapPin, TrendingUp } from 'lucide-react';
import { NFLAPI } from '@/lib/api/nfl';
import { Game } from '@/types';

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [currentSeason, setCurrentSeason] = useState<number>(2025);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);

      // Get current season and week
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      setCurrentSeason(season);
      setCurrentWeek(week);
      setSelectedWeek(week);

      // Load games for current week
      const weekGames = await NFLAPI.getWeekGames(season, week);
      setGames(weekGames);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeek = async (week: number) => {
    try {
      setLoading(true);
      setSelectedWeek(week);
      const weekGames = await NFLAPI.getWeekGames(currentSeason, week);
      setGames(weekGames);
    } catch (error) {
      console.error('Error loading week:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatGameTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getStatusBadge = (status: Game['status']) => {
    switch (status) {
      case 'scheduled':
        return <span className="text-[11px] font-medium text-gray-600">UPCOMING</span>;
      case 'in_progress':
        return <span className="text-[11px] font-bold text-red-600 animate-pulse">LIVE</span>;
      case 'completed':
        return <span className="text-[11px] font-medium text-gray-600">FINAL</span>;
      default:
        return null;
    }
  };

  const weekOptions = Array.from({ length: 18 }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <LoggedInHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading games...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <LoggedInHeader />

      {/* ESPN-style Header */}
      <div className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-gray-900">SCORES</h1>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>NFL</span>
                <span>•</span>
                <span>{currentSeason}</span>
              </div>
            </div>
            <select
              value={selectedWeek || currentWeek}
              onChange={(e) => loadWeek(parseInt(e.target.value))}
              className="bg-white border border-gray-300 text-gray-900 rounded px-2 py-1 text-xs font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {weekOptions.map(week => (
                <option key={week} value={week}>
                  Week {week}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* Games List - NFL.com style */}
        <div className="space-y-2">
          {games.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No games scheduled for this week yet.</p>
            </div>
          ) : (
            games.map((game) => (
              <div
                key={game.id}
                className="bg-white border border-gray-200 hover:border-gray-300 transition shadow-sm"
              >
                <div className="p-3">
                  {/* Time/Status Bar */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                    <div className="text-[11px] text-gray-600 font-medium">
                      {new Date(game.gameTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' • '}
                      {new Date(game.gameTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    {getStatusBadge(game.status)}
                  </div>

                  {/* Teams */}
                  <div className="space-y-2">
                    {/* Away Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 flex-shrink-0">
                          {game.awayTeam.logo && (
                            <img
                              src={game.awayTeam.logo}
                              alt={game.awayTeam.abbreviation}
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-gray-900">
                            {game.awayTeam.name}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {game.awayTeam.abbreviation}
                          </div>
                        </div>
                      </div>
                      {game.status === 'completed' && (
                        <div className="text-2xl font-bold text-gray-900 tabular-nums">
                          {game.awayScore}
                        </div>
                      )}
                    </div>

                    {/* Home Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 flex-shrink-0">
                          {game.homeTeam.logo && (
                            <img
                              src={game.homeTeam.logo}
                              alt={game.homeTeam.abbreviation}
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-gray-900">
                            {game.homeTeam.name}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {game.homeTeam.abbreviation}
                          </div>
                        </div>
                      </div>
                      {game.status === 'completed' && (
                        <div className="text-2xl font-bold text-gray-900 tabular-nums">
                          {game.homeScore}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {game.status === 'scheduled' && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => window.location.href = `/chat-predict?game=${game.id}`}
                        className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                      >
                        Get Prediction
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
