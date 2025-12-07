'use client';

import LoggedInHeader from '@/components/LoggedInHeader';
import AILoadingAnimation from '@/components/AILoadingAnimation';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NFLAPI } from '@/lib/api/nfl';
import { OddsAPI } from '@/lib/api/odds';
import { LineMovementTracker, LineMovement, SharpMoneyIndicator, BettingPercentages } from '@/lib/models/lineMovement';
import { Game, BettingLine } from '@/types';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, AlertTriangle, Target, ArrowRight, Eye, DollarSign, Activity } from 'lucide-react';

export default function DashboardPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [movements, setMovements] = useState<Map<string, LineMovement>>(new Map());
  const [sharpSignals, setSharpSignals] = useState<Map<string, SharpMoneyIndicator>>(new Map());
  const [bettingPercentages, setBettingPercentages] = useState<Map<string, BettingPercentages>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tracker] = useState(() => new LineMovementTracker());

  useEffect(() => {
    loadDashboardData();
    // Refresh every 2 minutes
    const interval = setInterval(loadDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      const weekGames = await NFLAPI.getWeekGames(season, week);
      setGames(weekGames.filter(g => g.status === 'scheduled'));

      // Load odds and track line movements
      const oddsData = await OddsAPI.getNFLOdds();

      const newMovements = new Map<string, LineMovement>();
      const newSharpSignals = new Map<string, SharpMoneyIndicator>();
      const newPercentages = new Map<string, BettingPercentages>();

      for (const game of weekGames) {
        if (game.status !== 'scheduled') continue;

        // Find odds for this game
        const gameOdds = oddsData.find((o: any) =>
          o.home_team?.includes(game.homeTeam.abbreviation) ||
          o.away_team?.includes(game.awayTeam.abbreviation)
        );

        if (gameOdds) {
          const lines = OddsAPI.transformToBettingLines(gameOdds);

          // Track all lines
          lines.forEach(line => tracker.trackLine(line));

          // Get movement data
          const movement = tracker.getMovement(game.id);
          if (movement) {
            newMovements.set(game.id, movement);
          }

          // Simulate betting percentages (in production, get from data provider)
          const percentages = LineMovementTracker.simulateBettingPercentages(game.id);
          newPercentages.set(game.id, percentages);

          // Detect sharp money
          const sharpSignal = tracker.detectSharpMoney(game.id, percentages);
          if (sharpSignal) {
            newSharpSignals.set(game.id, sharpSignal);
          }
        }
      }

      setMovements(newMovements);
      setSharpSignals(newSharpSignals);
      setBettingPercentages(newPercentages);
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
    switch (recommendation) {
      case 'follow_sharp':
        return <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">FOLLOW SHARP</span>;
      case 'fade_public':
        return <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">FADE PUBLIC</span>;
      case 'wait':
        return <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-semibold">WAIT</span>;
      default:
        return <span className="bg-slate-600 text-white px-2 py-1 rounded text-xs font-semibold">NO ACTION</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <LoggedInHeader />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-white mb-2">Live Line Movement Dashboard</h1>
          <p className="text-slate-400">
            Track sharp money, reverse line movement, and betting percentages in real-time
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <AILoadingAnimation
            title="LINE MOVEMENT TRACKER"
            subtitle="Analyzing real-time betting market data..."
            steps={[
              { label: 'Fetching current betting lines', icon: DollarSign, delay: 0 },
              { label: 'Tracking line movements', icon: TrendingUp, delay: 200 },
              { label: 'Detecting sharp money signals', icon: Eye, delay: 400 },
              { label: 'Analyzing public betting', icon: Activity, delay: 600 },
              { label: 'Identifying betting opportunities', icon: Target, delay: 800 },
              { label: 'Calculating market inefficiencies', icon: AlertTriangle, delay: 1000 },
            ]}
          />
        ) : (
          <>
            {/* Sharp Money Alerts */}
            {Array.from(sharpSignals.entries())
              .filter(([_, signal]) => signal.confidence === 'very_high' || signal.confidence === 'high')
              .length > 0 && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 mb-8">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="text-red-400 w-6 h-6" />
                  <h2 className="text-xl font-bold text-white">Sharp Money Alerts</h2>
                </div>
                <div className="grid gap-4">
                  {Array.from(sharpSignals.entries())
                    .filter(([_, signal]) => signal.confidence === 'very_high' || signal.confidence === 'high')
                    .map(([gameId, signal]) => {
                      const game = games.find(g => g.id === gameId);
                      if (!game) return null;

                      return (
                        <div key={gameId} className="bg-slate-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-semibold">
                              {game.awayTeam.name} @ {game.homeTeam.name}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold ${getConfidenceColor(signal.confidence)}`}>
                                {signal.confidence.toUpperCase()} CONFIDENCE
                              </span>
                              {getRecommendationBadge(signal.recommendation)}
                            </div>
                          </div>
                          <p className="text-slate-400 text-sm mb-2">{signal.analysis}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-green-400">
                              Sharp Side: {signal.side === 'home' ? game.homeTeam.name : game.awayTeam.name}
                            </span>
                            {signal.indicators.reverseLineMovement && (
                              <span className="text-yellow-400">• Reverse Line Movement</span>
                            )}
                            {signal.indicators.steamMove && (
                              <span className="text-red-400">• Steam Move</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Games with Line Movements */}
            <div className="grid gap-6">
              {games.map((game) => {
                const movement = movements.get(game.id);
                const percentages = bettingPercentages.get(game.id);
                const sharpSignal = sharpSignals.get(game.id);

                return (
                  <div key={game.id} className="bg-slate-800 rounded-lg p-6">
                    {/* Game Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          {game.awayTeam.name} @ {game.homeTeam.name}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {format(game.gameTime, 'EEEE, MMMM d - h:mm a')}
                        </p>
                      </div>
                      {sharpSignal && (
                        <div className="text-right">
                          {getRecommendationBadge(sharpSignal.recommendation)}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Line Movement */}
                      {movement && (
                        <div className="bg-slate-900 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-3 flex items-center">
                            <Target className="w-4 h-4 mr-2" />
                            Line Movement
                          </h4>

                          {/* Spread Movement */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-400 text-sm">Spread</span>
                              <div className="flex items-center space-x-2">
                                {movement.spread.direction === 'up' ? (
                                  <TrendingUp className="w-4 h-4 text-green-400" />
                                ) : movement.spread.direction === 'down' ? (
                                  <TrendingDown className="w-4 h-4 text-red-400" />
                                ) : null}
                                <span className="text-white font-mono">
                                  {movement.spread.opening > 0 ? '+' : ''}{movement.spread.opening}
                                  <ArrowRight className="inline w-4 h-4 mx-2 text-slate-500" />
                                  {movement.spread.current > 0 ? '+' : ''}{movement.spread.current}
                                </span>
                              </div>
                            </div>
                            {Math.abs(movement.spread.movement) > 0.5 && (
                              <div className="text-xs text-yellow-400">
                                Moved {Math.abs(movement.spread.movement).toFixed(1)} points
                              </div>
                            )}
                          </div>

                          {/* Total Movement */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-400 text-sm">Total</span>
                              <div className="flex items-center space-x-2">
                                {movement.total.direction === 'up' ? (
                                  <TrendingUp className="w-4 h-4 text-green-400" />
                                ) : movement.total.direction === 'down' ? (
                                  <TrendingDown className="w-4 h-4 text-red-400" />
                                ) : null}
                                <span className="text-white font-mono">
                                  {movement.total.opening}
                                  <ArrowRight className="inline w-4 h-4 mx-2 text-slate-500" />
                                  {movement.total.current}
                                </span>
                              </div>
                            </div>
                            {Math.abs(movement.total.movement) > 0.5 && (
                              <div className="text-xs text-yellow-400">
                                Moved {Math.abs(movement.total.movement).toFixed(1)} points
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Betting Percentages */}
                      {percentages && (
                        <div className="bg-slate-900 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-3">Betting Percentages</h4>

                          <div className="space-y-3">
                            {/* Home Team */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-slate-400 text-sm">{game.homeTeam.name}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500">Tickets:</span>
                                  <span className="text-white ml-2">{percentages.spread.homeTickets}%</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Money:</span>
                                  <span className={`ml-2 font-semibold ${
                                    percentages.spread.homeMoney > percentages.spread.homeTickets + 10
                                      ? 'text-green-400'
                                      : percentages.spread.homeMoney < percentages.spread.homeTickets - 10
                                      ? 'text-red-400'
                                      : 'text-white'
                                  }`}>
                                    {percentages.spread.homeMoney}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Away Team */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-slate-400 text-sm">{game.awayTeam.name}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500">Tickets:</span>
                                  <span className="text-white ml-2">{percentages.spread.awayTickets}%</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Money:</span>
                                  <span className={`ml-2 font-semibold ${
                                    percentages.spread.awayMoney > percentages.spread.awayTickets + 10
                                      ? 'text-green-400'
                                      : percentages.spread.awayMoney < percentages.spread.awayTickets - 10
                                      ? 'text-red-400'
                                      : 'text-white'
                                  }`}>
                                    {percentages.spread.awayMoney}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Sharp Money Indicator */}
                            {Math.abs(percentages.spread.homeMoney - percentages.spread.homeTickets) > 15 && (
                              <div className="text-xs bg-yellow-900/30 border border-yellow-700 rounded p-2 mt-2">
                                <span className="text-yellow-400 font-semibold">Sharp Money Detected:</span>
                                <span className="text-slate-300 ml-2">
                                  Money heavily on {percentages.spread.homeMoney > percentages.spread.homeTickets ? game.homeTeam.name : game.awayTeam.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-8 bg-slate-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">Understanding the Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-slate-300 font-semibold mb-2">Sharp Money Signals</h4>
                  <ul className="text-slate-400 space-y-1">
                    <li>• <span className="text-green-400">Follow Sharp</span>: High confidence sharp money detected</li>
                    <li>• <span className="text-blue-400">Fade Public</span>: Public betting heavily one side, line moving opposite</li>
                    <li>• <span className="text-red-400">Steam Move</span>: Sudden 1+ point movement (sharp action)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-slate-300 font-semibold mb-2">Money vs Tickets</h4>
                  <ul className="text-slate-400 space-y-1">
                    <li>• <span className="text-green-400">Green</span>: Sharp money (higher money % than tickets)</li>
                    <li>• <span className="text-red-400">Red</span>: Public fade opportunity</li>
                    <li>• <span className="text-white">White</span>: Balanced action</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
