'use client';

import { useEffect, useState } from 'react';
import { NFLAPI } from '@/lib/api/nfl';
import { OddsAPI } from '@/lib/api/odds';
import { LineMovementTracker, LineMovement, SharpMoneyIndicator, BettingPercentages } from '@/lib/models/lineMovement';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Game, GamePrediction } from '@/types';
import { format } from 'date-fns';
import {
  TrendingUp, TrendingDown, AlertTriangle, Target, ArrowRight,
  Zap, Clock, MapPin, Cloud, Wind, Droplets, Trophy, Flame,
  Activity, DollarSign, Eye
} from 'lucide-react';
import LoggedInHeader from '@/components/LoggedInHeader';
import AILoadingAnimation from '@/components/AILoadingAnimation';

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [movements, setMovements] = useState<Map<string, LineMovement>>(new Map());
  const [sharpSignals, setSharpSignals] = useState<Map<string, SharpMoneyIndicator>>(new Map());
  const [bettingPercentages, setBettingPercentages] = useState<Map<string, BettingPercentages>>(new Map());
  const [currentOdds, setCurrentOdds] = useState<Map<string, any>>(new Map());
  const [predictions, setPredictions] = useState<Map<string, GamePrediction>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [tracker] = useState(() => new LineMovementTracker());

  useEffect(() => {
    loadDashboardData();
    // Refresh every 1 minute for live score updates
    const interval = setInterval(loadDashboardData, 1 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      const weekGames = await NFLAPI.getWeekGames(season, week);
      // Show all games (scheduled, in_progress, completed) - filter happens later if needed
      setGames(weekGames);

      // Stop loading after games are loaded - odds/predictions can load in background
      setLoading(false);

      // Load cached predictions from Firebase
      try {
        const cached = await FirestoreService.getCachedPredictions(season, week);
        if (cached.predictions.length > 0) {
          const newPredictions = new Map<string, GamePrediction>();
          for (const pred of cached.predictions) {
            const game = cached.games.find(g => g.id === pred.gameId);
            if (game) {
              newPredictions.set(pred.gameId, {
                gameId: pred.gameId,
                game: game,
                predictedWinner: pred.predictedWinner,
                confidence: pred.confidence,
                predictedScore: pred.predictedScore,
                factors: pred.factors,
                edgeAnalysis: pred.edgeAnalysis,
                recommendation: pred.recommendation,
              });
            }
          }
          setPredictions(newPredictions);
          console.log(`✅ Loaded ${newPredictions.size} predictions for high confidence count`);
        } else {
          console.warn(`⚠️ No predictions found in cache for Season ${season}, Week ${week}`);
        }
      } catch (error) {
        console.error('❌ Failed to load predictions:', error);
        // Continue without predictions
      }

      // Try to load odds from cache first (much faster!)
      let oddsData: any[] = [];
      try {
        const cachedOdds = await FirestoreService.getCachedOdds(season, week);
        if (cachedOdds) {
          oddsData = cachedOdds;
          console.log('✅ Loaded cached odds for', oddsData.length, 'games');
        } else {
          // Fallback to API if cache is empty/expired
          console.log('⚠️ No cached odds found, fetching from API...');
          oddsData = await OddsAPI.getNFLOdds();
          console.log('Fetched odds from API for', oddsData.length, 'games');
        }
      } catch (error) {
        console.error('Failed to fetch odds - spreads will not be displayed:', error);
        // Continue without odds data
      }

      const newMovements = new Map<string, LineMovement>();
      const newSharpSignals = new Map<string, SharpMoneyIndicator>();
      const newPercentages = new Map<string, BettingPercentages>();
      const newOdds = new Map<string, any>();

      // Debug: Log first game and first odds entry for comparison
      if (weekGames.length > 0 && oddsData.length > 0) {
        console.log('First game:', {
          homeTeam: weekGames[0].homeTeam.name,
          awayTeam: weekGames[0].awayTeam.name,
          homeAbbr: weekGames[0].homeTeam.abbreviation,
          awayAbbr: weekGames[0].awayTeam.abbreviation
        });
        console.log('First odds entry:', {
          home_team: oddsData[0].home_team,
          away_team: oddsData[0].away_team
        });
      }

      for (const game of weekGames) {
        // Process all games, not just scheduled ones
        // if (game.status !== 'scheduled') continue;

        // Match by full team name (case insensitive)
        const gameOdds = oddsData.find((o: any) => {
          const homeMatch = o.home_team?.toLowerCase().includes(game.homeTeam.name.toLowerCase()) ||
                          game.homeTeam.name.toLowerCase().includes(o.home_team?.toLowerCase());
          const awayMatch = o.away_team?.toLowerCase().includes(game.awayTeam.name.toLowerCase()) ||
                          game.awayTeam.name.toLowerCase().includes(o.away_team?.toLowerCase());
          return homeMatch && awayMatch;
        });

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

      console.log('Dashboard loaded:', {
        totalGamesCount: weekGames.length,
        scheduledGamesCount: weekGames.filter(g => g.status === 'scheduled').length,
        inProgressGamesCount: weekGames.filter(g => g.status === 'in_progress').length,
        completedGamesCount: weekGames.filter(g => g.status === 'completed').length,
        oddsCount: newOdds.size,
        movementsCount: newMovements.size,
        sampleOdds: newOdds.size > 0 ? Array.from(newOdds.entries())[0] : 'none'
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  // Get team logo URL from ESPN
  const getTeamLogo = (teamAbbr: string) => {
    const espnTeamIds: Record<string, string> = {
      'ARI': '22', 'ATL': '1', 'BAL': '33', 'BUF': '2', 'CAR': '29', 'CHI': '3',
      'CIN': '4', 'CLE': '5', 'DAL': '6', 'DEN': '7', 'DET': '8', 'GB': '9',
      'HOU': '34', 'IND': '11', 'JAX': '30', 'KC': '12', 'LV': '13', 'LAC': '24',
      'LAR': '14', 'MIA': '15', 'MIN': '16', 'NE': '17', 'NO': '18', 'NYG': '19',
      'NYJ': '20', 'PHI': '21', 'PIT': '23', 'SF': '25', 'SEA': '26', 'TB': '27',
      'TEN': '10', 'WAS': '28'
    };
    const teamId = espnTeamIds[teamAbbr];
    return teamId ? `https://a.espncdn.com/i/teamlogos/nfl/500/${teamId}.png` : null;
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

  // Count high confidence predictions from ML model
  const highConfidenceGames = Array.from(predictions.values())
    .filter(pred => pred.confidence >= 75) // High confidence is 75%+
    .length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <LoggedInHeader />

      {/* Hero Stats Bar - Compact */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{games.length}</div>
              <div className="text-xs text-slate-400">Games</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{highConfidenceGames}</div>
              <div className="text-xs text-slate-400">High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">58.1%</div>
              <div className="text-xs text-slate-400">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">+11.9%</div>
              <div className="text-xs text-slate-400">ROI</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Compact */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {loading ? (
          <AILoadingAnimation />
        ) : (
          <>
            {/* High Confidence Picks - Enhanced */}
            {highConfidenceGames > 0 && (
              <div className="mb-4 relative overflow-hidden">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-green-600/20 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-2 border-green-500/50 rounded-xl p-4 shadow-lg shadow-green-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg animate-pulse">
                        <Flame className="text-green-400 w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                          🔥 HOT PICKS
                          <span className="text-xs font-normal text-green-300 bg-green-500/20 px-2 py-1 rounded-full">
                            HIGH CONFIDENCE
                          </span>
                        </h2>
                        <p className="text-xs text-green-300">AI Model Confidence ≥75%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-green-400">{highConfidenceGames}</div>
                      <div className="text-xs text-green-300">Pick{highConfidenceGames > 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {Array.from(predictions.values())
                      .filter(pred => pred.confidence >= 75)
                      .map((prediction) => {
                        const game = prediction.game;
                        const odds = currentOdds.get(game.id);
                        const currentSpread = odds?.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads');
                        const homeSpreadValue = currentSpread?.outcomes?.find((o: any) =>
                          o.name === game.homeTeam.name || o.name.includes(game.homeTeam.abbreviation)
                        )?.point;

                        return (
                          <div key={game.id} className="bg-slate-800/80 backdrop-blur border border-green-500/30 rounded-lg p-3 hover:border-green-400/50 transition">
                            <div className="flex items-center justify-between mb-2">
                              {/* Team matchup with logos */}
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 flex-shrink-0">
                                  {getTeamLogo(game.awayTeam.abbreviation) ? (
                                    <img
                                      src={getTeamLogo(game.awayTeam.abbreviation)!}
                                      alt={game.awayTeam.name}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold">
                                      {game.awayTeam.abbreviation}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-white">{game.awayTeam.name}</div>
                                  <div className="text-xs text-slate-400">@ {game.homeTeam.name}</div>
                                </div>
                              </div>

                              {/* Confidence badge */}
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-2xl font-black text-green-400">{prediction.confidence}%</div>
                                  <div className="text-xs text-green-300">Confidence</div>
                                </div>
                              </div>
                            </div>

                            {/* Pick details */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-bold text-green-400">
                                  PICK: {prediction.predictedWinner === 'home' ? game.homeTeam.name : game.awayTeam.name}
                                </span>
                              </div>
                              {homeSpreadValue !== undefined && (
                                <div className="text-xs font-mono text-slate-400">
                                  Spread: {game.homeTeam.abbreviation} {homeSpreadValue > 0 ? '+' : ''}{homeSpreadValue}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Games Grid - Compact */}
            <div className="space-y-3">
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

                // Debug logging for first game
                if (games.indexOf(game) === 0) {
                  console.log(`First Game Debug (${game.homeTeam.abbreviation}):`, {
                    hasOdds: !!odds,
                    oddsKeys: odds ? Object.keys(odds) : [],
                    bookmakers: odds?.bookmakers?.length,
                    markets: odds?.bookmakers?.[0]?.markets?.map((m: any) => m.key),
                    currentSpread,
                    spreadOutcomes: currentSpread?.outcomes,
                    homeSpreadValue,
                    homeTeamName: game.homeTeam.name,
                    homeTeamAbbr: game.homeTeam.abbreviation,
                    currentOddsSize: currentOdds.size
                  });
                }

                return (
                  <div
                    key={game.id}
                    className={`bg-slate-800/50 backdrop-blur border rounded-xl overflow-hidden transition-all ${
                      game.status === 'in_progress'
                        ? 'border-red-500/50 shadow-lg shadow-red-500/20'
                        : game.status === 'completed'
                        ? 'border-slate-600/30 opacity-70'
                        : sharpSignal && (sharpSignal.confidence === 'very_high' || sharpSignal.confidence === 'high')
                        ? 'border-green-500/30 shadow-lg shadow-green-500/10'
                        : 'border-slate-700/50'
                    }`}
                  >
                    {/* Game Header - Compact */}
                    <div
                      className="p-4 cursor-pointer hover:bg-slate-800/70 transition"
                      onClick={() => setSelectedGame(isExpanded ? null : game.id)}
                    >
                      {/* Team Matchup with Logos - Compact */}
                      <div className="flex items-center justify-between mb-3">
                        {/* Away Team */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 flex-shrink-0">
                            {getTeamLogo(game.awayTeam.abbreviation) ? (
                              <img
                                src={getTeamLogo(game.awayTeam.abbreviation)!}
                                alt={game.awayTeam.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-700 rounded-full flex items-center justify-center text-lg font-bold">
                                {game.awayTeam.abbreviation}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-base font-bold text-white">{game.awayTeam.name}</div>
                            <div className="text-xs text-slate-400">Away</div>
                          </div>
                          {(game.status === 'in_progress' || game.status === 'completed') && (
                            <div className="text-2xl font-black text-white">{game.awayScore}</div>
                          )}
                        </div>

                        {/* VS + Spread */}
                        <div className="px-4 text-center">
                          <div className="text-sm font-bold text-slate-500 mb-1">VS</div>
                          {homeSpreadValue !== undefined && (
                            <div className="bg-blue-600/20 border border-blue-500/30 rounded px-3 py-1">
                              <div className="text-[10px] text-blue-300">Spread</div>
                              <div className="font-mono font-bold text-sm text-white">
                                {game.homeTeam.abbreviation} {homeSpreadValue > 0 ? '+' : ''}{homeSpreadValue}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Home Team */}
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          {(game.status === 'in_progress' || game.status === 'completed') && (
                            <div className="text-2xl font-black text-white">{game.homeScore}</div>
                          )}
                          <div className="text-right flex-1">
                            <div className="text-base font-bold text-white">{game.homeTeam.name}</div>
                            <div className="text-xs text-slate-400">Home</div>
                          </div>
                          <div className="w-12 h-12 flex-shrink-0">
                            {getTeamLogo(game.homeTeam.abbreviation) ? (
                              <img
                                src={getTeamLogo(game.homeTeam.abbreviation)!}
                                alt={game.homeTeam.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-700 rounded-full flex items-center justify-center text-lg font-bold">
                                {game.homeTeam.abbreviation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Game Info Row - Compact */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-slate-400">
                          {/* Game Status Badge */}
                          {game.status === 'in_progress' && (
                            <div className="flex items-center gap-1 bg-red-600/20 border border-red-500/50 text-red-400 px-2 py-1 rounded-full animate-pulse">
                              <Activity className="w-3 h-3" />
                              <span className="font-semibold">LIVE</span>
                            </div>
                          )}
                          {game.status === 'completed' && (
                            <div className="flex items-center gap-1 bg-slate-700/50 text-slate-400 px-2 py-1 rounded-full">
                              <span className="font-semibold">FINAL</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{format(game.gameTime, 'EEE, MMM d • h:mm a')}</span>
                          </div>
                          <div className="hidden md:flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{game.venue}</span>
                          </div>
                          {game.weather && (
                            <div className="hidden lg:flex items-center gap-1">
                              <Cloud className="w-3 h-3" />
                              <span>{game.weather.temperature}°F</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {sharpSignal && getRecommendationBadge(sharpSignal.recommendation)}
                          <ArrowRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
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
