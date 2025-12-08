'use client';

import { useState, useRef, useEffect } from 'react';
import { NFLAPI } from '@/lib/api/nfl';
import { Game } from '@/types';
import { Brain, Send, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import GameIntelligence from '@/components/GameIntelligence';
import LoggedInHeader from '@/components/LoggedInHeader';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  prediction?: any;
  actual?: any;
  accuracy?: any;
  gamesList?: Game[]; // Store games list for context
  week?: number; // Store week for context
}

export default function ChatPredictPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: "Hi! I can predict any NFL game using only pre-game data. Try asking:\n\n• \"Predict Week 14 Chiefs vs Chargers\"\n• \"Run all Week 13 games\"\n• \"Show me Dolphins @ Packers from Week 10\"\n• Or just say the week number and I'll show you games!\n\nI'll use standings data from BEFORE the game to make predictions, then compare to actual results!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedGame = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-load game prediction from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('game');

    if (gameId && !hasLoadedGame.current) {
      hasLoadedGame.current = true;
      loadGamePrediction(gameId);
    }
  }, []);

  const loadGamePrediction = async (gameId: string) => {
    setLoading(true);

    try {
      // Fetch all games to find the specific game
      const { season, week } = await NFLAPI.getCurrentSeasonWeek();
      const allGames = await NFLAPI.getWeekGames(season, week);
      const game = allGames.find(g => g.id === gameId);

      if (!game) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Game not found. Please select a game from the games page.`
        }]);
        setLoading(false);
        return;
      }

      // Add system message showing which game
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Generating prediction for ${game.awayTeam.name} @ ${game.homeTeam.name} (Week ${week})...`
      }]);

      // Generate prediction
      const prediction = await predictGame(game, week - 1);

      if (prediction) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Generated prediction for ${game.awayTeam.name} @ ${game.homeTeam.name}`,
          prediction: [prediction],
          actual: null,
          accuracy: null
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Failed to generate prediction. Please try again.`
        }]);
      }
    } catch (error) {
      console.error('Error loading game:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const parseUserRequest = (text: string) => {
    const lower = text.toLowerCase();

    // Extract week number
    const weekMatch = lower.match(/week (\d+)/);
    const week = weekMatch ? parseInt(weekMatch[1]) : null;

    // Check if "all" games requested
    const isAllGames = lower.includes('all') || lower.includes('entire') || lower.includes('every');

    // Extract team names (basic matching)
    const teams = [
      'bills', 'dolphins', 'patriots', 'jets',
      'ravens', 'bengals', 'browns', 'steelers',
      'texans', 'colts', 'jaguars', 'titans',
      'broncos', 'chiefs', 'raiders', 'chargers',
      'cowboys', 'giants', 'eagles', 'commanders',
      'bears', 'lions', 'packers', 'vikings',
      'falcons', 'panthers', 'saints', 'buccaneers',
      'cardinals', 'rams', '49ers', 'seahawks'
    ];

    const mentionedTeams = teams.filter(team => lower.includes(team));

    return { week, isAllGames, teams: mentionedTeams };
  };

  const predictGame = async (game: Game, standingsWeek: number) => {
    try {
      // Call hybrid prediction API
      const response = await fetch('/api/hybrid-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          games: [game],
          season: game.season,
          week: standingsWeek
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate prediction');
      }

      const data = await response.json();
      return data.predictions[0];
    } catch (error) {
      console.error('Prediction error:', error);
      return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Check if user is selecting from a previous games list (e.g., "2" or "game 2")
      const gameNumberMatch = userMessage.match(/^(?:game\s+)?(\d+)$/i);
      const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0];

      if (gameNumberMatch && lastAssistantMessage?.gamesList && lastAssistantMessage?.week) {
        const gameIndex = parseInt(gameNumberMatch[1]) - 1;
        const games = lastAssistantMessage.gamesList;

        if (gameIndex >= 0 && gameIndex < games.length) {
          const selectedGame = games[gameIndex];
          const week = lastAssistantMessage.week;

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Predicting ${selectedGame.awayTeam.name} @ ${selectedGame.homeTeam.name} using Week ${week - 1} standings...`
          }]);

          // Predict this single game
          const prediction = await predictGame(selectedGame, week - 1);

          if (prediction) {
            const actual = selectedGame.status === 'completed'
              ? { gameId: selectedGame.id, homeScore: selectedGame.homeScore, awayScore: selectedGame.awayScore }
              : null;

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Here's my prediction for Week ${week}:`,
              prediction: [prediction],
              actual: actual ? [actual] : undefined
            }]);
          }

          setLoading(false);
          return;
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Invalid game number. Please select a number between 1 and ${games.length}.`
          }]);
          setLoading(false);
          return;
        }
      }

      const parsed = parseUserRequest(userMessage);

      if (!parsed.week) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I need a week number! Try: \"Predict Week 14 Chiefs vs Chargers\" or \"Run all Week 13 games\""
        }]);
        setLoading(false);
        return;
      }

      // Fetch games for that week
      const games = await NFLAPI.getWeekGames(2025, parsed.week);

      if (games.length === 0) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `No games found for Week ${parsed.week}.`
        }]);
        setLoading(false);
        return;
      }

      let gamesToPredict: Game[] = [];

      if (parsed.isAllGames) {
        // Predict all games
        gamesToPredict = games;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Found ${games.length} games in Week ${parsed.week}. Generating predictions using Week ${parsed.week - 1} standings...`
        }]);
      } else if (parsed.teams.length > 0) {
        // Filter by mentioned teams
        gamesToPredict = games.filter(g => {
          const homeTeam = g.homeTeam.name.toLowerCase();
          const awayTeam = g.awayTeam.name.toLowerCase();
          return parsed.teams.some(t => homeTeam.includes(t) || awayTeam.includes(t));
        });

        if (gamesToPredict.length === 0) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Couldn't find a game matching "${parsed.teams.join(', ')}" in Week ${parsed.week}. Available games:\n\n${games.map(g => `${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation}`).join('\n')}`
          }]);
          setLoading(false);
          return;
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Found ${gamesToPredict.length} game(s). Predicting using Week ${parsed.week - 1} standings...`
        }]);
      } else {
        // Show available games with context
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Week ${parsed.week} games:\n\n${games.map((g, i) => `${i + 1}. ${g.awayTeam.name} @ ${g.homeTeam.name}${g.status === 'completed' ? ` (Final: ${g.awayScore}-${g.homeScore})` : ''}`).join('\n')}\n\nWhich game would you like me to predict? (Just type the number)`,
          gamesList: games,
          week: parsed.week
        }]);
        setLoading(false);
        return;
      }

      // Generate predictions
      const predictions = [];
      const actuals = [];

      for (const game of gamesToPredict) {
        const prediction = await predictGame(game, parsed.week - 1);

        if (prediction) {
          predictions.push(prediction);

          // If game is completed, get actual results
          if (game.status === 'completed') {
            actuals.push({
              gameId: game.id,
              homeTeam: game.homeTeam.name,
              awayTeam: game.awayTeam.name,
              homeScore: game.homeScore || 0,
              awayScore: game.awayScore || 0
            });
          }
        }
      }

      // Calculate accuracy if we have completed games
      let accuracy = null;
      if (actuals.length > 0) {
        let correct = 0;
        let totalSpreadError = 0;
        let totalTotalError = 0;

        for (const actual of actuals) {
          const pred = predictions.find(p => p.gameId === actual.gameId);
          if (pred) {
            const predictedWinner = pred.predictedScore.home > pred.predictedScore.away ? 'home' : 'away';
            const actualWinner = actual.homeScore > actual.awayScore ? 'home' : 'away';

            if (predictedWinner === actualWinner) correct++;

            const actualSpread = actual.homeScore - actual.awayScore;
            const actualTotal = actual.homeScore + actual.awayScore;

            totalSpreadError += Math.abs(pred.predictedSpread - actualSpread);
            totalTotalError += Math.abs(pred.predictedTotal - actualTotal);
          }
        }

        accuracy = {
          winnerCorrect: correct,
          total: actuals.length,
          winPct: ((correct / actuals.length) * 100).toFixed(1),
          avgSpreadError: (totalSpreadError / actuals.length).toFixed(1),
          avgTotalError: (totalTotalError / actuals.length).toFixed(1)
        };
      }

      // Add results message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Generated ${predictions.length} prediction(s)`,
        prediction: predictions,
        actual: actuals.length > 0 ? actuals : null,
        accuracy
      }]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <LoggedInHeader />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl rounded-lg p-4 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'system'
                  ? 'bg-blue-50 text-gray-700 border border-blue-200'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Prediction Results */}
                {msg.prediction && (
                  <div className="mt-4 space-y-3">
                    {msg.prediction.map((pred: any, i: number) => {
                      const actual = msg.actual?.find((a: any) => a.gameId === pred.gameId);
                      const predictedWinner = pred.predictedScore.home > pred.predictedScore.away ? 'home' : 'away';
                      const actualWinner = actual ? (actual.homeScore > actual.awayScore ? 'home' : 'away') : null;
                      const isCorrect = actualWinner ? predictedWinner === actualWinner : null;

                      return (
                        <div key={i} className="bg-white rounded border border-gray-200 p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">
                                {pred.awayTeam} @ {pred.homeTeam}
                              </h3>
                              <p className="text-sm text-gray-600">Confidence: {pred.confidence}%</p>
                            </div>
                            {isCorrect !== null && (
                              <div className="flex items-center gap-2">
                                {isCorrect ? (
                                  <>
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="text-green-600 font-semibold">CORRECT</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    <span className="text-red-600 font-semibold">INCORRECT</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Three Bet Types */}
                          <div className="space-y-3 mb-4">
                            {/* 1. MONEYLINE (Winner) */}
                            <div className="bg-blue-50 rounded border border-blue-200 p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-sm font-semibold text-blue-700">🎯 MONEYLINE (Winner)</div>
                                  <div className="text-2xl font-bold text-gray-900 mt-1">
                                    {pred.predictedScore.home > pred.predictedScore.away ? pred.homeTeam : pred.awayTeam}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Predicted: {pred.predictedScore.away}-{pred.predictedScore.home} | Confidence: {pred.confidence}%
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded text-xs font-bold ${
                                  pred.confidence >= 70 ? 'bg-green-100 text-green-700' :
                                  pred.confidence >= 65 ? 'bg-blue-100 text-blue-700' :
                                  pred.confidence >= 55 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {pred.confidence >= 70 ? 'GOOD BET' :
                                   pred.confidence >= 65 ? 'GOOD BET' :
                                   pred.confidence >= 55 ? 'SLIGHT EDGE' : 'AVOID'}
                                </span>
                              </div>
                              {actual && (
                                <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-blue-200">
                                  Actual Winner: {actual.homeScore > actual.awayScore ? pred.homeTeam : pred.awayTeam} ({actual.awayScore}-{actual.homeScore})
                                </div>
                              )}
                            </div>

                            {/* 2. SPREAD */}
                            <div className="bg-purple-50 rounded border border-purple-200 p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-sm font-semibold text-purple-700">📏 SPREAD</div>
                                  <div className="text-2xl font-bold text-gray-900 mt-1">
                                    {pred.homeTeam} {pred.predictedSpread > 0 ? '+' : ''}{pred.predictedSpread.toFixed(1)}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {pred.predictedSpread > 0
                                      ? `${pred.homeTeam} +${pred.predictedSpread.toFixed(1)} (underdog)`
                                      : `${pred.homeTeam} ${pred.predictedSpread.toFixed(1)} (favorite)`
                                    }
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  Math.abs(pred.predictedSpread) >= 7 && pred.confidence >= 70 ? 'bg-green-100 text-green-700' :
                                  Math.abs(pred.predictedSpread) >= 4 && pred.confidence >= 65 ? 'bg-blue-100 text-blue-700' :
                                  Math.abs(pred.predictedSpread) >= 3 && pred.confidence >= 55 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {Math.abs(pred.predictedSpread) >= 7 && pred.confidence >= 70 ? 'STRONG BET' :
                                   Math.abs(pred.predictedSpread) >= 4 && pred.confidence >= 65 ? 'GOOD BET' :
                                   Math.abs(pred.predictedSpread) >= 3 && pred.confidence >= 55 ? 'SLIGHT EDGE' : 'AVOID'}
                                </span>
                              </div>
                              {actual && (
                                <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-purple-200">
                                  Actual Spread: {pred.homeTeam} {(actual.homeScore - actual.awayScore) > 0 ? '+' : ''}{(actual.homeScore - actual.awayScore).toFixed(1)} |
                                  Error: ±{Math.abs(pred.predictedSpread - (actual.homeScore - actual.awayScore)).toFixed(1)} pts
                                </div>
                              )}
                            </div>

                            {/* 3. TOTAL (Over/Under) */}
                            <div className="bg-orange-50 rounded border border-orange-200 p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-sm font-semibold text-orange-700">📊 TOTAL (Over/Under)</div>
                                  <div className="text-2xl font-bold text-gray-900 mt-1">
                                    {pred.predictedTotal.toFixed(1)} points
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Projected: {pred.awayTeam} {pred.predictedScore.away} + {pred.homeTeam} {pred.predictedScore.home}
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  pred.confidence >= 70 ? 'bg-green-100 text-green-700' :
                                  pred.confidence >= 65 ? 'bg-blue-100 text-blue-700' :
                                  pred.confidence >= 55 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {pred.confidence >= 70 ? 'STRONG BET' :
                                   pred.confidence >= 65 ? 'GOOD BET' :
                                   pred.confidence >= 55 ? 'SLIGHT EDGE' : 'AVOID'}
                                </span>
                              </div>
                              {actual && (
                                <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-orange-200">
                                  Actual Total: {(actual.homeScore + actual.awayScore).toFixed(1)} points |
                                  Error: ±{Math.abs(pred.predictedTotal - (actual.homeScore + actual.awayScore)).toFixed(1)} pts
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Prediction Accuracy Summary (for completed games) */}
                          {actual && (
                            <div className="mt-4 bg-white rounded border border-gray-200 p-4">
                              <h4 className="font-bold text-sm mb-3 text-gray-900">📊 Prediction Results</h4>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                {/* Moneyline Result */}
                                <div className={`p-3 rounded border ${
                                  isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                  <div className="text-xs text-gray-600 mb-1">MONEYLINE</div>
                                  <div className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                    {isCorrect ? '✓ CORRECT' : '✗ WRONG'}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Predicted: {predictedWinner === 'home' ? pred.homeTeam : pred.awayTeam}
                                  </div>
                                </div>

                                {/* Spread Result */}
                                <div className="p-3 rounded bg-purple-50 border border-purple-200">
                                  <div className="text-xs text-gray-600 mb-1">SPREAD</div>
                                  <div className={`font-bold ${
                                    Math.abs(pred.predictedSpread - (actual.homeScore - actual.awayScore)) <= 3 ? 'text-green-700' :
                                    Math.abs(pred.predictedSpread - (actual.homeScore - actual.awayScore)) <= 7 ? 'text-yellow-700' : 'text-red-700'
                                  }`}>
                                    {Math.abs(pred.predictedSpread - (actual.homeScore - actual.awayScore)) <= 3 ? '✓ EXCELLENT' :
                                     Math.abs(pred.predictedSpread - (actual.homeScore - actual.awayScore)) <= 7 ? '△ GOOD' : '✗ MISS'}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Error: ±{Math.abs(pred.predictedSpread - (actual.homeScore - actual.awayScore)).toFixed(1)} pts
                                  </div>
                                </div>

                                {/* Total Result */}
                                <div className="p-3 rounded bg-orange-50 border border-orange-200">
                                  <div className="text-xs text-gray-600 mb-1">TOTAL</div>
                                  <div className={`font-bold ${
                                    Math.abs(pred.predictedTotal - (actual.homeScore + actual.awayScore)) <= 3 ? 'text-green-700' :
                                    Math.abs(pred.predictedTotal - (actual.homeScore + actual.awayScore)) <= 7 ? 'text-yellow-700' : 'text-red-700'
                                  }`}>
                                    {Math.abs(pred.predictedTotal - (actual.homeScore + actual.awayScore)) <= 3 ? '✓ EXCELLENT' :
                                     Math.abs(pred.predictedTotal - (actual.homeScore + actual.awayScore)) <= 7 ? '△ GOOD' : '✗ MISS'}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Error: ±{Math.abs(pred.predictedTotal - (actual.homeScore + actual.awayScore)).toFixed(1)} pts
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* AI Reasoning */}
                          {pred.reasoning && (
                            <div className="mt-3 bg-blue-50 rounded border border-blue-200 p-3">
                              <div className="text-xs text-blue-700 font-semibold mb-1">AI ANALYSIS</div>
                              <p className="text-sm text-gray-700">{pred.reasoning}</p>
                            </div>
                          )}

                          {/* Game Intelligence */}
                          <GameIntelligence
                            homeTeam={pred.homeTeam}
                            awayTeam={pred.awayTeam}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Accuracy Summary */}
                {msg.accuracy && (
                  <div className="mt-4 bg-white rounded border border-gray-200 p-4">
                    <h4 className="font-bold text-lg mb-3 text-gray-900">📊 Accuracy Summary</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Winner Accuracy</div>
                        <div className="text-2xl font-bold text-green-700">{msg.accuracy.winPct}%</div>
                        <div className="text-xs text-gray-500">{msg.accuracy.winnerCorrect}W - {msg.accuracy.total - msg.accuracy.winnerCorrect}L</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Avg Spread Error</div>
                        <div className="text-2xl font-bold text-blue-700">±{msg.accuracy.avgSpreadError}</div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Avg Total Error</div>
                        <div className="text-2xl font-bold text-purple-700">±{msg.accuracy.avgTotalError}</div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-gray-900">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
