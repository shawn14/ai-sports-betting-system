'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NFLAPI } from '@/lib/api/nfl';
import { OddsAPI } from '@/lib/api/odds';
import { Game } from '@/types';
import { format } from 'date-fns';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState({ season: 2024, week: 1 });

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      setCurrentWeek({ season, week });

      const weekGames = await NFLAPI.getWeekGames(season, week);
      setGames(weekGames);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-white">
            NFL Betting Analysis System
          </h1>
          <p className="text-slate-400 mt-2">
            Statistical modeling and predictions for informed betting decisions
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            <Link
              href="/"
              className="text-white font-semibold border-b-2 border-blue-500 pb-1"
            >
              Games
            </Link>
            <Link
              href="/predictions"
              className="text-slate-400 hover:text-white transition pb-1"
            >
              Predictions
            </Link>
            <Link
              href="/analytics"
              className="text-slate-400 hover:text-white transition pb-1"
            >
              Analytics
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white transition pb-1"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Selector */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Week {currentWeek.week} - {currentWeek.season}
              </h2>
              <p className="text-slate-400 mt-1">
                {games.length} games scheduled
              </p>
            </div>
            <button
              onClick={loadGames}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Games List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-400 mt-4">Loading games...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-12 text-center">
            <p className="text-slate-400 text-lg">No games found for this week</p>
            <p className="text-slate-500 mt-2">Check back later or try a different week</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition"
              >
                <div className="flex items-center justify-between">
                  {/* Away Team */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      {game.awayTeam.logo && (
                        <img
                          src={game.awayTeam.logo}
                          alt={game.awayTeam.name}
                          className="w-12 h-12"
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {game.awayTeam.name}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {game.awayTeam.abbreviation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Score / Time */}
                  <div className="text-center px-8">
                    {game.status === 'completed' ? (
                      <div>
                        <div className="text-3xl font-bold text-white">
                          {game.awayScore} - {game.homeScore}
                        </div>
                        <div className="text-slate-400 text-sm mt-1">Final</div>
                      </div>
                    ) : game.status === 'in_progress' ? (
                      <div>
                        <div className="text-3xl font-bold text-white">
                          {game.awayScore} - {game.homeScore}
                        </div>
                        <div className="text-green-400 text-sm mt-1">LIVE</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-slate-400 text-sm">
                          {format(game.gameTime, 'MMM d')}
                        </div>
                        <div className="text-white font-semibold mt-1">
                          {format(game.gameTime, 'h:mm a')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Home Team */}
                  <div className="flex-1 flex justify-end">
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <h3 className="text-xl font-bold text-white">
                          {game.homeTeam.name}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {game.homeTeam.abbreviation}
                        </p>
                      </div>
                      {game.homeTeam.logo && (
                        <img
                          src={game.homeTeam.logo}
                          alt={game.homeTeam.name}
                          className="w-12 h-12"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Game Details */}
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{game.venue}</span>
                    <Link
                      href={`/predictions?game=${game.id}`}
                      className="text-blue-400 hover:text-blue-300 transition"
                    >
                      View Analysis →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm font-semibold mb-2">
              This Week
            </h3>
            <p className="text-3xl font-bold text-white">{games.length}</p>
            <p className="text-slate-400 text-sm mt-1">Total Games</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm font-semibold mb-2">
              Predictions
            </h3>
            <p className="text-3xl font-bold text-blue-400">Coming Soon</p>
            <p className="text-slate-400 text-sm mt-1">Model Accuracy</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm font-semibold mb-2">
              Best Bets
            </h3>
            <p className="text-3xl font-bold text-green-400">Coming Soon</p>
            <p className="text-slate-400 text-sm mt-1">High Value Picks</p>
          </div>
        </div>
      </div>
    </main>
  );
}
