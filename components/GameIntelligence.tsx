'use client';

import { useState } from 'react';
import { CloudRain, Activity, Newspaper, AlertCircle, TrendingDown, TrendingUp, Loader2, Brain } from 'lucide-react';

interface GameIntelligenceProps {
  homeTeam: string;
  awayTeam: string;
  gameDate?: string;
  location?: string;
}

interface IntelligenceData {
  injuries: {
    summary: string;
    keyInjuries: string[];
    impact: 'high' | 'medium' | 'low';
  };
  weather: {
    summary: string;
    conditions: string;
    impact: 'high' | 'medium' | 'low';
  };
  news: {
    summary: string;
    keyStorylines: string[];
    impact: 'high' | 'medium' | 'low';
  };
  overall: {
    confidenceAdjustment: number;
    recommendation: string;
  };
}

export default function GameIntelligence({ homeTeam, awayTeam, gameDate, location }: GameIntelligenceProps) {
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchIntelligence = async () => {
    if (intelligence) {
      // Toggle expanded state if already loaded
      setExpanded(!expanded);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/game-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam,
          awayTeam,
          gameDate,
          location,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch intelligence');
      }

      const data = await response.json();
      setIntelligence(data.intelligence);
      setExpanded(true);
    } catch (err: any) {
      setError(err.message || 'Error loading intelligence');
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

  const getImpactIcon = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      case 'medium':
        return <TrendingDown className="w-4 h-4" />;
      case 'low':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={fetchIntelligence}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded p-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {loading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Brain className="w-5 h-5 text-white" />
            )}
            <span className="text-white font-semibold text-sm">
              {loading ? 'Gathering Intelligence...' : intelligence ? (expanded ? 'Hide Intelligence' : 'Show Intelligence') : 'Get Pre-Game Intelligence'}
            </span>
          </div>
          {intelligence && intelligence.overall.confidenceAdjustment !== 0 && (
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              intelligence.overall.confidenceAdjustment > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {intelligence.overall.confidenceAdjustment > 0 ? '+' : ''}{intelligence.overall.confidenceAdjustment}% Confidence
            </span>
          )}
        </div>
      </button>

      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {intelligence && expanded && (
        <div className="mt-3 space-y-3">
          {/* Injuries */}
          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold text-gray-900">Injury Report</h4>
              </div>
              <div className={`flex items-center space-x-1 ${getImpactColor(intelligence.injuries.impact)}`}>
                {getImpactIcon(intelligence.injuries.impact)}
                <span className="text-xs font-semibold uppercase">{intelligence.injuries.impact} Impact</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-2">{intelligence.injuries.summary}</p>
            {intelligence.injuries.keyInjuries.length > 0 && (
              <ul className="space-y-1">
                {intelligence.injuries.keyInjuries.map((injury, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>{injury}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weather */}
          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <CloudRain className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Weather Conditions</h4>
              </div>
              <div className={`flex items-center space-x-1 ${getImpactColor(intelligence.weather.impact)}`}>
                {getImpactIcon(intelligence.weather.impact)}
                <span className="text-xs font-semibold uppercase">{intelligence.weather.impact} Impact</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-1">{intelligence.weather.summary}</p>
            <p className="text-gray-600 text-xs">{intelligence.weather.conditions}</p>
          </div>

          {/* News */}
          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Newspaper className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-gray-900">News & Storylines</h4>
              </div>
              <div className={`flex items-center space-x-1 ${getImpactColor(intelligence.news.impact)}`}>
                {getImpactIcon(intelligence.news.impact)}
                <span className="text-xs font-semibold uppercase">{intelligence.news.impact} Impact</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-2">{intelligence.news.summary}</p>
            {intelligence.news.keyStorylines.length > 0 && (
              <ul className="space-y-1">
                {intelligence.news.keyStorylines.map((storyline, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start">
                    <span className="text-purple-600 mr-2">•</span>
                    <span>{storyline}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Overall Recommendation */}
          <div className={`rounded-lg p-4 border ${
            intelligence.overall.confidenceAdjustment > 0
              ? 'bg-green-900/20 border-green-700'
              : intelligence.overall.confidenceAdjustment < 0
              ? 'bg-red-900/20 border-red-700'
              : 'bg-blue-900/20 border-blue-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-white">Overall Assessment</h4>
              {intelligence.overall.confidenceAdjustment !== 0 && (
                <span className={`text-sm font-bold ${
                  intelligence.overall.confidenceAdjustment > 0
                    ? 'text-green-300'
                    : 'text-red-300'
                }`}>
                  {intelligence.overall.confidenceAdjustment > 0 ? '▲' : '▼'} {Math.abs(intelligence.overall.confidenceAdjustment)}% Confidence
                </span>
              )}
            </div>
            <p className={`text-sm ${
              intelligence.overall.confidenceAdjustment > 0
                ? 'text-green-200'
                : intelligence.overall.confidenceAdjustment < 0
                ? 'text-red-200'
                : 'text-blue-200'
            }`}>
              {intelligence.overall.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
