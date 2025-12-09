'use client';

import { useEffect, useState } from 'react';
import LoggedInHeader from '@/components/LoggedInHeader';
import { Target, TrendingUp, Activity } from 'lucide-react';
import { NFLAPI } from '@/lib/api/nfl';

interface GamePrediction {
  gameId: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedSpread: number;
  predictedTotal: number;
  predictedWinner: string;
  confidence: number;
  gameTime: Date;
  status: string;
  actualHomeScore?: number;
  actualAwayScore?: number;
  actualWinner?: string;
  vegasSpread?: number;
  vegasTotal?: number;
}

export default function PredictionsPage() {
  const [currentPredictions, setCurrentPredictions] = useState<GamePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(2024);
  const [currentWeek, setCurrentWeek] = useState(14);
  const [selectedWeek, setSelectedWeek] = useState(14);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadCurrentWeekPredictions();
  }, []);

  const loadCurrentWeekPredictions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current season and week
      console.log('Getting current season and week...');
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      console.log(`Current season: ${season}, week: ${week}`);

      setCurrentSeason(season);
      setCurrentWeek(week);
      setSelectedWeek(week);

      // Load games for current week
      await loadWeekPredictions(season, week);
    } catch (error: any) {
      console.error('Error loading predictions:', error);
      setError(error.message || 'Failed to load predictions');
      setLoading(false);
    }
  };

  const fetchHistoricalOdds = async (gameId: string, gameTime: Date) => {
    try {
      const response = await fetch(`/api/odds/historical?gameId=${gameId}&gameTime=${gameTime.toISOString()}`);
      if (!response.ok) return null;
      const oddsData = await response.json();

      // Extract spread from bookmakers (use consensus or first available)
      if (oddsData.bookmakers && oddsData.bookmakers.length > 0) {
        const spreadMarket = oddsData.bookmakers[0].markets?.find((m: any) => m.key === 'spreads');
        if (spreadMarket && spreadMarket.outcomes) {
          const homeOutcome = spreadMarket.outcomes.find((o: any) => o.name === oddsData.home_team);
          return homeOutcome?.point || null;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching historical odds:', error);
      return null;
    }
  };

  const loadWeekPredictions = async (season: number, week: number) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedWeek(week);

      // Get games for the week
      console.log(`Loading games for ${season} week ${week}...`);
      const games = await NFLAPI.getWeekGames(season, week);
      console.log(`Found ${games.length} games`);

      if (games.length === 0) {
        setCurrentPredictions([]);
        setError(`No games found for ${season} week ${week}`);
        setLoading(false);
        return;
      }

      // Generate predictions
      console.log('Generating predictions...');
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          games,
          season,
          week,
          presetName: 'balanced'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate predictions');
      }

      const data = await response.json();
      console.log('Predictions generated:', data.count);
      console.log('Sample prediction:', Object.values(data.predictions)[0]);

      // Convert predictions object to array
      const predictionsArray: GamePrediction[] = await Promise.all(
        Object.entries(data.predictions).map(async ([gameId, pred]: [string, any]) => {
          const game = games.find(g => g.id === gameId);

          // Handle different possible field names from API
          const homeScore = pred.predictedScore?.home ?? pred.predictedHome ?? pred.homeScore ?? 0;
          const awayScore = pred.predictedScore?.away ?? pred.predictedAway ?? pred.awayScore ?? 0;

          // Extract spread and total from factors array if needed
          let spread = 0;
          let total = 0;
          if (pred.factors && Array.isArray(pred.factors)) {
            const spreadFactor = pred.factors.find((f: string) => f.includes('Predicted Spread:'));
            const totalFactor = pred.factors.find((f: string) => f.includes('Predicted Total:'));
            if (spreadFactor) {
              const match = spreadFactor.match(/([+-]?\d+\.?\d*)/);
              if (match) spread = parseFloat(match[1]);
            }
            if (totalFactor) {
              const match = totalFactor.match(/(\d+\.?\d*)/);
              if (match) total = parseFloat(match[1]);
            }
          }

          // Get actual scores if game is complete
          const actualHomeScore = game?.homeScore;
          const actualAwayScore = game?.awayScore;
          const actualWinner = actualHomeScore !== undefined && actualAwayScore !== undefined && actualHomeScore > actualAwayScore
            ? game?.homeTeam?.name
            : actualAwayScore !== undefined && actualHomeScore !== undefined && actualAwayScore > actualHomeScore
            ? game?.awayTeam?.name
            : undefined;

          // Fetch historical Vegas spread for completed games
          let vegasSpread = undefined;
          if (game?.status === 'completed' && game?.gameTime) {
            console.log(`Fetching historical odds for ${gameId}...`);
            vegasSpread = await fetchHistoricalOdds(gameId, game.gameTime);
          }

          return {
            gameId,
            week,
            homeTeam: pred.homeTeam || game?.homeTeam?.name || 'Unknown',
            awayTeam: pred.awayTeam || game?.awayTeam?.name || 'Unknown',
            homeTeamLogo: game?.homeTeam?.logo,
            awayTeamLogo: game?.awayTeam?.logo,
            predictedHomeScore: homeScore,
            predictedAwayScore: awayScore,
            predictedSpread: spread,
            predictedTotal: total,
            predictedWinner: homeScore > awayScore ? (pred.homeTeam || game?.homeTeam?.name) : (pred.awayTeam || game?.awayTeam?.name),
            confidence: pred.confidence || 75,
            gameTime: game?.gameTime || new Date(),
            status: game?.status || 'scheduled',
            actualHomeScore,
            actualAwayScore,
            actualWinner,
            vegasSpread
          };
        })
      );

      setCurrentPredictions(predictionsArray);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading week predictions:', error);
      setError(error.message || 'Failed to load predictions');
      setLoading(false);
    }
  };

  const formatGameTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <LoggedInHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading predictions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <LoggedInHeader />

      {/* Header */}
      <div className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-gray-900">AI PREDICTIONS</h1>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>{currentSeason} Season</span>
                <span>•</span>
                <span>Week {selectedWeek}</span>
                <span>•</span>
                <span>{currentPredictions.length} Games</span>
                {lastUpdated && (
                  <>
                    <span>•</span>
                    <span>Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Week Stats Summary */}
        {currentPredictions.length > 0 && (() => {
          const completedGames = currentPredictions.filter(pred =>
            pred.status === 'completed' && pred.actualHomeScore !== undefined && pred.actualAwayScore !== undefined
          );

          if (completedGames.length > 0) {
            const moneylineWins = completedGames.filter(pred => pred.actualWinner === pred.predictedWinner).length;
            const spreadWins = completedGames.filter(pred => {
              const actualSpread = pred.actualHomeScore! - pred.actualAwayScore!;
              return Math.abs(actualSpread - pred.predictedSpread) < 3;
            }).length;
            const totalWins = completedGames.filter(pred => {
              const actualTotal = pred.actualHomeScore! + pred.actualAwayScore!;
              return Math.abs(actualTotal - pred.predictedTotal) < 3;
            }).length;

            const moneylinePct = ((moneylineWins / completedGames.length) * 100).toFixed(1);
            const spreadPct = ((spreadWins / completedGames.length) * 100).toFixed(1);
            const totalPct = ((totalWins / completedGames.length) * 100).toFixed(1);

            return (
              <div className="bg-white rounded border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">WEEK {selectedWeek} PERFORMANCE</h3>
                  <span className="text-xs text-gray-500">{completedGames.length} of {currentPredictions.length} games completed</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Moneyline Stats */}
                  <div className="text-center p-3 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-700 font-semibold mb-1">MONEYLINE (Winner)</div>
                    <div className="text-3xl font-bold text-gray-900">{moneylinePct}%</div>
                    <div className="text-xs text-gray-600 mt-1">{moneylineWins}-{completedGames.length - moneylineWins} Record</div>
                  </div>

                  {/* Spread Stats */}
                  <div className="text-center p-3 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-700 font-semibold mb-1">SPREAD</div>
                    <div className="text-3xl font-bold text-gray-900">{spreadPct}%</div>
                    <div className="text-xs text-gray-600 mt-1">{spreadWins}-{completedGames.length - spreadWins} Record</div>
                  </div>

                  {/* Total Stats */}
                  <div className="text-center p-3 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-700 font-semibold mb-1">TOTAL (O/U)</div>
                    <div className="text-3xl font-bold text-gray-900">{totalPct}%</div>
                    <div className="text-xs text-gray-600 mt-1">{totalWins}-{completedGames.length - totalWins} Record</div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Week Selector */}
        <div className="bg-white rounded border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-3">
            <label className="text-gray-600 text-xs font-semibold">SELECT WEEK:</label>
            <select
              value={selectedWeek}
              onChange={(e) => loadWeekPredictions(currentSeason, parseInt(e.target.value))}
              className="bg-white text-gray-900 rounded px-3 py-1.5 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>
                  Week {week} {week === currentWeek ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Predictions Table */}
        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_60px_1.5fr_1.5fr_1.5fr_1.5fr_100px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-600 uppercase">
            <div>Matchup</div>
            <div className="text-center">Conf</div>
            <div className="text-center">Predicted Winner</div>
            <div className="text-center">Spread</div>
            <div className="text-center">Vegas Spread</div>
            <div className="text-center">Total</div>
            <div className="text-center">Result</div>
          </div>

          {/* Table Rows */}
          {currentPredictions.map((pred) => {
            const isComplete = pred.status === 'completed' && pred.actualHomeScore !== undefined && pred.actualAwayScore !== undefined;
            const actualTotal = isComplete ? (pred.actualHomeScore! + pred.actualAwayScore!) : 0;
            const actualSpread = isComplete ? (pred.actualHomeScore! - pred.actualAwayScore!) : 0;

            // Calculate bet results
            const moneylineWin = isComplete && pred.actualWinner === pred.predictedWinner;
            const spreadWin = isComplete && Math.abs(actualSpread - pred.predictedSpread) < 3;
            const totalWin = isComplete && Math.abs(actualTotal - pred.predictedTotal) < 3;

            return (
              <div
                key={pred.gameId}
                className="grid grid-cols-[2fr_60px_1.5fr_1.5fr_1.5fr_1.5fr_100px] gap-2 px-3 py-2 border-b border-gray-200 hover:bg-gray-50 text-xs items-center"
              >
                {/* Matchup */}
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {pred.awayTeamLogo && (
                      <img src={pred.awayTeamLogo} alt={pred.awayTeam} className="w-4 h-4" />
                    )}
                    <span className="text-gray-900 font-semibold">{pred.awayTeam}</span>
                    {isComplete && <span className="text-gray-600 ml-1">{pred.actualAwayScore}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {pred.homeTeamLogo && (
                      <img src={pred.homeTeamLogo} alt={pred.homeTeam} className="w-4 h-4" />
                    )}
                    <span className="text-gray-900 font-semibold">{pred.homeTeam}</span>
                    {isComplete && <span className="text-gray-600 ml-1">{pred.actualHomeScore}</span>}
                  </div>
                </div>

                {/* Confidence */}
                <div className="text-center">
                  <div className="text-blue-600 font-semibold">{pred.confidence}%</div>
                </div>

                {/* Predicted Winner */}
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{pred.predictedWinner}</div>
                  <div className="text-[10px] text-gray-500">
                    {pred.predictedAwayScore.toFixed(0)}-{pred.predictedHomeScore.toFixed(0)}
                  </div>
                  {isComplete && (
                    <div className={`text-[10px] font-bold mt-0.5 ${moneylineWin ? 'text-green-600' : 'text-red-600'}`}>
                      {moneylineWin ? '✓ WIN' : '✗ LOSS'}
                    </div>
                  )}
                </div>

                {/* Predicted Spread */}
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {pred.homeTeam} {pred.predictedSpread > 0 ? '+' : ''}{pred.predictedSpread.toFixed(1)}
                  </div>
                  {isComplete && (
                    <>
                      <div className="text-[10px] text-gray-500">
                        Actual: {actualSpread > 0 ? '+' : ''}{actualSpread.toFixed(1)}
                      </div>
                      <div className={`text-[10px] font-bold mt-0.5 ${spreadWin ? 'text-green-600' : 'text-red-600'}`}>
                        {spreadWin ? '✓ WIN' : '✗ LOSS'}
                      </div>
                    </>
                  )}
                </div>

                {/* Vegas Spread */}
                <div className="text-center">
                  {pred.vegasSpread !== undefined && pred.vegasSpread !== null ? (
                    <div className="font-semibold text-purple-600">
                      {pred.vegasSpread > 0 ? '+' : ''}{pred.vegasSpread.toFixed(1)}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400">—</div>
                  )}
                </div>

                {/* Total */}
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{pred.predictedTotal.toFixed(1)}</div>
                  {isComplete && (
                    <>
                      <div className="text-[10px] text-gray-500">
                        Actual: {actualTotal.toFixed(1)}
                      </div>
                      <div className={`text-[10px] font-bold mt-0.5 ${totalWin ? 'text-green-600' : 'text-red-600'}`}>
                        {totalWin ? '✓ WIN' : '✗ LOSS'}
                      </div>
                    </>
                  )}
                </div>

                {/* Result Status */}
                <div className="text-center">
                  <div className={`text-[10px] font-semibold uppercase px-2 py-1 rounded ${
                    isComplete ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {isComplete ? 'Final' : pred.status}
                  </div>
                  {isComplete && (
                    <div className="text-[10px] font-bold mt-1 flex gap-1 justify-center">
                      <span className={moneylineWin ? 'text-green-600' : 'text-red-600'}>
                        {moneylineWin ? '✓' : '✗'}
                      </span>
                      <span className={spreadWin ? 'text-green-600' : 'text-red-600'}>
                        {spreadWin ? '✓' : '✗'}
                      </span>
                      <span className={totalWin ? 'text-green-600' : 'text-red-600'}>
                        {totalWin ? '✓' : '✗'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && currentPredictions.length === 0 && (
          <div className="text-center py-12 bg-white rounded border border-red-200">
            <p className="text-red-600 text-sm font-semibold mb-2">Error</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        )}

        {!error && currentPredictions.length === 0 && !loading && (
          <div className="text-center py-12 bg-white rounded border border-gray-200">
            <p className="text-gray-500 text-sm">No games found for Week {selectedWeek}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
