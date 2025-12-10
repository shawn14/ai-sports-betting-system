'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import LoggedInHeader from '@/components/LoggedInHeader';
import { Brain, Activity, CloudRain, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { GameIntelligenceCache } from '@/types';

export default function IntelligencePage() {
  const [intelligence, setIntelligence] = useState<GameIntelligenceCache[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(15); // Current week

  useEffect(() => {
    loadIntelligence();
  }, [selectedWeek]);

  async function loadIntelligence() {
    try {
      setLoading(true);
      setError(null);

      const intelligenceQuery = query(
        collection(db, 'game_intelligence_cache'),
        where('season', '==', 2025),
        where('week', '==', selectedWeek)
      );

      const snapshot = await getDocs(intelligenceQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameIntelligenceCache[];

      setIntelligence(data);
    } catch (err: any) {
      console.error('Error loading intelligence:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getImpactColor(impact: 'high' | 'medium' | 'low') {
    switch (impact) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-green-50 border-green-200 text-green-800';
    }
  }

  function getImpactBadgeColor(impact: 'high' | 'medium' | 'low') {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <LoggedInHeader />

      <div className="max-w-[1600px] mx-auto px-4 py-4">
        {/* Compact Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Game Intelligence</h1>
              <p className="text-xs text-gray-600">
                Pre-game analysis: injuries, weather, and storylines affecting predictions
              </p>
            </div>
            <div className="flex items-center gap-2 ml-8">
              <label className="text-xs font-medium text-gray-700">Week:</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={loadIntelligence}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading game intelligence...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && intelligence.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Intelligence Reports Yet</h3>
            <p className="text-gray-600 mb-4">
              Intelligence reports are generated automatically 1 hour before each game.
            </p>
            <p className="text-sm text-gray-500">
              The system runs every 2 hours on game days (Sat/Sun/Mon/Thu). Check back closer to game time.
            </p>
          </div>
        )}

        {/* Intelligence Cards - Grid Layout */}
        {!loading && intelligence.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-3">
            {intelligence.map((report) => (
              <div key={report.gameId} className="bg-white rounded border border-gray-200 overflow-hidden">
                {/* Game Header */}
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {report.awayTeam} @ {report.homeTeam}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{report.minutesBeforeKickoff} min before</span>
                    </div>
                  </div>
                </div>

                {/* Intelligence Sections - Compact */}
                <div className="p-3 space-y-2">
                  {/* Injury Report */}
                  <div className={`rounded border p-2 ${getImpactColor(report.intelligence.injuries.impact)}`}>
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        <h4 className="font-semibold text-xs">Injuries</h4>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${getImpactBadgeColor(report.intelligence.injuries.impact)}`}>
                        {report.intelligence.injuries.impact}
                      </span>
                    </div>
                    <p className="text-xs mb-1.5 leading-snug">{report.intelligence.injuries.summary}</p>
                    {report.intelligence.injuries.keyInjuries.length > 0 && (
                      <ul className="text-xs space-y-0.5">
                        {report.intelligence.injuries.keyInjuries.slice(0, 3).map((injury, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-gray-500">•</span>
                            <span className="leading-snug">{injury}</span>
                          </li>
                        ))}
                        {report.intelligence.injuries.keyInjuries.length > 3 && (
                          <li className="text-xs italic opacity-75">+{report.intelligence.injuries.keyInjuries.length - 3} more</li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Weather Conditions */}
                  <div className={`rounded border p-2 ${getImpactColor(report.intelligence.weather.impact)}`}>
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <CloudRain className="w-3.5 h-3.5" />
                        <h4 className="font-semibold text-xs">Weather</h4>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${getImpactBadgeColor(report.intelligence.weather.impact)}`}>
                        {report.intelligence.weather.impact}
                      </span>
                    </div>
                    <p className="text-xs mb-1 leading-snug">{report.intelligence.weather.summary}</p>
                    <p className="text-xs opacity-75 leading-snug">{report.intelligence.weather.conditions}</p>
                  </div>

                  {/* News & Storylines */}
                  <div className={`rounded border p-2 ${getImpactColor(report.intelligence.news.impact)}`}>
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <h4 className="font-semibold text-xs">News</h4>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${getImpactBadgeColor(report.intelligence.news.impact)}`}>
                        {report.intelligence.news.impact}
                      </span>
                    </div>
                    <p className="text-xs mb-1.5 leading-snug">{report.intelligence.news.summary}</p>
                    {report.intelligence.news.keyStorylines.length > 0 && (
                      <ul className="text-xs space-y-0.5">
                        {report.intelligence.news.keyStorylines.slice(0, 2).map((storyline, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-gray-500">•</span>
                            <span className="leading-snug">{storyline}</span>
                          </li>
                        ))}
                        {report.intelligence.news.keyStorylines.length > 2 && (
                          <li className="text-xs italic opacity-75">+{report.intelligence.news.keyStorylines.length - 2} more</li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Overall Assessment */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-blue-900 text-xs flex items-center gap-1">
                        <Brain className="w-3.5 h-3.5" />
                        Assessment
                      </h4>
                      <div className="text-xs font-bold text-blue-900">
                        {report.intelligence.overall.confidenceAdjustment > 0 ? '+' : ''}{report.intelligence.overall.confidenceAdjustment}%
                      </div>
                    </div>
                    <p className="text-xs text-blue-800 leading-snug">{report.intelligence.overall.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
