'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NFLAPI } from '@/lib/api/nfl';
import { OddsAPI } from '@/lib/api/odds';
import { WeatherAPI } from '@/lib/api/weather';
import { GamePredictor } from '@/lib/models/predictor';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Game, GamePrediction } from '@/types';
import { format } from 'date-fns';

export default function PredictionsPage() {
  const searchParams = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [predictions, setPredictions] = useState<Map<string, GamePrediction>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

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
      const weekGames = await NFLAPI.getWeekGames(season, week);
      setGames(weekGames);

      // Fetch betting odds from The Odds API
      console.log('Fetching NFL betting odds...');
      let oddsData: any[] = [];
      try {
        oddsData = await OddsAPI.getNFLOdds();
        console.log('Successfully fetched odds for', oddsData.length, 'games');
      } catch (error) {
        console.error('Error fetching odds:', error);
        console.log('Continuing without betting lines...');
      }

      // Generate predictions for each game
      const newPredictions = new Map<string, GamePrediction>();

      for (const game of weekGames) {
        if (game.status === 'scheduled') {
          const homeStats = await NFLAPI.getTeamStats(game.homeTeam.id);
          const awayStats = await NFLAPI.getTeamStats(game.awayTeam.id);
          const weather = await WeatherAPI.getForecast(game.homeTeam.name, game.gameTime);

          // Find betting lines for this game
          let bettingLines;
          try {
            const gameOdds = oddsData.find((o: any) => {
              const matchHome = o.home_team?.toLowerCase().includes(game.homeTeam.name.toLowerCase()) ||
                               o.home_team?.toLowerCase().includes(game.homeTeam.abbreviation.toLowerCase());
              const matchAway = o.away_team?.toLowerCase().includes(game.awayTeam.name.toLowerCase()) ||
                               o.away_team?.toLowerCase().includes(game.awayTeam.abbreviation.toLowerCase());
              return matchHome && matchAway;
            });

            if (gameOdds) {
              bettingLines = OddsAPI.transformToBettingLines(gameOdds);
              console.log(`Found ${bettingLines.length} betting lines for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`);
            }
          } catch (error) {
            console.error(`Error processing odds for game ${game.id}:`, error);
          }

          const prediction = await GamePredictor.predictGame(
            game,
            homeStats,
            awayStats,
            weather,
            bettingLines
          );

          newPredictions.set(game.id, prediction);

          // Save to Firebase
          try {
            await FirestoreService.saveGame(game);
            await FirestoreService.savePrediction(prediction);
            if (bettingLines && bettingLines.length > 0) {
              await FirestoreService.saveBettingLines(game.id, bettingLines);
            }
            console.log(`Saved prediction for ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} to Firebase`);
          } catch (error) {
            console.error('Error saving to Firebase:', error);
          }
        }
      }

      setPredictions(newPredictions);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
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
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-white">Game Predictions</h1>
          <p className="text-slate-400 mt-2">
            AI-powered predictions based on statistical analysis
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition pb-1"
            >
              Games
            </Link>
            <Link
              href="/predictions"
              className="text-white font-semibold border-b-2 border-blue-500 pb-1"
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
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-400 mt-4">Analyzing games and generating predictions...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {Array.from(predictions.entries()).map(([gameId, prediction]) => (
              <div
                key={gameId}
                className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition"
              >
                <div className="flex items-start justify-between mb-6">
                  {/* Game Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-2xl font-bold text-white">
                        {prediction.game.awayTeam.name} @ {prediction.game.homeTeam.name}
                      </h3>
                      <span
                        className={`${getRecommendationColor(
                          prediction.recommendation
                        )} text-white text-sm px-3 py-1 rounded-full font-semibold`}
                      >
                        {getRecommendationText(prediction.recommendation)}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      {format(prediction.game.gameTime, 'EEEE, MMMM d, yyyy - h:mm a')}
                    </p>
                  </div>

                  {/* Confidence */}
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">
                      {prediction.confidence}%
                    </div>
                    <div className="text-slate-400 text-sm">Confidence</div>
                  </div>
                </div>

                {/* Prediction */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">Predicted Winner</div>
                    <div className="text-xl font-bold text-white">
                      {prediction.predictedWinner === 'home'
                        ? prediction.game.homeTeam.name
                        : prediction.game.awayTeam.name}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">Predicted Score</div>
                    <div className="text-xl font-bold text-white">
                      {prediction.predictedScore.away} - {prediction.predictedScore.home}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">Spread Edge</div>
                    <div
                      className={`text-xl font-bold ${
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

                {/* Prediction Factors */}
                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-white font-semibold mb-3">Key Factors</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {prediction.factors.map((factor, idx) => (
                      <div key={idx} className="bg-slate-900 rounded p-3">
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
                    className="text-blue-400 hover:text-blue-300 transition text-sm"
                  >
                    {selectedGame === gameId ? 'Hide Details' : 'View Full Analysis'} →
                  </button>
                </div>
              </div>
            ))}

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
    </main>
  );
}
