'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { NFLAPI } from '@/lib/api/nfl';
import { usePathname } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  prediction?: any;
}

export default function GlobalChat() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when entering fullscreen
  useEffect(() => {
    if (isFullScreen) {
      inputRef.current?.focus();
    }
  }, [isFullScreen]);

  // Don't show chat on homepage or other public pages
  const publicPages = ['/', '/pricing', '/signup', '/login', '/terms', '/privacy', '/contact'];
  if (publicPages.includes(pathname)) {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Enter fullscreen mode on first message
    if (messages.length === 0) {
      setIsFullScreen(true);
    }

    try {
      // Parse the user's question to extract team and week info
      const response = await analyzeQuestion(userMessage);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        prediction: response.prediction
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error analyzing your question. Please try rephrasing it."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeQuestion = async (question: string): Promise<{ message: string; prediction?: any }> => {
    const lowerQ = question.toLowerCase();

    // Check if question is about rankings/stats
    if (lowerQ.includes('best offense') || lowerQ.includes('top offense')) {
      try {
        const response = await fetch('/api/rankings?season=2025&week=15');
        const data = await response.json();
        const teams = data.teams;

        // Sort by offensive rating
        teams.sort((a: any, b: any) => b.offensive - a.offensive);
        const topOffenses = teams.slice(0, 5);

        const message = `**Top 5 Offenses (by Offensive Rating):**\n\n${topOffenses.map((t: any, i: number) =>
          `${i + 1}. ${t.team} - ${t.offensive.toFixed(2)} offensive rating`
        ).join('\n')}`;

        return { message };
      } catch (error) {
        return { message: "I had trouble loading the rankings data. Please try again." };
      }
    }

    if (lowerQ.includes('best defense') || lowerQ.includes('top defense')) {
      try {
        const response = await fetch('/api/rankings?season=2025&week=15');
        const data = await response.json();
        const teams = data.teams;

        teams.sort((a: any, b: any) => b.defensive - a.defensive);
        const topDefenses = teams.slice(0, 5);

        const message = `**Top 5 Defenses (by Defensive Rating):**\n\n${topDefenses.map((t: any, i: number) =>
          `${i + 1}. ${t.team} - ${t.defensive.toFixed(2)} defensive rating`
        ).join('\n')}`;

        return { message };
      } catch (error) {
        return { message: "I had trouble loading the rankings data. Please try again." };
      }
    }

    if (lowerQ.includes('hot') || lowerQ.includes('momentum')) {
      try {
        const response = await fetch('/api/rankings?season=2025&week=15');
        const data = await response.json();
        const teams = data.teams;

        teams.sort((a: any, b: any) => b.momentum - a.momentum);
        const hotTeams = teams.slice(0, 5);

        const message = `**Hottest Teams (by Momentum):**\n\n${hotTeams.map((t: any, i: number) =>
          `${i + 1}. ${t.team} - ${t.momentum.toFixed(2)} momentum rating`
        ).join('\n')}`;

        return { message };
      } catch (error) {
        return { message: "I had trouble loading the rankings data. Please try again." };
      }
    }

    if (lowerQ.includes('rankings') || lowerQ.includes('power rankings')) {
      try {
        const response = await fetch('/api/rankings?season=2025&week=15');
        const data = await response.json();
        const teams = data.teams;

        const topTeams = teams.slice(0, 10);

        const message = `**Top 10 Power Rankings (by TSR):**\n\n${topTeams.map((t: any) =>
          `${t.rank}. ${t.team} (${t.record}) - ${t.tsr.toFixed(2)} TSR`
        ).join('\n')}`;

        return { message };
      } catch (error) {
        return { message: "I had trouble loading the rankings data. Please try again." };
      }
    }

    // Extract week number
    let week: number | null = null;
    const weekMatch = lowerQ.match(/week\s+(\d+)/);
    if (weekMatch) {
      week = parseInt(weekMatch[1]);
    }

    // Team name mappings
    const teamMappings: { [key: string]: string } = {
      'eagles': 'Philadelphia Eagles',
      'chargers': 'Los Angeles Chargers',
      'cowboys': 'Dallas Cowboys',
      'lions': 'Detroit Lions',
      'seahawks': 'Seattle Seahawks',
      'falcons': 'Atlanta Falcons',
      'bengals': 'Cincinnati Bengals',
      'bills': 'Buffalo Bills',
      'titans': 'Tennessee Titans',
      'browns': 'Cleveland Browns',
      'chiefs': 'Kansas City Chiefs',
      'packers': 'Green Bay Packers',
      '49ers': 'San Francisco 49ers',
      'niners': 'San Francisco 49ers',
      'ravens': 'Baltimore Ravens',
      'steelers': 'Pittsburgh Steelers'
    };

    // Find mentioned team
    let teamName: string | null = null;
    for (const [key, fullName] of Object.entries(teamMappings)) {
      if (lowerQ.includes(key)) {
        teamName = fullName;
        break;
      }
    }

    // If no week specified, use current week
    if (!week) {
      const { week: currentWeek } = await NFLAPI.getCurrentSeasonWeek();
      week = currentWeek;
    }

    // If we have a team, find their game
    if (teamName && week) {
      try {
        const games = await NFLAPI.getWeekGames(2025, week);
        const game = games.find(g =>
          g.homeTeam.name.includes(teamName!) || g.awayTeam.name.includes(teamName!)
        );

        if (game) {
          const opponent = game.homeTeam.name.includes(teamName)
            ? game.awayTeam.name
            : game.homeTeam.name;

          return {
            message: `I found the ${teamName} game in Week ${week}: ${game.awayTeam.name} @ ${game.homeTeam.name}. Let me analyze this matchup...`,
            prediction: game
          };
        } else {
          return {
            message: `I couldn't find a game for the ${teamName} in Week ${week}. They might have a bye week or the schedule isn't available yet.`
          };
        }
      } catch (error) {
        return {
          message: `I had trouble finding games for Week ${week}. Please try again.`
        };
      }
    }

    // Default response if we can't parse the question
    return {
      message: "I can help you with:\n\n• Game predictions ('Eagles Week 14')\n• Team rankings ('Show me the power rankings')\n• Best offenses ('What's the best offense?')\n• Best defenses ('Top defenses')\n• Hot teams ('Which teams have momentum?')\n\nWhat would you like to know?"
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && isFullScreen) {
      setIsFullScreen(false);
    }
  };

  const handleInputFocus = () => {
    if (messages.length > 0) {
      setIsFullScreen(true);
    }
  };


  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">AI Betting Assistant</h2>
          <button
            onClick={() => setIsFullScreen(false)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            aria-label="Minimize chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.prediction && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm font-semibold mb-2">
                        {msg.prediction.awayTeam.name} @ {msg.prediction.homeTeam.name}
                      </div>
                      <button
                        onClick={() => window.location.href = `/chat-predict?game=${msg.prediction.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        Get Full Prediction →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-6 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-6 bg-white">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about any NFL game..."
              className="flex-1 px-6 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-lg"
              disabled={loading}
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl transition flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-300 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            placeholder="Ask me anything about NFL predictions, team stats, betting strategies..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
