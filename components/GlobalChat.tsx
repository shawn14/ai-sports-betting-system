'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { NFLAPI } from '@/lib/api/nfl';
import { usePathname } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  prediction?: any;
  sources?: string[];
  suggestedFollowUps?: string[];
}

// Suggested questions when chat opens
const INITIAL_SUGGESTIONS = [
  "What teams have the most momentum right now?",
  "Which games have significant injury concerns?",
  "What does the AI analyst say about this week?",
  "Which teams are over/underperforming expectations?",
  "What weather conditions could impact games?"
];

export default function GlobalChat() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Stream text word by word like ChatGPT
  const streamText = async (text: string, sources?: string[], suggestedFollowUps?: string[]) => {
    setIsStreaming(true);
    setStreamingText('');

    const words = text.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      setStreamingText(currentText);

      // Adjust speed: faster for shorter words, slower for longer
      const delay = words[i].length > 8 ? 40 : 25;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Once streaming is complete, add to messages
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: text,
      sources,
      suggestedFollowUps
    }]);

    setIsStreaming(false);
    setStreamingText('');
  };

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
      // Get AI-powered response with intelligence data
      const response = await analyzeQuestion(userMessage);

      // Stream the response text word by word
      await streamText(
        response.message,
        response.sources,
        response.suggestedFollowUps
      );
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error analyzing your question. Please try rephrasing it."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeQuestion = async (question: string): Promise<{ message: string; prediction?: any; sources?: string[]; suggestedFollowUps?: string[] }> => {
    try {
      // Get current season/week
      const { week: currentWeek } = await NFLAPI.getCurrentSeasonWeek();

      // Extract week number from question if specified
      let queryWeek = currentWeek;
      const weekMatch = question.toLowerCase().match(/week\s+(\d+)/);
      if (weekMatch) {
        queryWeek = parseInt(weekMatch[1]);
      }

      // Build conversation history from messages state
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call AI intelligence endpoint
      const response = await fetch('/api/chat-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          conversationHistory,
          season: 2025,
          week: queryWeek
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      return {
        message: data.answer || 'I received your question but had trouble generating a response.',
        sources: data.sources,
        suggestedFollowUps: data.suggestedFollowUps
      };

    } catch (error) {
      console.error('Error in analyzeQuestion:', error);
      return {
        message: "I'm having trouble accessing the intelligence data right now. Please try again in a moment."
      };
    }
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
        {/* Header - ESPN Style Light */}
        <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b-2 border-blue-600 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-blue-600"></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                PREDICTION<span className="text-blue-600">MATRIX</span>
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">AI-Powered Analysis</p>
            </div>
          </div>
          <button
            onClick={() => setIsFullScreen(false)}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition"
            aria-label="Minimize chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Initial suggestions when no messages */}
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="mb-8">
                  <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded mb-3">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Live Intelligence</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Ask About NFL Market Intelligence
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Real-time access to rankings, game intelligence, analyst insights & predictions
                  </p>
                </div>
                <div className="flex flex-col gap-2 max-w-2xl mx-auto">
                  {INITIAL_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="group text-left px-4 py-3.5 bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-600 transition-all text-gray-700 hover:text-gray-900 shadow-sm hover:shadow"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="text-sm font-medium">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-5 py-3.5 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="text-xs text-gray-500 font-medium mb-1">Sources:</div>
                      <div className="text-xs text-gray-600">
                        {msg.sources.join(' • ')}
                      </div>
                    </div>
                  )}

                  {/* Suggested Follow-ups */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="text-xs text-gray-500 font-medium mb-2">Try asking:</div>
                      <div className="flex flex-col gap-1.5">
                        {msg.suggestedFollowUps.map((followUp, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setInput(followUp);
                              inputRef.current?.focus();
                            }}
                            className="text-left text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition"
                          >
                            {followUp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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

            {/* Streaming text (like ChatGPT) */}
            {isStreaming && streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-5 py-3.5 bg-gray-50 text-gray-900 border border-gray-200">
                  <div className="whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-1 h-4 bg-blue-600 ml-0.5 animate-pulse"></span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {loading && !isStreaming && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t-2 border-gray-200 p-6 bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about NFL intelligence..."
              className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-gray-900 text-base transition-all"
              disabled={loading}
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <div className="w-1 h-6 bg-blue-600"></div>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Market Intel</span>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            placeholder="Ask about NFL intelligence, rankings, predictions..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-gray-900 transition-all"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
