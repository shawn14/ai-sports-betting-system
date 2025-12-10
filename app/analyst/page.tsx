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

  function getPriorityColor(priority: 'HIGH' | 'MEDIUM' | 'LOW') {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-700 border-red-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'LOW': return 'bg-green-100 text-green-700 border-green-300';
    }
  }

  function getPriorityIcon(priority: 'HIGH' | 'MEDIUM' | 'LOW') {
    switch (priority) {
      case 'HIGH': return '🔴';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
    }
  }

  function getSectionIcon(title: string) {
    if (title.toLowerCase().includes('performance')) return <BarChart3 className="w-5 h-5" />;
    if (title.toLowerCase().includes('pattern')) return <TrendingUp className="w-5 h-5" />;
    if (title.toLowerCase().includes('strategy') || title.toLowerCase().includes('recommendation')) return <Target className="w-5 h-5" />;
    if (title.toLowerCase().includes('trend') || title.toLowerCase().includes('momentum')) return <Lightbulb className="w-5 h-5" />;
    return <Brain className="w-5 h-5" />;
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
        {!loading && report && (
          <div className="space-y-3">
            {/* Compact Header with Stats - ESPN Style */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Week {report.week} Performance Analysis
                    </h2>
                    <p className="text-xs text-gray-600">
                      {report.season} NFL Season • {new Date(report.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-gray-50 rounded px-3 py-1.5 border border-gray-200">
                    <div className="text-xs text-gray-600">Games</div>
                    <div className="text-lg font-bold text-gray-900">{report.dataSnapshot.totalGames}</div>
                  </div>
                  <div className="bg-gray-50 rounded px-3 py-1.5 border border-gray-200">
                    <div className="text-xs text-gray-600">ROI</div>
                    <div className={`text-lg font-bold ${report.dataSnapshot.overallROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {report.dataSnapshot.overallROI >= 0 ? '+' : ''}{report.dataSnapshot.overallROI.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-gray-50 rounded p-2.5 border border-gray-200">
                <p className="text-gray-700 leading-snug text-xs">
                  {report.executiveSummary}
                </p>
              </div>
            </div>

            {/* Report Sections in Two Columns */}
            <div className="grid lg:grid-cols-2 gap-3">
              {report.sections.map((section, idx) => (
                <div key={idx} className="bg-white rounded border border-gray-200 p-3">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    {getSectionIcon(section.title)}
                    {section.title}
                  </h3>

                  {/* Key Metrics First */}
                  {section.keyMetrics && Object.keys(section.keyMetrics).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(section.keyMetrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-xs text-blue-800">{key}:</span>
                            <span className="text-xs font-semibold text-blue-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content - More Compact */}
                  <div className="prose max-w-none mb-2 space-y-1.5">
                    {section.content.split('\n').filter(line => line.trim()).map((line, pIdx) => {
                      // Check if it's a markdown header (###)
                      if (line.trim().startsWith('###')) {
                        const headerText = line.replace(/^###\s*/, '').trim();
                        return (
                          <h4 key={pIdx} className="font-semibold text-gray-900 mt-2 mb-1 text-xs">
                            {headerText}
                          </h4>
                        );
                      }
                      // Skip lines that are just dashes or asterisks
                      if (line.match(/^[-*\s]+$/)) {
                        return null;
                      }
                      // Regular paragraph - remove all bold markers
                      const text = line.trim().replace(/\*\*/g, '');
                      return (
                        <p key={pIdx} className="text-gray-700 leading-snug text-xs">
                          {text}
                        </p>
                      );
                    })}
                  </div>

                  {/* Insights - Compact */}
                  {section.insights && section.insights.length > 0 && (
                    <div className="bg-gray-50 rounded p-2 mb-2">
                      <h4 className="font-semibold text-gray-900 mb-1.5 text-xs">Key Insights</h4>
                      <ul className="space-y-1">
                        {section.insights.map((insight, iIdx) => (
                          <li key={iIdx} className="flex items-start gap-1.5 text-gray-700">
                            <span className="text-blue-600 text-xs">•</span>
                            <span className="text-xs leading-snug">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations - Compact */}
                  {section.recommendations && section.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900 text-xs">Model Insights</h4>
                      {section.recommendations.map((rec, rIdx) => (
                        <div key={rIdx} className={`border rounded p-2 ${getPriorityColor(rec.priority)}`}>
                          <div className="flex items-start gap-1.5">
                            <span className="text-sm">{getPriorityIcon(rec.priority)}</span>
                            <div className="flex-1">
                              <div className="font-semibold mb-0.5 text-xs">
                                {rec.priority}: {rec.action}
                              </div>
                              <div className="text-xs opacity-90 leading-snug">
                                {rec.reasoning}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Note */}
            <div className="bg-gray-100 border border-gray-300 rounded px-3 py-1.5 text-center text-xs text-gray-600">
              Generated by Claude AI • {report.dataSnapshot.totalGames} games analyzed • Week {report.week}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
