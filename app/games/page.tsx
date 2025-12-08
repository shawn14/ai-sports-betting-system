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
        return <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs font-semibold">UPCOMING</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded text-xs font-semibold animate-pulse">LIVE</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-semibold">FINAL</span>;
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <LoggedInHeader />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Calendar className="w-10 h-10 text-blue-400" />
            NFL Games
          </h1>
          <p className="text-slate-300 text-lg">
            {currentSeason} Season • Week {selectedWeek || currentWeek} • {games.length} Games
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Selector */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-slate-400 font-semibold">Select Week:</label>
            <select
              value={selectedWeek || currentWeek}
              onChange={(e) => loadWeek(parseInt(e.target.value))}
              className="bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {weekOptions.map(week => (
                <option key={week} value={week}>
                  Week {week} {week === currentWeek ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Games Grid */}
        <div className="space-y-4">
          {games.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No games scheduled for this week yet.</p>
            </div>
          ) : (
            games.map((game) => (
              <div
                key={game.id}
                className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-600/50 transition"
              >
                <div className="p-6">
                  {/* Game Header - Time and Status */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatGameTime(game.gameTime)}</span>
                    </div>
                    {getStatusBadge(game.status)}
                  </div>

                  {/* Teams Matchup */}
                  <div className="flex items-center justify-between mb-6">
                    {/* Away Team */}
                    <div className="flex-1 flex items-center gap-4">
                      <div className="w-20 h-20 bg-slate-700/50 rounded-full p-3 flex items-center justify-center">
                        {game.awayTeam.logo ? (
                          <img
                            src={game.awayTeam.logo}
                            alt={`${game.awayTeam.name} logo`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-2xl font-bold text-slate-400">
                            {game.awayTeam.abbreviation}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-white">
                          {game.awayTeam.name}
                        </div>
                        <div className="text-sm text-slate-400">
                          {game.awayTeam.conference}
                        </div>
                        {game.status === 'completed' && (
                          <div className="text-3xl font-bold text-white mt-2">
                            {game.awayScore}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* VS Separator */}
                    <div className="px-8 text-slate-500 font-bold text-xl">
                      {game.status === 'completed' ? 'FINAL' : '@'}
                    </div>

                    {/* Home Team */}
                    <div className="flex-1 flex items-center gap-4 justify-end">
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">
                          {game.homeTeam.name}
                        </div>
                        <div className="text-sm text-slate-400">
                          {game.homeTeam.conference}
                        </div>
                        {game.status === 'completed' && (
                          <div className="text-3xl font-bold text-white mt-2">
                            {game.homeScore}
                          </div>
                        )}
                      </div>
                      <div className="w-20 h-20 bg-slate-700/50 rounded-full p-3 flex items-center justify-center">
                        {game.homeTeam.logo ? (
                          <img
                            src={game.homeTeam.logo}
                            alt={`${game.homeTeam.name} logo`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-2xl font-bold text-slate-400">
                            {game.homeTeam.abbreviation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Game Details */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span>{game.venue}</span>
                    </div>

                    {game.status === 'scheduled' && (
                      <button
                        onClick={() => window.location.href = `/chat-predict?game=${game.id}`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Get Prediction
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
