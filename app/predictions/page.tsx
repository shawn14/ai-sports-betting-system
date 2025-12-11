'use client';

import { useEffect, useState } from 'react';
import LoggedInHeader from '@/components/LoggedInHeader';
import PredictionCard from '@/components/mobile/PredictionCard';
import { Target, TrendingUp, Activity } from 'lucide-react';
import { NFLAPI } from '@/lib/api/nfl';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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
      if (!response.ok) return { spread: null, total: null };
      const oddsData = await response.json();

      let spread = null;
      let total = null;

      // Extract spread and total from bookmakers (use consensus or first available)
      if (oddsData.bookmakers && oddsData.bookmakers.length > 0) {
        const spreadMarket = oddsData.bookmakers[0].markets?.find((m: any) => m.key === 'spreads');
        const totalMarket = oddsData.bookmakers[0].markets?.find((m: any) => m.key === 'totals');

        if (spreadMarket && spreadMarket.outcomes) {
          const homeOutcome = spreadMarket.outcomes.find((o: any) => o.name === oddsData.home_team);
          spread = homeOutcome?.point || null;
        }

        if (totalMarket && totalMarket.outcomes && totalMarket.outcomes.length > 0) {
          total = totalMarket.outcomes[0]?.point || null;
        }
      }
      return { spread, total };
    } catch (error) {
      console.error('Error fetching historical odds:', error);
      return { spread: null, total: null };
    }
  };

  const loadWeekPredictions = async (season: number, week: number) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedWeek(week);

      // Fetch Vegas lines from Firestore betting_lines collection with fallback to training data
      const fetchVegasLines = async (gameIds: string[]) => {
        const vegasLinesMap = new Map<string, { spread: number; total: number }>();

        // First, try Firestore betting_lines
        for (const gameId of gameIds) {
          try {
            const q = query(
              collection(db, 'betting_lines'),
              where('gameId', '==', gameId)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
              // Aggregate across sportsbooks - take average
              const spreads: number[] = [];
              const totals: number[] = [];

              snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.spread?.home !== undefined) {
                  spreads.push(data.spread.home);
                }
                if (data.total?.line !== undefined) {
                  totals.push(data.total.line);
                }
              });

              if (spreads.length > 0 && totals.length > 0) {
                const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
                const avgTotal = totals.reduce((a, b) => a + b, 0) / totals.length;
                vegasLinesMap.set(gameId, { spread: avgSpread, total: avgTotal });
                console.log(`Found Vegas lines for ${gameId}: spread=${avgSpread.toFixed(1)}, total=${avgTotal.toFixed(1)} (from ${spreads.length} books)`);
              }
            }
          } catch (err) {
            console.warn(`Error fetching Vegas lines for ${gameId}:`, err);
          }
        }

        // Fallback: Load training data for games not found in Firestore
        if (vegasLinesMap.size < gameIds.length) {
          console.log(`Only found ${vegasLinesMap.size}/${gameIds.length} games in Firestore, trying training data fallback...`);
          try {
            const trainingResponse = await fetch('/training/nfl_training_data_2025_with_vegas.json');
            if (trainingResponse.ok) {
              const trainingData = await trainingResponse.json();
              console.log('Loaded training data for fallback');

              gameIds.forEach(gameId => {
                if (!vegasLinesMap.has(gameId)) {
                  const trainingGame = trainingData.data.find((g: any) => g.gameId === gameId);
                  if (trainingGame?.lines?.spread !== undefined && trainingGame?.lines?.total !== undefined) {
                    vegasLinesMap.set(gameId, {
                      spread: trainingGame.lines.spread,
                      total: trainingGame.lines.total
                    });
                    console.log(`Found Vegas lines for ${gameId} in training data: spread=${trainingGame.lines.spread}, total=${trainingGame.lines.total}`);
                  }
                }
              });
            }
          } catch (err) {
            console.warn('Could not load training data fallback:', err);
          }
        }

        // Tier 3: Fetch live odds from The Odds API for remaining games
        if (vegasLinesMap.size < gameIds.length) {
          console.log(`Still missing ${gameIds.length - vegasLinesMap.size} games, fetching live odds from API...`);
          try {
            const oddsResponse = await fetch('/api/odds');
            if (oddsResponse.ok) {
              const liveOdds = await oddsResponse.json();
              console.log(`Got ${liveOdds.length} live odds from API`);

              // Match live odds to our games by team names
              games.forEach(game => {
                if (!vegasLinesMap.has(game.id)) {
                  const matchingOdds = liveOdds.find((odds: any) => {
                    const homeMatch = odds.home_team?.toLowerCase().includes(game.homeTeam.name.toLowerCase()) ||
                                     game.homeTeam.name.toLowerCase().includes(odds.home_team?.toLowerCase());
                    const awayMatch = odds.away_team?.toLowerCase().includes(game.awayTeam.name.toLowerCase()) ||
                                     game.awayTeam.name.toLowerCase().includes(odds.away_team?.toLowerCase());
                    return homeMatch && awayMatch;
                  });

                  if (matchingOdds && matchingOdds.bookmakers?.length > 0) {
                    const bookmaker = matchingOdds.bookmakers[0];
                    const spreadsMarket = bookmaker.markets?.find((m: any) => m.key === 'spreads');
                    const totalsMarket = bookmaker.markets?.find((m: any) => m.key === 'totals');

                    if (spreadsMarket && totalsMarket) {
                      const homeSpread = spreadsMarket.outcomes?.find((o: any) =>
                        o.name.toLowerCase().includes(game.homeTeam.name.toLowerCase())
                      )?.point || 0;
                      const totalLine = totalsMarket.outcomes?.[0]?.point || 0;

                      vegasLinesMap.set(game.id, {
                        spread: homeSpread,
                        total: totalLine
                      });
                      console.log(`Found live odds for ${game.id}: spread=${homeSpread}, total=${totalLine}`);
                    }
                  }
                }
              });
            }
          } catch (err) {
            console.warn('Could not fetch live odds from API:', err);
          }
        }

        return vegasLinesMap;
      };

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

      // Fetch Vegas lines for all games
      const gameIds = games.map(g => g.id);
      console.log('Fetching Vegas lines for', gameIds.length, 'games...');
      const vegasLinesMap = await fetchVegasLines(gameIds);
      console.log(`Fetched Vegas lines for ${vegasLinesMap.size} games`);

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

          // Get Vegas spread and total from Firestore betting_lines
          const vegasLines = vegasLinesMap.get(gameId);
          const vegasSpread = vegasLines?.spread;
          const vegasTotal = vegasLines?.total;

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
            vegasSpread,
            vegasTotal
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
            // Moneyline: Straight-up winner prediction
            const moneylineWins = completedGames.filter(pred => pred.actualWinner === pred.predictedWinner).length;

            // ATS: Beat or tie Vegas spread error
            const gamesWithVegasSpread = completedGames.filter(g => g.vegasSpread !== null && g.vegasSpread !== undefined);
            const spreadWins = gamesWithVegasSpread.filter(pred => {
              const actualSpread = pred.actualHomeScore! - pred.actualAwayScore!;
              const vegasError = Math.abs(pred.vegasSpread! - actualSpread);
              const ourError = Math.abs(pred.predictedSpread - actualSpread);
              return ourError <= vegasError; // Beat or tie Vegas
            }).length;

            // O/U: Predict correct side of Vegas total line
            const gamesWithVegasTotal = completedGames.filter(g => g.vegasTotal !== null && g.vegasTotal !== undefined);
            const totalWins = gamesWithVegasTotal.filter(pred => {
              const actualTotal = pred.actualHomeScore! + pred.actualAwayScore!;
              const predictedOver = pred.predictedTotal > pred.vegasTotal!;
              const actualOver = actualTotal > pred.vegasTotal!;
              return predictedOver === actualOver; // Predicted correct side
            }).length;

            const moneylinePct = ((moneylineWins / completedGames.length) * 100).toFixed(1);
            const spreadPct = gamesWithVegasSpread.length > 0 ? ((spreadWins / gamesWithVegasSpread.length) * 100).toFixed(1) : '0.0';
            const totalPct = gamesWithVegasTotal.length > 0 ? ((totalWins / gamesWithVegasTotal.length) * 100).toFixed(1) : '0.0';

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
                    <div className="text-xs text-gray-700 font-semibold mb-1">SPREAD (ATS)</div>
                    <div className="text-3xl font-bold text-gray-900">{spreadPct}%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {spreadWins}-{gamesWithVegasSpread.length - spreadWins} vs Vegas
                    </div>
                  </div>

                  {/* Total Stats */}
                  <div className="text-center p-3 bg-white rounded border border-gray-200">
                    <div className="text-xs text-gray-700 font-semibold mb-1">TOTAL (O/U)</div>
                    <div className="text-3xl font-bold text-gray-900">{totalPct}%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {totalWins}-{gamesWithVegasTotal.length - totalWins} record
                    </div>
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

        {/* Mobile Card View */}
        <div className="block md:hidden">
          {currentPredictions
            .sort((a, b) => {
              const now = new Date();
              const aTime = new Date(a.gameTime).getTime();
              const bTime = new Date(b.gameTime).getTime();

              // Primary sort: by game time (earliest first)
              if (aTime !== bTime) {
                return aTime - bTime;
              }

              // Secondary sort: by confidence (highest first) for games at same time
              return b.confidence - a.confidence;
            })
            .map((pred) => (
              <PredictionCard key={pred.gameId} prediction={pred} />
            ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_60px_1.5fr_2fr_2fr_100px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-600 uppercase">
            <div>Matchup</div>
            <div className="text-center">Conf</div>
            <div className="text-center">Moneyline</div>
            <div className="text-center">Spread (vs Vegas)</div>
            <div className="text-center">Total (vs Vegas)</div>
            <div className="text-center">Result</div>
          </div>

          {/* Table Rows */}
          {currentPredictions
            .sort((a, b) => {
              const now = new Date();
              const aTime = new Date(a.gameTime).getTime();
              const bTime = new Date(b.gameTime).getTime();

              // Primary sort: by game time (earliest first)
              if (aTime !== bTime) {
                return aTime - bTime;
              }

              // Secondary sort: by confidence (highest first) for games at same time
              return b.confidence - a.confidence;
            })
            .map((pred) => {
            const isComplete = pred.status === 'completed' && pred.actualHomeScore !== undefined && pred.actualAwayScore !== undefined;
            const actualTotal = isComplete ? (pred.actualHomeScore! + pred.actualAwayScore!) : 0;
            const actualSpread = isComplete ? (pred.actualHomeScore! - pred.actualAwayScore!) : 0;

            // Calculate bet results
            const moneylineWin = isComplete && pred.actualWinner === pred.predictedWinner;

            // ATS: Beat or tie Vegas
            let spreadWin = false;
            if (isComplete && pred.vegasSpread !== null && pred.vegasSpread !== undefined) {
              const vegasError = Math.abs(pred.vegasSpread - actualSpread);
              const ourError = Math.abs(pred.predictedSpread - actualSpread);
              spreadWin = ourError <= vegasError;
            }

            // O/U: Predict correct side of line
            let totalWin = false;
            if (isComplete && pred.vegasTotal !== null && pred.vegasTotal !== undefined) {
              const predictedOver = pred.predictedTotal > pred.vegasTotal;
              const actualOver = actualTotal > pred.vegasTotal;
              totalWin = predictedOver === actualOver;
            }

            // Calculate edge/difference for display
            const spreadDiff = pred.vegasSpread !== undefined && pred.vegasSpread !== null
              ? pred.predictedSpread - pred.vegasSpread
              : null;
            const totalDiff = pred.vegasTotal !== undefined && pred.vegasTotal !== null
              ? pred.predictedTotal - pred.vegasTotal
              : null;

            return (
              <div
                key={pred.gameId}
                className="grid grid-cols-[2fr_60px_1.5fr_2fr_2fr_100px] gap-2 px-3 py-2 border-b border-gray-200 hover:bg-gray-50 text-xs items-center"
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

                {/* Moneyline - Predicted Winner */}
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

                {/* Spread - Ours vs Vegas with Diff */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div>
                      <div className="text-[9px] text-gray-500">Ours</div>
                      <div className="font-semibold text-gray-900">
                        {pred.homeTeam.split(' ').pop()} {pred.predictedSpread > 0 ? '+' : ''}{pred.predictedSpread.toFixed(1)}
                      </div>
                    </div>
                    {pred.vegasSpread !== undefined && pred.vegasSpread !== null && (
                      <>
                        <div className="text-gray-400">|</div>
                        <div>
                          <div className="text-[9px] text-gray-500">Vegas</div>
                          <div className="font-semibold text-purple-600">
                            {pred.vegasSpread > 0 ? '+' : ''}{pred.vegasSpread.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-gray-400">|</div>
                        <div>
                          <div className="text-[9px] text-gray-500">Diff</div>
                          <div className={`font-semibold ${
                            Math.abs(spreadDiff!) >= 3 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {spreadDiff! > 0 ? '+' : ''}{spreadDiff!.toFixed(1)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {isComplete && (
                    <>
                      <div className="text-[10px] text-gray-500 mt-1">
                        Actual: {actualSpread > 0 ? '+' : ''}{actualSpread.toFixed(1)}
                      </div>
                      <div className={`text-[10px] font-bold mt-0.5 ${spreadWin ? 'text-green-600' : 'text-red-600'}`}>
                        {spreadWin ? '✓ WIN' : '✗ LOSS'}
                      </div>
                    </>
                  )}
                </div>

                {/* Total - Ours vs Vegas with Diff */}
                <div className="text-center">
                  {pred.vegasTotal !== undefined && pred.vegasTotal !== null ? (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <div>
                          <div className="text-[9px] text-gray-500">Ours</div>
                          <div className="font-semibold text-gray-900">
                            {pred.predictedTotal.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-gray-400">|</div>
                        <div>
                          <div className="text-[9px] text-gray-500">Vegas</div>
                          <div className="font-semibold text-purple-600">
                            {pred.vegasTotal.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-gray-400">|</div>
                        <div>
                          <div className="text-[9px] text-gray-500">Diff</div>
                          <div className={`font-semibold ${
                            Math.abs(totalDiff!) >= 3 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {totalDiff! > 0 ? '+' : ''}{totalDiff!.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        {pred.predictedTotal > pred.vegasTotal ? 'OVER' : 'UNDER'}
                      </div>
                    </>
                  ) : (
                    <div className="font-semibold text-gray-900">{pred.predictedTotal.toFixed(1)}</div>
                  )}
                  {isComplete && (
                    <>
                      <div className="text-[10px] text-gray-500 mt-1">
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
