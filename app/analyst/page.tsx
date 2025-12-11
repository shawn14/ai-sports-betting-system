'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import LoggedInHeader from '@/components/LoggedInHeader';
import { BarChart3, TrendingUp, Target, Lightbulb, RefreshCw, Brain, Calendar } from 'lucide-react';
import { WeeklyAnalystReport } from '@/types';

export default function AnalystPage() {
  const [report, setReport] = useState<WeeklyAnalystReport | null>(null);
  const [allReports, setAllReports] = useState<WeeklyAnalystReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (selectedReportId && allReports.length > 0) {
      const selectedReport = allReports.find(r => r.reportId === selectedReportId);
      if (selectedReport) {
        setReport(selectedReport);
      }
    }
  }, [selectedReportId, allReports]);

  async function loadReports() {
    try {
      setLoading(true);
      setError(null);

      const reportsQuery = query(
        collection(db, 'analyst_reports'),
        orderBy('generatedAt', 'desc')
      );

      const snapshot = await getDocs(reportsQuery);
      const reports = snapshot.docs.map(doc => ({
        reportId: doc.id,
        ...doc.data()
      })) as WeeklyAnalystReport[];

      setAllReports(reports);

      // Auto-select the latest report
      if (reports.length > 0) {
        setReport(reports[0]);
        setSelectedReportId(reports[0].reportId);
      }
    } catch (err: any) {
      console.error('Error loading analyst reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getPriorityIcon(priority: 'HIGH' | 'MEDIUM' | 'LOW') {
    switch (priority) {
      case 'HIGH': return '🔴';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
    }
  }

  function getPriorityBg(priority: 'HIGH' | 'MEDIUM' | 'LOW') {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 border-red-300';
      case 'MEDIUM': return 'bg-yellow-100 border-yellow-300';
      case 'LOW': return 'bg-green-100 border-green-300';
    }
  }

  // Extract all metrics from all sections
  function extractAllMetrics(sections: AnalystReportSection[]) {
    const metrics: Array<{ label: string; value: string | number }> = [];
    sections.forEach(section => {
      if (section.keyMetrics) {
        Object.entries(section.keyMetrics).forEach(([key, value]) => {
          metrics.push({ label: key, value });
        });
      }
    });
    return metrics;
  }

  // Extract all insights from all sections
  function extractAllInsights(sections: AnalystReportSection[]) {
    const insights: string[] = [];
    sections.forEach(section => {
      if (section.insights && section.insights.length > 0) {
        insights.push(...section.insights);
      }
    });
    return insights;
  }

  // Extract and sort all recommendations from all sections
  function extractAllRecommendations(sections: AnalystReportSection[]) {
    const recs: Array<{priority: 'HIGH' | 'MEDIUM' | 'LOW'; action: string; reasoning: string}> = [];
    sections.forEach(section => {
      if (section.recommendations && section.recommendations.length > 0) {
        recs.push(...section.recommendations);
      }
    });
    // Sort by priority: HIGH -> MEDIUM -> LOW
    return recs.sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.priority] - order[b.priority];
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <LoggedInHeader />

      <div className="max-w-[1600px] mx-auto px-4 py-4">
        {/* Compact Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Analyst Reports</h1>
              <p className="text-xs text-gray-600">
                Weekly analysis of model performance and prediction accuracy
              </p>
            </div>
            {allReports.length > 0 && (
              <div className="flex items-center gap-2 ml-8">
                <Calendar className="w-4 h-4 text-gray-600" />
                <select
                  value={selectedReportId || ''}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {allReports.map(r => (
                    <option key={r.reportId} value={r.reportId}>
                      Week {r.week}, {r.season} - {new Date(r.generatedAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            onClick={loadReports}
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
            <p className="text-gray-600">Loading analyst reports...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && allReports.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analyst Reports Yet</h3>
            <p className="text-gray-600 mb-4">
              Analyst reports are generated automatically every Wednesday at 8am, analyzing the previous week's performance.
            </p>
            <p className="text-sm text-gray-500">
              The first report will appear after Week 1 completes. Check back after Wednesday!
            </p>
          </div>
        )}

        {/* Report Display */}
        {!loading && report && (() => {
          const allMetrics = extractAllMetrics(report.sections);
          const allInsights = extractAllInsights(report.sections);
          const allRecommendations = extractAllRecommendations(report.sections);

          return (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Week {report.week} Performance Report
                    </h2>
                    <p className="text-sm text-gray-600">
                      {report.season} NFL Season • {new Date(report.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded px-4 py-2 border border-gray-200">
                    <div className="text-xs text-gray-600">Games Analyzed</div>
                    <div className="text-2xl font-bold text-gray-900">{report.dataSnapshot.totalGames}</div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {report.executiveSummary}
                  </p>
                </div>
              </div>

              {/* Quick Stats Card - Visual Dashboard */}
              {allMetrics.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Performance Metrics
                  </h2>
                  <div className="space-y-4">
                    {allMetrics.map((metric, idx) => {
                      // Try to extract percentage from metric value
                      const valueStr = String(metric.value);
                      const percentMatch = valueStr.match(/(\d+(?:\.\d+)?)\s*%/);
                      const hasPercent = percentMatch !== null;
                      const percentage = hasPercent ? parseFloat(percentMatch[1]) : 0;

                      // Determine color based on metric name and value
                      let barColor = 'bg-blue-500';
                      if (hasPercent) {
                        if (percentage >= 60) barColor = 'bg-green-500';
                        else if (percentage >= 50) barColor = 'bg-yellow-500';
                        else barColor = 'bg-red-500';
                      }

                      return (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-700">{metric.label}</span>
                            <span className="text-base font-bold text-gray-900">{metric.value}</span>
                          </div>
                          {hasPercent && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Team Performance Card - Only show if we have data */}
              {(report.dataSnapshot.bestPerformingTeams.length > 0 || report.dataSnapshot.worstPerformingTeams.length > 0) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Team Performance
                  </h2>

                  {/* Top Performers */}
                  {report.dataSnapshot.bestPerformingTeams.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-600 uppercase mb-1.5">Top Performers</div>
                      <div className="space-y-1">
                        {report.dataSnapshot.bestPerformingTeams.map((team, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-green-50 rounded p-2 border border-green-200">
                            <span className="text-lg">🏆</span>
                            <span className="text-sm font-medium text-gray-900">{team}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Underperformers */}
                  {report.dataSnapshot.worstPerformingTeams.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase mb-1.5">Underperformers</div>
                      <div className="space-y-1">
                        {report.dataSnapshot.worstPerformingTeams.map((team, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-red-50 rounded p-2 border border-red-200">
                            <span className="text-lg">📉</span>
                            <span className="text-sm font-medium text-gray-900">{team}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Key Insights Card - Visual Report Style */}
              {allInsights.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Key Insights
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {allInsights.map((insight, idx) => {
                      // Try to extract percentage from insight text
                      const percentMatch = insight.match(/(\d+(?:\.\d+)?)\s*%/);
                      const hasPercent = percentMatch !== null;
                      const percentage = hasPercent ? parseFloat(percentMatch[1]) : 0;

                      return (
                        <div key={idx} className="bg-white rounded-lg p-4 border border-yellow-300 shadow-sm hover:shadow-md transition">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                              <span className="text-xl">💡</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 leading-relaxed font-medium mb-2">
                                {insight}
                              </p>
                              {hasPercent && percentage > 0 && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-600">Performance</span>
                                    <span className="text-xs font-bold text-yellow-700">{percentage}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Takeaways Card */}
              {allRecommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Takeaways
                  </h2>
                  <div className="space-y-3">
                    {allRecommendations.map((rec, idx) => (
                      <div key={idx} className={`border rounded-lg p-3 ${getPriorityBg(rec.priority)}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{getPriorityIcon(rec.priority)}</span>
                          <div className="flex-1">
                            <div className="font-bold text-sm text-gray-900 mb-1">
                              {rec.action}
                            </div>
                            <div className="text-sm text-gray-700">
                              {rec.reasoning.split('.')[0]}.
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 text-center text-sm text-gray-600">
                Generated by Claude AI • {report.dataSnapshot.totalGames} games analyzed • Week {report.week}
              </div>
            </div>
          );
        })()}
      </div>
    </main>
  );
}
