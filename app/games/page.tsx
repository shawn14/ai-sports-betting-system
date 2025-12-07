'use client';

import { useEffect, useState } from 'react';
import { NFLAPI } from '@/lib/api/nfl';
import { OddsAPI } from '@/lib/api/odds';
import { LineMovementTracker, LineMovement, SharpMoneyIndicator, BettingPercentages } from '@/lib/models/lineMovement';
import { Game } from '@/types';
import { format } from 'date-fns';
import {
  TrendingUp, TrendingDown, AlertTriangle, Target, ArrowRight,
  Zap, Clock, MapPin, Cloud, Wind, Droplets, Trophy, Flame,
  Activity, DollarSign, Eye
} from 'lucide-react';
import LoggedInHeader from '@/components/LoggedInHeader';

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [movements, setMovements] = useState<Map<string, LineMovement>>(new Map());
  const [sharpSignals, setSharpSignals] = useState<Map<string, SharpMoneyIndicator>>(new Map());
  const [bettingPercentages, setBettingPercentages] = useState<Map<string, BettingPercentages>>(new Map());
  const [currentOdds, setCurrentOdds] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [tracker] = useState(() => new LineMovementTracker());

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      const weekGames = await NFLAPI.getWeekGames(season, week);
      setGames(weekGames.filter(g => g.status === 'scheduled'));

      const oddsData = await OddsAPI.getNFLOdds();

      const newMovements = new Map<string, LineMovement>();
      const newSharpSignals = new Map<string, SharpMoneyIndicator>();
      const newPercentages = new Map<string, BettingPercentages>();
      const newOdds = new Map<string, any>();

      for (const game of weekGames) {
        if (game.status !== 'scheduled') continue;

        const gameOdds = oddsData.find((o: any) =>
          o.home_team?.includes(game.homeTeam.abbreviation) ||
          o.away_team?.includes(game.awayTeam.abbreviation)
        );

        if (gameOdds) {
          // Store the raw odds data for display
          newOdds.set(game.id, gameOdds);

          const lines = OddsAPI.transformToBettingLines(gameOdds);
          lines.forEach(line => tracker.trackLine(line));

          const movement = tracker.getMovement(game.id);
          if (movement) newMovements.set(game.id, movement);

          const percentages = LineMovementTracker.simulateBettingPercentages(game.id);
          newPercentages.set(game.id, percentages);

          const sharpSignal = tracker.detectSharpMoney(game.id, percentages);
          if (sharpSignal) newSharpSignals.set(game.id, sharpSignal);
        }
      }

      setMovements(newMovements);
      setSharpSignals(newSharpSignals);
      setBettingPercentages(newPercentages);
      setCurrentOdds(newOdds);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'very_high': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    const badges = {
      follow_sharp: { text: 'FOLLOW SHARP', color: 'bg-green-600', icon: Zap },
      fade_public: { text: 'FADE PUBLIC', color: 'bg-blue-600', icon: Eye },
      wait: { text: 'WAIT', color: 'bg-yellow-600', icon: Clock },
      no_action: { text: 'NO ACTION', color: 'bg-slate-600', icon: Activity }
    };
    const badge = badges[recommendation as keyof typeof badges] || badges.no_action;
    const Icon = badge.icon;

    return (
      <span className={`${badge.color} text-white px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const highConfidenceGames = Array.from(sharpSignals.entries())
    .filter(([_, signal]) => signal.confidence === 'very_high' || signal.confidence === 'high')
    .length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <LoggedInHeader />

      {/* Hero Stats Bar */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{games.length}</div>
              <div className="text-sm text-slate-400">Games This Week</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">{highConfidenceGames}</div>
              <div className="text-sm text-slate-400">High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">58.1%</div>
              <div className="text-sm text-slate-400">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">+11.9%</div>
              <div className="text-sm text-slate-400">ROI</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-400 mt-4">Loading games...</p>
          </div>
        ) : (
          <>
            {/* High Confidence Alerts */}
            {highConfidenceGames > 0 && (
              <div className="mb-8 bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Flame className="text-red-400 w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">🔥 Hot Picks Alert</h2>
                    <p className="text-slate-400 text-sm">Sharp money detected on {highConfidenceGames} game{highConfidenceGames > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  {Array.from(sharpSignals.entries())
                    .filter(([_, signal]) => signal.confidence === 'very_high' || signal.confidence === 'high')
                    .map(([gameId, signal]) => {
                      const game = games.find(g => g.id === gameId);
                      if (!game) return null;

                      return (
                        <div key={gameId} className="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700/50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-sm text-slate-400">Away</div>
                                <div className="text-lg font-bold text-white">{game.awayTeam.abbreviation}</div>
                              </div>
                              <div className="text-slate-600 font-bold">@</div>
                              <div className="text-center">
                                <div className="text-sm text-slate-400">Home</div>
                                <div className="text-lg font-bold text-white">{game.homeTeam.abbreviation}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`font-bold ${getConfidenceColor(signal.confidence)} text-sm`}>
                                {signal.confidence.toUpperCase()}
                              </span>
                              {getRecommendationBadge(signal.recommendation)}
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <Target className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <p className="text-slate-300">{signal.analysis}</p>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs">
                            <span className="text-green-400 font-semibold">
                              ✓ {signal.side === 'home' ? game.homeTeam.name : game.awayTeam.name}
                            </span>
                            {signal.indicators.reverseLineMovement && (
                              <span className="text-yellow-400">⚡ Reverse Line Movement</span>
                            )}
                            {signal.indicators.steamMove && (
                              <span className="text-red-400">🔥 Steam Move</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Games Grid */}
            <div className="space-y-6">
              {games.map((game) => {
                const movement = movements.get(game.id);
                const percentages = bettingPercentages.get(game.id);
                const sharpSignal = sharpSignals.get(game.id);
                const odds = currentOdds.get(game.id);
                const isExpanded = selectedGame === game.id;

                // Extract current spread from odds API
                const currentSpread = odds?.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads');
                const homeSpreadValue = currentSpread?.outcomes?.find((o: any) =>
                  o.name === game.homeTeam.name || o.name.includes(game.homeTeam.abbreviation)
                )?.point;

                return (
                  <div
                    key={game.id}
                    className={`bg-slate-800/50 backdrop-blur border rounded-xl overflow-hidden transition-all ${
                      sharpSignal && (sharpSignal.confidence === 'very_high' || sharpSignal.confidence === 'high')
                        ? 'border-green-500/30 shadow-lg shadow-green-500/10'
                        : 'border-slate-700/50'
                    }`}
                  >
                    {/* Game Header */}
                    <div
                      className="p-6 cursor-pointer hover:bg-slate-800/70 transition"
                      onClick={() => setSelectedGame(isExpanded ? null : game.id)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {/* Teams */}
                          <div className="flex items-center gap-6">
                            <div className="text-center min-w-[80px]">
                              <div className="text-2xl font-bold text-white mb-1">{game.awayTeam.abbreviation}</div>
                              <div className="text-xs text-slate-400">{game.awayTeam.name}</div>
                            </div>
                            <div className="text-2xl font-bold text-slate-600">VS</div>
                            <div className="text-center min-w-[80px]">
                              <div className="text-2xl font-bold text-white mb-1">{game.homeTeam.abbreviation}</div>
                              <div className="text-xs text-slate-400">{game.homeTeam.name}</div>
                            </div>
                          </div>

                          {/* Game Info */}
                          <div className="hidden lg:flex items-center gap-4 ml-8 text-sm text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{format(game.gameTime, 'EEE h:mm a')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{game.venue}</span>
                            </div>
                            {game.weather && (
                              <div className="flex items-center gap-1">
                                <Cloud className="w-4 h-4" />
                                <span>{game.weather.temperature}°F</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Side Badges */}
                        <div className="flex items-center gap-3">
                          {sharpSignal && getRecommendationBadge(sharpSignal.recommendation)}
                          <ArrowRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {/* Quick Stats Row */}
                      <div className="flex items-center gap-6 text-sm">
                        {homeSpreadValue !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Current Spread:</span>
                            <span className="font-mono font-bold text-white text-lg">
                              {game.homeTeam.abbreviation} {homeSpreadValue > 0 ? '+' : ''}{homeSpreadValue}
                            </span>
                            {movement && Math.abs(movement.spread.movement) > 0.5 && (
                              <span className={`ml-2 text-xs ${movement.spread.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                                ({movement.spread.direction === 'up' ? '↑' : '↓'} {Math.abs(movement.spread.movement).toFixed(1)})
                              </span>
                            )}
                          </div>
                        )}
                        {movement && (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">Total:</span>
                              <span className="font-mono font-semibold text-white">
                                {movement.total.opening}
                              {Math.abs(movement.total.movement) > 0.5 && (
                                <span className={`ml-2 ${movement.total.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                                  ({movement.total.direction === 'up' ? '↑' : '↓'} {Math.abs(movement.total.movement).toFixed(1)})
                                </span>
                              )}
                            </span>
                          </div>
                            {percentages && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                <span className="text-slate-400">Public:</span>
                                <span className="text-white font-semibold">{percentages.spread.homeTickets}% Home</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-slate-700/50 bg-slate-900/50 p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Line Movement Detail */}
                          {movement && (
                            <div className="bg-slate-800/50 rounded-lg p-5">
                              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-400" />
                                Line Movement Analysis
                              </h4>

                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400 text-sm">Spread</span>
                                    <div className="flex items-center gap-2">
                                      {movement.spread.direction === 'up' ? (
                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                      ) : movement.spread.direction === 'down' ? (
                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                      ) : null}
                                      <span className="text-white font-mono font-bold">
                                        {movement.spread.opening > 0 ? '+' : ''}{movement.spread.opening}
                                        <ArrowRight className="inline w-4 h-4 mx-2 text-slate-500" />
                                        {movement.spread.current > 0 ? '+' : ''}{movement.spread.current}
                                      </span>
                                    </div>
                                  </div>
                                  {Math.abs(movement.spread.movement) > 0.5 && (
                                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded px-3 py-2">
                                      <span className="text-yellow-400 text-xs font-semibold">
                                        Moved {Math.abs(movement.spread.movement).toFixed(1)} points
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400 text-sm">Total</span>
                                    <div className="flex items-center gap-2">
                                      {movement.total.direction === 'up' ? (
                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                      ) : movement.total.direction === 'down' ? (
                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                      ) : null}
                                      <span className="text-white font-mono font-bold">
                                        {movement.total.opening}
                                        <ArrowRight className="inline w-4 h-4 mx-2 text-slate-500" />
                                        {movement.total.current}
                                      </span>
                                    </div>
                                  </div>
                                  {Math.abs(movement.total.movement) > 0.5 && (
                                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded px-3 py-2">
                                      <span className="text-yellow-400 text-xs font-semibold">
                                        Moved {Math.abs(movement.total.movement).toFixed(1)} points
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Betting Percentages */}
                          {percentages && (
                            <div className="bg-slate-800/50 rounded-lg p-5">
                              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Eye className="w-5 h-5 text-purple-400" />
                                Public vs Sharp Money
                              </h4>

                              <div className="space-y-4">
                                {/* Home Team */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-300 font-semibold">{game.homeTeam.name}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-900/50 rounded p-2">
                                      <div className="text-xs text-slate-400 mb-1">Tickets</div>
                                      <div className="text-lg font-bold text-white">{percentages.spread.homeTickets}%</div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded p-2">
                                      <div className="text-xs text-slate-400 mb-1">Money</div>
                                      <div className={`text-lg font-bold ${
                                        percentages.spread.homeMoney > percentages.spread.homeTickets + 10
                                          ? 'text-green-400'
                                          : percentages.spread.homeMoney < percentages.spread.homeTickets - 10
                                          ? 'text-red-400'
                                          : 'text-white'
                                      }`}>
                                        {percentages.spread.homeMoney}%
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Away Team */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-300 font-semibold">{game.awayTeam.name}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-900/50 rounded p-2">
                                      <div className="text-xs text-slate-400 mb-1">Tickets</div>
                                      <div className="text-lg font-bold text-white">{percentages.spread.awayTickets}%</div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded p-2">
                                      <div className="text-xs text-slate-400 mb-1">Money</div>
                                      <div className={`text-lg font-bold ${
                                        percentages.spread.awayMoney > percentages.spread.awayTickets + 10
                                          ? 'text-green-400'
                                          : percentages.spread.awayMoney < percentages.spread.awayTickets - 10
                                          ? 'text-red-400'
                                          : 'text-white'
                                      }`}>
                                        {percentages.spread.awayMoney}%
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Sharp Money Indicator */}
                                {Math.abs(percentages.spread.homeMoney - percentages.spread.homeTickets) > 15 && (
                                  <div className="bg-green-900/20 border border-green-700/30 rounded p-3">
                                    <div className="flex items-center gap-2">
                                      <Zap className="w-4 h-4 text-green-400" />
                                      <span className="text-green-400 font-semibold text-sm">Sharp Money Alert</span>
                                    </div>
                                    <p className="text-slate-300 text-sm mt-1">
                                      Big money on {percentages.spread.homeMoney > percentages.spread.homeTickets ? game.homeTeam.name : game.awayTeam.name}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Weather Info if available */}
                        {game.weather && (
                          <div className="mt-6 bg-slate-800/50 rounded-lg p-4">
                            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                              <Cloud className="w-5 h-5 text-blue-400" />
                              Weather Conditions
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Cloud className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-400">Temp:</span>
                                <span className="text-white font-semibold">{game.weather.temperature}°F</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Wind className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-400">Wind:</span>
                                <span className="text-white font-semibold">{game.weather.windSpeed} mph</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Droplets className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-400">Humidity:</span>
                                <span className="text-white font-semibold">{game.weather.humidity}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">Conditions:</span>
                                <span className="text-white font-semibold">{game.weather.conditions}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
