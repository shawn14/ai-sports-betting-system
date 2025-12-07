'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NFLAPI } from '@/lib/api/nfl';
import { OddsAPI } from '@/lib/api/odds';
import { GamePredictor } from '@/lib/models/predictor';
import { Game, BettingLine } from '@/types';
import { format } from 'date-fns';
import { TrendingUp, Target, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface EdgeAnalysis {
  game: Game;
  mlPrediction: {
    spread: number;
    total: number;
    homeScore: number;
    awayScore: number;
    confidence: number;
  };
  vegasLines: {
    spread: number;
    total: number;
    bookmaker: string;
  } | null;
  edge: {
    spread: number;
    total: number;
    recommendation: 'STRONG BET' | 'GOOD BET' | 'SLIGHT EDGE' | 'NO EDGE';
    betOn: 'home' | 'away' | 'none';
    totalRec: 'OVER' | 'UNDER' | 'PASS';
  };
}

export default function EdgeDetectionPage() {
  const [edges, setEdges] = useState<EdgeAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'edge' | 'confidence'>('edge');

  useEffect(() => {
    loadEdgeAnalysis();
  }, []);

  const loadEdgeAnalysis = async () => {
    try {
      setLoading(true);

      // Get current week games
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      const weekGames = await NFLAPI.getWeekGames(season, week);
      const scheduledGames = weekGames.filter(g => g.status === 'scheduled');

      // Get betting odds
      let oddsData: any[] = [];
      try {
        oddsData = await OddsAPI.getNFLOdds();
      } catch (error) {
        console.error('Error fetching odds:', error);
      }

      // Analyze each game
      const analyses: EdgeAnalysis[] = [];

      for (const game of scheduledGames) {
        // Get team stats
        const homeStats = await NFLAPI.getTeamStats(game.homeTeam.id, season);
        const awayStats = await NFLAPI.getTeamStats(game.awayTeam.id, season);

        // Generate ML prediction (using current rules-based model for now)
        const prediction = await GamePredictor.predictGame(
          game,
          homeStats,
          awayStats,
          null
        );

        // Find Vegas lines
        const gameOdds = oddsData.find((o: any) => {
          const matchHome = o.home_team?.toLowerCase().includes(game.homeTeam.name.toLowerCase()) ||
                           o.home_team?.toLowerCase().includes(game.homeTeam.abbreviation.toLowerCase());
          const matchAway = o.away_team?.toLowerCase().includes(game.awayTeam.name.toLowerCase()) ||
                           o.away_team?.toLowerCase().includes(game.awayTeam.abbreviation.toLowerCase());
          return matchHome && matchAway;
        });

        let vegasLines = null;
        let edge: {
          spread: number;
          total: number;
          recommendation: 'STRONG BET' | 'GOOD BET' | 'SLIGHT EDGE' | 'NO EDGE';
          betOn: 'home' | 'away' | 'none';
          totalRec: 'OVER' | 'UNDER' | 'PASS';
        } = {
          spread: 0,
          total: 0,
          recommendation: 'NO EDGE',
          betOn: 'none',
          totalRec: 'PASS'
        };

        if (gameOdds && gameOdds.bookmakers && gameOdds.bookmakers.length > 0) {
          const bookmaker = gameOdds.bookmakers[0];
          const spreads = bookmaker.markets?.find((m: any) => m.key === 'spreads');
          const totals = bookmaker.markets?.find((m: any) => m.key === 'totals');

          if (spreads && spreads.outcomes) {
            const homeSpread = spreads.outcomes.find((o: any) => o.name === game.homeTeam.name || o.name === game.homeTeam.abbreviation);
            const vegasSpread = homeSpread ? homeSpread.point : 0;

            vegasLines = {
              spread: vegasSpread,
              total: totals?.outcomes?.[0]?.point || 0,
              bookmaker: bookmaker.title
            };

            // Calculate ML spread
            const mlSpread = prediction.predictedScore.home - prediction.predictedScore.away;

            // Calculate edge
            const spreadEdge = mlSpread - vegasSpread;
            const totalEdge = (prediction.predictedScore.home + prediction.predictedScore.away) - (vegasLines.total || 0);

            edge = {
              spread: Math.round(spreadEdge * 10) / 10,
              total: Math.round(totalEdge * 10) / 10,
              recommendation: getRecommendation(Math.abs(spreadEdge)),
              betOn: spreadEdge > 0 ? 'home' : spreadEdge < 0 ? 'away' : 'none',
              totalRec: totalEdge > 3 ? 'OVER' : totalEdge < -3 ? 'UNDER' : 'PASS'
            };
          }
        }

        analyses.push({
          game,
          mlPrediction: {
            spread: prediction.predictedScore.home - prediction.predictedScore.away,
            total: prediction.predictedScore.home + prediction.predictedScore.away,
            homeScore: prediction.predictedScore.home,
            awayScore: prediction.predictedScore.away,
            confidence: prediction.confidence
          },
          vegasLines,
          edge
        });
      }

      setEdges(analyses);

    } catch (error) {
      console.error('Error loading edge analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendation = (absEdge: number): 'STRONG BET' | 'GOOD BET' | 'SLIGHT EDGE' | 'NO EDGE' => {
    if (absEdge >= 4) return 'STRONG BET';
    if (absEdge >= 2.5) return 'GOOD BET';
    if (absEdge >= 1.5) return 'SLIGHT EDGE';
    return 'NO EDGE';
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'STRONG BET': return 'bg-green-600';
      case 'GOOD BET': return 'bg-blue-600';
      case 'SLIGHT EDGE': return 'bg-yellow-600';
      default: return 'bg-slate-600';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'STRONG BET': return <CheckCircle className="w-5 h-5" />;
      case 'GOOD BET': return <Target className="w-5 h-5" />;
      case 'SLIGHT EDGE': return <AlertTriangle className="w-5 h-5" />;
      default: return <XCircle className="w-5 h-5" />;
    }
  };

  const sortedEdges = [...edges].sort((a, b) => {
    if (sortBy === 'edge') {
      return Math.abs(b.edge.spread) - Math.abs(a.edge.spread);
    } else {
      return b.mlPrediction.confidence - a.mlPrediction.confidence;
    }
  });

  const strongBets = edges.filter(e => e.edge.recommendation === 'STRONG BET').length;
  const goodBets = edges.filter(e => e.edge.recommendation === 'GOOD BET').length;
  const totalEdge = edges.reduce((sum, e) => sum + Math.abs(e.edge.spread), 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-white flex items-center">
            <TrendingUp className="w-10 h-10 mr-3" />
            Edge Detection
          </h1>
          <p className="text-slate-400 mt-2">
            Find betting opportunities where ML model disagrees with Vegas lines
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            <Link href="/games" className="text-slate-400 hover:text-white transition pb-1">
              Games
            </Link>
            <Link href="/predictions" className="text-slate-400 hover:text-white transition pb-1">
              Predictions
            </Link>
            <Link href="/analytics" className="text-slate-400 hover:text-white transition pb-1">
              Analytics
            </Link>
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition pb-1">
              Dashboard
            </Link>
            <Link href="/backtest" className="text-slate-400 hover:text-white transition pb-1">
              Backtest
            </Link>
            <Link href="/database" className="text-slate-400 hover:text-white transition pb-1">
              Database
            </Link>
            <Link href="/training" className="text-slate-400 hover:text-white transition pb-1">
              Training
            </Link>
            <Link href="/edge" className="text-white font-semibold border-b-2 border-blue-500 pb-1">
              Edge
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-400 mt-4">Analyzing edges...</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Total Games</div>
                <div className="text-4xl font-bold text-white">{edges.length}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Strong Bets</div>
                <div className="text-4xl font-bold text-green-400">{strongBets}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Good Bets</div>
                <div className="text-4xl font-bold text-blue-400">{goodBets}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Avg Edge</div>
                <div className="text-4xl font-bold text-yellow-400">
                  {edges.length > 0 ? (totalEdge / edges.length).toFixed(1) : '0.0'}
                </div>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="mb-4 flex space-x-4">
              <button
                onClick={() => setSortBy('edge')}
                className={`px-4 py-2 rounded ${sortBy === 'edge' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Sort by Edge
              </button>
              <button
                onClick={() => setSortBy('confidence')}
                className={`px-4 py-2 rounded ${sortBy === 'confidence' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Sort by Confidence
              </button>
            </div>

            {/* Edge Analysis Cards */}
            <div className="space-y-4">
              {sortedEdges.map((analysis, idx) => (
                <div key={idx} className="bg-slate-800 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {analysis.game.awayTeam.abbreviation} @ {analysis.game.homeTeam.abbreviation}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {format(analysis.game.gameTime, 'EEEE, MMMM d - h:mm a')}
                      </p>
                    </div>
                    <div className={`${getRecommendationColor(analysis.edge.recommendation)} px-4 py-2 rounded-lg flex items-center text-white font-semibold`}>
                      {getRecommendationIcon(analysis.edge.recommendation)}
                      <span className="ml-2">{analysis.edge.recommendation}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ML Prediction */}
                    <div className="bg-slate-900 rounded-lg p-4">
                      <h4 className="text-slate-400 text-sm mb-3">ML Prediction</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Spread:</span>
                          <span className="text-white font-bold">{analysis.mlPrediction.spread > 0 ? '+' : ''}{analysis.mlPrediction.spread.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Total:</span>
                          <span className="text-white font-bold">{analysis.mlPrediction.total.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Score:</span>
                          <span className="text-white font-bold">{analysis.mlPrediction.awayScore.toFixed(0)}-{analysis.mlPrediction.homeScore.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Confidence:</span>
                          <span className="text-white font-bold">{analysis.mlPrediction.confidence}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Vegas Lines */}
                    <div className="bg-slate-900 rounded-lg p-4">
                      <h4 className="text-slate-400 text-sm mb-3">Vegas Lines</h4>
                      {analysis.vegasLines ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-300">Spread:</span>
                            <span className="text-white font-bold">{analysis.vegasLines.spread > 0 ? '+' : ''}{analysis.vegasLines.spread.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Total:</span>
                            <span className="text-white font-bold">{analysis.vegasLines.total.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Book:</span>
                            <span className="text-white text-sm">{analysis.vegasLines.bookmaker}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">No lines available</p>
                      )}
                    </div>

                    {/* Edge */}
                    <div className="bg-slate-900 rounded-lg p-4">
                      <h4 className="text-slate-400 text-sm mb-3">Edge Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Spread Edge:</span>
                          <span className={`font-bold ${Math.abs(analysis.edge.spread) >= 2.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {analysis.edge.spread > 0 ? '+' : ''}{analysis.edge.spread} pts
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Total Edge:</span>
                          <span className={`font-bold ${Math.abs(analysis.edge.total) >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {analysis.edge.total > 0 ? '+' : ''}{analysis.edge.total} pts
                          </span>
                        </div>
                        {analysis.edge.betOn !== 'none' && (
                          <div className="pt-2 border-t border-slate-700">
                            <div className="text-green-400 font-semibold">
                              BET: {analysis.edge.betOn === 'home' ? analysis.game.homeTeam.abbreviation : analysis.game.awayTeam.abbreviation}
                              {' '}{analysis.vegasLines?.spread && (analysis.edge.betOn === 'home' ? analysis.vegasLines.spread : -analysis.vegasLines.spread)}
                            </div>
                          </div>
                        )}
                        {analysis.edge.totalRec !== 'PASS' && (
                          <div className="text-blue-400 font-semibold">
                            {analysis.edge.totalRec} {analysis.vegasLines?.total}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {edges.length === 0 && (
              <div className="bg-slate-800 rounded-lg p-12 text-center">
                <p className="text-slate-400 text-lg">No games available for edge analysis</p>
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-6">
          <h3 className="text-blue-400 font-semibold mb-3">How Edge Detection Works</h3>
          <div className="text-slate-300 space-y-2 text-sm">
            <p>• <strong>Edge</strong> = Difference between ML prediction and Vegas line</p>
            <p>• <strong>STRONG BET</strong> = 4+ point edge (rare, high confidence)</p>
            <p>• <strong>GOOD BET</strong> = 2.5-4 point edge (good opportunity)</p>
            <p>• <strong>SLIGHT EDGE</strong> = 1.5-2.5 point edge (small advantage)</p>
            <p>• <strong>NO EDGE</strong> = Less than 1.5 points (skip this game)</p>
            <p className="pt-2 text-slate-400">
              <strong>Note:</strong> Currently using rules-based model. Once ML model is integrated, edges will be more accurate.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
