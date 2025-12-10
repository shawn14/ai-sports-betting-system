'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NFLAPI } from '@/lib/api/nfl';

interface GameScore {
  id: string;
  status: string;
  awayTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logo: string;
  };
  homeTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logo: string;
  };
  isFinal: boolean;
  isLive: boolean;
  clock?: string;
  period?: string;
  gameTime?: Date;
}

export default function ScoresTicker() {
  const [games, setGames] = useState<GameScore[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScores();
    // Refresh scores every 30 seconds
    const interval = setInterval(loadScores, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadScores() {
    try {
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      const weekGames = await NFLAPI.getWeekGames(season, week);

      const scores: GameScore[] = weekGames.map(game => ({
        id: game.id,
        status: game.status,
        awayTeam: {
          name: game.awayTeam.name,
          abbreviation: game.awayTeam.abbreviation,
          score: game.awayScore || 0,
          logo: game.awayTeam.logo
        },
        homeTeam: {
          name: game.homeTeam.name,
          abbreviation: game.homeTeam.abbreviation,
          score: game.homeScore || 0,
          logo: game.homeTeam.logo
        },
        isFinal: game.status.toLowerCase().includes('final'),
        isLive: !game.status.toLowerCase().includes('final') &&
                !game.status.toLowerCase().includes('scheduled') &&
                game.homeScore !== null,
        clock: game.clock,
        period: game.period,
        gameTime: game.gameTime
      }));

      setGames(scores);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load scores:', error);
      setLoading(false);
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('scores-container');
    if (!container) return;

    const scrollAmount = 300;
    const newPosition = direction === 'left'
      ? scrollPosition - scrollAmount
      : scrollPosition + scrollAmount;

    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  if (loading || games.length === 0) return null;

  return (
    <div className="bg-gradient-to-b from-[#2a2a2a] to-[#1f1f1f] border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative flex items-center py-2.5">
          {/* Left Scroll Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 p-1 bg-[#3a3a3a] border border-gray-700 rounded hover:bg-[#4a4a4a] transition"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-gray-300" />
          </button>

          {/* Scores Container */}
          <div
            id="scores-container"
            className="flex-1 overflow-x-auto scrollbar-hide mx-8"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-3">
              {games.map(game => (
                <div
                  key={game.id}
                  className="flex-shrink-0 bg-gradient-to-br from-[#3a3a3a] to-[#2f2f2f] border border-gray-700 rounded px-3 py-1.5 min-w-[200px] hover:border-gray-600 hover:shadow-md transition-all duration-200"
                >
                  {/* Status */}
                  <div className="text-[10px] text-gray-400 font-semibold mb-1">
                    {game.isFinal && 'Final'}
                    {game.isLive && (
                      <span className="text-red-500">
                        {game.period} {game.clock}
                      </span>
                    )}
                    {!game.isFinal && !game.isLive && game.gameTime && (
                      <span>
                        {new Date(game.gameTime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                    {!game.isFinal && !game.isLive && !game.gameTime && 'Scheduled'}
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <img
                        src={game.awayTeam.logo}
                        alt={game.awayTeam.name}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-semibold text-white">
                        {game.awayTeam.abbreviation}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {game.awayTeam.score}
                    </span>
                  </div>

                  {/* Home Team */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={game.homeTeam.logo}
                        alt={game.homeTeam.name}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-semibold text-white">
                        {game.homeTeam.abbreviation}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {game.homeTeam.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Scroll Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 p-1 bg-[#3a3a3a] border border-gray-700 rounded hover:bg-[#4a4a4a] transition"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
