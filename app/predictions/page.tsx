'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { NFLAPI } from '@/lib/api/nfl';
import { OddsAPI } from '@/lib/api/odds';
import { WeatherAPI } from '@/lib/api/weather';
import { GamePredictor } from '@/lib/models/predictor';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Game, GamePrediction } from '@/types';
import { format } from 'date-fns';
import LoggedInHeader from '@/components/LoggedInHeader';
import AILoadingAnimation from '@/components/AILoadingAnimation';
import { Brain, Database, Cpu, BarChart3 } from 'lucide-react';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default function PredictionsPage() {
  const searchParams = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [predictions, setPredictions] = useState<Map<string, GamePrediction>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bettingLines, setBettingLines] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    loadPredictions();
    const gameId = searchParams.get('game');
    if (gameId) {
      setSelectedGame(gameId);
    }
  }, [searchParams]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();

      // Try to load from cache first (fast!)
      console.log('📦 Loading cached predictions from Firebase...');
      const cached = await FirestoreService.getCachedPredictions(season, week);

      if (cached.predictions.length > 0) {
        console.log(`✅ Loaded ${cached.predictions.length} cached predictions`);
        setGames(cached.games);
        setLastUpdate(cached.lastUpdate);

        // Build predictions map
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
      } else {
        // No cache - generate predictions on-the-fly
        console.log('⚠️  No cached predictions found. Generating fresh predictions...');
        await generatePredictions();
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePredictions = async () => {
    try {
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      const weekGames = await NFLAPI.getWeekGames(season, week);
      const scheduledGames = weekGames.filter(g => g.status === 'scheduled');

      setGames(scheduledGames);

      // Get betting odds
      let oddsData: any[] = [];
      try {
        oddsData = await OddsAPI.getNFLOdds();
      } catch (error) {
        console.error('Error fetching odds:', error);
      }

      const newPredictions = new Map<string, GamePrediction>();
      const newBettingLines = new Map<string, any>();

      for (const game of scheduledGames) {
        try {
          // Get team stats
          const [homeStats, awayStats] = await Promise.all([
            NFLAPI.getTeamStats(game.homeTeam.id, season),
            NFLAPI.getTeamStats(game.awayTeam.id, season)
          ]);

          // Find betting lines
          const gameOdds = oddsData.find((o: any) => {
            const matchHome = o.home_team?.toLowerCase().includes(game.homeTeam.name.toLowerCase()) ||
                             o.home_team?.toLowerCase().includes(game.homeTeam.abbreviation.toLowerCase());
            const matchAway = o.away_team?.toLowerCase().includes(game.awayTeam.name.toLowerCase()) ||
                             o.away_team?.toLowerCase().includes(game.awayTeam.abbreviation.toLowerCase());
            return matchHome && matchAway;
          });

          let bettingLines;
          if (gameOdds) {
            bettingLines = OddsAPI.transformToBettingLines(gameOdds);
            newBettingLines.set(game.id, gameOdds);
          }

          // Generate prediction
          const prediction = await GamePredictor.predictGame(
            game,
            homeStats,
            awayStats,
            null,
            bettingLines
          );

          newPredictions.set(game.id, prediction);
        } catch (error) {
          console.error(`Error predicting game ${game.id}:`, error);
        }
      }

      setPredictions(newPredictions);
      setBettingLines(newBettingLines);
      setLastUpdate(new Date());
      console.log(`✅ Generated ${newPredictions.size} predictions`);
    } catch (error) {
      console.error('Error generating predictions:', error);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Triggering data refresh...');

      // Call the update API endpoint
      const response = await fetch('/api/update-data', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Refresh complete! Updated ${result.stats.updated} games`);
        // Reload from cache to show new data
        await loadPredictions();
      } else {
        console.error('❌ Refresh failed:', result.error);
        alert('Failed to refresh data. Check console for details.');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('Failed to refresh data. Check console for details.');
    } finally {
      setRefreshing(false);
    }
  };

  const getRecommendationColor = (rec: GamePrediction['recommendation']) => {
    switch (rec) {
      case 'strong_bet':
        return 'bg-green-600';
      case 'value_bet':
        return 'bg-blue-600';
      case 'avoid':
        return 'bg-red-600';
      case 'wait':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getRecommendationText = (rec: GamePrediction['recommendation']) => {
    switch (rec) {
      case 'strong_bet':
        return 'Strong Bet';
      case 'value_bet':
        return 'Value Bet';
      case 'avoid':
        return 'Avoid';
      case 'wait':
        return 'Wait for Better Line';
      default:
        return 'No Recommendation';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <LoggedInHeader />

      {/* Page Header - Compact */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Game Predictions</h1>
              {lastUpdate && (
                <p className="text-slate-500 text-xs mt-0.5">
                  Updated: {format(lastUpdate, 'MMM d, h:mm a')}
                </p>
              )}
            </div>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className={`
                px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2
                ${refreshing
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              {refreshing ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Compact */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {loading ? (
          <AILoadingAnimation
            title="PREDICTION ENGINE ACTIVE"
            subtitle="Analyzing matchups and generating AI predictions..."
            steps={[
              { label: 'Loading game schedules', icon: Database, delay: 0 },
              { label: 'Fetching current odds data', icon: BarChart3, delay: 200 },
              { label: 'Running ML prediction models', icon: Brain, delay: 400 },
              { label: 'Analyzing weather conditions', icon: Cpu, delay: 600 },
              { label: 'Calculating confidence scores', icon: BarChart3, delay: 800 },
              { label: 'Generating recommendations', icon: Brain, delay: 1000 },
            ]}
          />
        ) : (
          <div className="grid gap-3">
            {Array.from(predictions.entries()).map(([gameId, prediction]) => {
              // Extract current spread from betting lines
              const odds = bettingLines.get(gameId);
              const currentSpread = odds?.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads');
              const homeSpreadValue = currentSpread?.outcomes?.find((o: any) =>
                o.name === prediction.game.homeTeam.name || o.name.includes(prediction.game.homeTeam.abbreviation)
              )?.point;

              return (
              <div
                key={gameId}
                className="bg-slate-800 rounded-lg p-4 hover:bg-slate-750 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  {/* Game Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-bold text-white">
                        {prediction.game.awayTeam.name} @ {prediction.game.homeTeam.name}
                      </h3>
                      <span
                        className={`${getRecommendationColor(
                          prediction.recommendation
                        )} text-white text-xs px-2 py-1 rounded-full font-semibold`}
                      >
                        {getRecommendationText(prediction.recommendation)}
                      </span>
                      {homeSpreadValue !== undefined && (
                        <span className="text-slate-400 text-xs font-mono">
                          Spread: {prediction.game.homeTeam.abbreviation} {homeSpreadValue > 0 ? '+' : ''}{homeSpreadValue}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">
                      {format(prediction.game.gameTime, 'EEE, MMM d - h:mm a')}
                    </p>
                  </div>

                  {/* Confidence */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {prediction.confidence}%
                    </div>
                    <div className="text-slate-400 text-xs">Confidence</div>
                  </div>
                </div>

                {/* Prediction */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-slate-400 text-xs mb-1">Predicted Winner</div>
                    <div className="text-base font-bold text-white">
                      {prediction.predictedWinner === 'home'
                        ? prediction.game.homeTeam.name
                        : prediction.game.awayTeam.name}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-slate-400 text-xs mb-1">Predicted Score</div>
                    <div className="text-base font-bold text-white">
                      {prediction.predictedScore.away} - {prediction.predictedScore.home}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-3 text-center">
                    <div className="text-slate-400 text-xs mb-1">Spread Edge</div>
                    <div
                      className={`text-base font-bold ${
                        Math.abs(prediction.edgeAnalysis.spread) > 3
                          ? 'text-green-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {prediction.edgeAnalysis.spread > 0 ? '+' : ''}
                      {prediction.edgeAnalysis.spread.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Prediction Factors - Compact */}
                <div className="border-t border-slate-700 pt-3">
                  <h4 className="text-white font-semibold text-sm mb-2">Key Factors</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {prediction.factors.map((factor, idx) => (
                      <div key={idx} className="bg-slate-900 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-sm">
                            {factor.name}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              factor.value > 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {factor.value > 0 ? '+' : ''}
                            {factor.value.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <button
                    onClick={() =>
                      setSelectedGame(selectedGame === gameId ? null : gameId)
                    }
                    className="text-blue-400 hover:text-blue-300 transition text-sm font-medium"
                  >
                    {selectedGame === gameId ? 'Hide Details ↑' : 'View Full Analysis →'}
                  </button>
                </div>

                {/* Expanded Details */}
                {selectedGame === gameId && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                    {/* Edge Analysis Breakdown */}
                    <div>
                      <h5 className="text-white font-semibold mb-3">Edge Analysis</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-slate-900 rounded p-4">
                          <div className="text-slate-400 text-xs mb-1">Spread Edge</div>
                          <div className={`text-2xl font-bold ${
                            Math.abs(prediction.edgeAnalysis.spread) > 3 ? 'text-green-400' : 'text-slate-400'
                          }`}>
                            {prediction.edgeAnalysis.spread > 0 ? '+' : ''}
                            {prediction.edgeAnalysis.spread.toFixed(1)} pts
                          </div>
                          <div className="text-slate-500 text-xs mt-1">
                            {Math.abs(prediction.edgeAnalysis.spread) > 4 ? 'STRONG EDGE' :
                             Math.abs(prediction.edgeAnalysis.spread) > 2.5 ? 'GOOD EDGE' :
                             Math.abs(prediction.edgeAnalysis.spread) > 1.5 ? 'SLIGHT EDGE' : 'NO EDGE'}
                          </div>
                        </div>

                        <div className="bg-slate-900 rounded p-4">
                          <div className="text-slate-400 text-xs mb-1">Total Edge</div>
                          <div className={`text-2xl font-bold ${
                            Math.abs(prediction.edgeAnalysis.total) > 3 ? 'text-green-400' : 'text-slate-400'
                          }`}>
                            {prediction.edgeAnalysis.total > 0 ? '+' : ''}
                            {prediction.edgeAnalysis.total.toFixed(1)} pts
                          </div>
                          <div className="text-slate-500 text-xs mt-1">
                            {prediction.edgeAnalysis.total > 3 ? 'Bet OVER' :
                             prediction.edgeAnalysis.total < -3 ? 'Bet UNDER' : 'PASS'}
                          </div>
                        </div>

                        <div className="bg-slate-900 rounded p-4">
                          <div className="text-slate-400 text-xs mb-1">Confidence</div>
                          <div className="text-2xl font-bold text-blue-400">
                            {prediction.confidence}%
                          </div>
                          <div className="text-slate-500 text-xs mt-1">
                            {prediction.confidence >= 75 ? 'VERY HIGH' :
                             prediction.confidence >= 65 ? 'HIGH' :
                             prediction.confidence >= 50 ? 'MEDIUM' : 'LOW'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Betting Recommendation */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-4 border border-slate-700">
                      <h5 className="text-white font-semibold mb-2">Betting Recommendation</h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Suggested Bet:</span>
                          <span className={`font-bold ${
                            prediction.recommendation === 'strong_bet' ? 'text-green-400' :
                            prediction.recommendation === 'value_bet' ? 'text-blue-400' :
                            prediction.recommendation === 'wait' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {getRecommendationText(prediction.recommendation).toUpperCase()}
                          </span>
                        </div>
                        {prediction.edgeAnalysis.spread !== 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Spread Pick:</span>
                            <span className="text-white font-semibold">
                              {prediction.edgeAnalysis.spread > 0
                                ? `${prediction.game.homeTeam.name} (Home)`
                                : `${prediction.game.awayTeam.name} (Away)`}
                            </span>
                          </div>
                        )}
                        {Math.abs(prediction.edgeAnalysis.total) > 3 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Total Pick:</span>
                            <span className="text-white font-semibold">
                              {prediction.edgeAnalysis.total > 3 ? 'OVER' : 'UNDER'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Team Stats Comparison */}
                    <div>
                      <h5 className="text-white font-semibold mb-3">Team Comparison</h5>
                      <div className="bg-slate-900 rounded p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="text-left">
                            <div className="font-semibold text-white">{prediction.game.awayTeam.abbreviation}</div>
                            <div className="text-xs text-slate-400">Away</div>
                          </div>
                          <div className="text-slate-500 text-xs">VS</div>
                          <div className="text-right">
                            <div className="font-semibold text-white">{prediction.game.homeTeam.abbreviation}</div>
                            <div className="text-xs text-slate-400">Home</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div className="text-right text-lg font-bold text-white">
                            {prediction.predictedScore.away}
                          </div>
                          <div className="text-center text-xs text-slate-500">Predicted Score</div>
                          <div className="text-left text-lg font-bold text-white">
                            {prediction.predictedScore.home}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div className={`text-right font-semibold ${
                            prediction.predictedWinner === 'away' ? 'text-green-400' : 'text-slate-500'
                          }`}>
                            {prediction.predictedWinner === 'away' ? '✓ Winner' : ''}
                          </div>
                          <div className="text-center text-xs text-slate-500">Prediction</div>
                          <div className={`text-left font-semibold ${
                            prediction.predictedWinner === 'home' ? 'text-green-400' : 'text-slate-500'
                          }`}>
                            {prediction.predictedWinner === 'home' ? 'Winner ✓' : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Game Info */}
                    <div>
                      <h5 className="text-white font-semibold mb-3">Game Details</h5>
                      <div className="bg-slate-900 rounded p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Venue:</span>
                          <span className="text-white">{prediction.game.venue || 'TBD'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Kickoff:</span>
                          <span className="text-white">
                            {format(prediction.game.gameTime, 'EEEE, MMM d @ h:mm a')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Season / Week:</span>
                          <span className="text-white">{prediction.game.season} / Week {prediction.game.week}</span>
                        </div>
                      </div>
                    </div>

                    {/* Betting Tips */}
                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                      <h5 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Betting Tips
                      </h5>
                      <ul className="text-blue-200 text-sm space-y-1">
                        <li>• Shop multiple sportsbooks for best line</li>
                        <li>• Consider line movement before game time</li>
                        <li>• Never bet more than 2-5% of bankroll per game</li>
                        <li>• Track all bets for long-term analysis</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              );
            })}

            {predictions.size === 0 && (
              <div className="bg-slate-800 rounded-lg p-12 text-center">
                <p className="text-slate-400 text-lg">
                  No predictions available
                </p>
                <p className="text-slate-500 mt-2">
                  Check back closer to game time for updated predictions
                </p>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            <strong>Disclaimer:</strong> These predictions are for informational and
            educational purposes only. They are based on statistical models and historical
            data. Past performance does not guarantee future results. Always gamble
            responsibly and within your means.
          </p>
        </div>
      </div>
    </div>
  );
}
