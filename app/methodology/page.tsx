'use client';

import LoggedInHeader from '@/components/LoggedInHeader';
import { Brain, Target, TrendingUp, Zap, Database, Calculator, CheckCircle } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <LoggedInHeader />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <Brain className="w-10 h-10" />
            Prediction Methodology
          </h1>
          <p className="text-slate-300 mt-2 text-lg">
            How our XGBoost machine learning models predict NFL game outcomes
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Overview */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            System Overview
          </h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 leading-relaxed">
              PredictionMatrix uses <span className="text-blue-400 font-semibold">XGBoost (Extreme Gradient Boosting)</span>,
              a powerful machine learning algorithm trained on <span className="text-green-400 font-semibold">832 historical NFL games</span> from
              the 2021-2024 seasons. The model analyzes 33 different features per game to predict:
            </p>
            <ul className="text-slate-300 space-y-2 mt-4">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-white">Point Spread:</strong> Expected margin of victory (home team perspective)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-white">Total Points:</strong> Combined score of both teams (Over/Under)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-white">Moneyline:</strong> Straight-up winner prediction</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Model Features */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-400" />
            Input Features (33 Total)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team Statistics */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Team Statistics (12 features)
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>Win Percentage:</strong> Season win rate for home and away teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>Points Per Game (PPG):</strong> Average points scored</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>Points Against (PAG):</strong> Average points allowed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>Yards Per Game:</strong> Offensive yardage</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>Yards Allowed:</strong> Defensive yardage given up</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong>Turnover Differential:</strong> Turnovers forced minus turnovers committed</span>
                </li>
              </ul>
            </div>

            {/* Recent Form */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Recent Form (4 features)
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span><strong>Last 3 Games PPG:</strong> Points scored in last 3 games (home & away)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span><strong>Last 3 Games PAG:</strong> Points allowed in last 3 games (home & away)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span className="text-slate-400 italic">Captures current momentum and hot/cold streaks</span>
                </li>
              </ul>
            </div>

            {/* Rest & Schedule */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Rest & Schedule (6 features)
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">•</span>
                  <span><strong>Rest Days:</strong> Days since last game (home & away)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">•</span>
                  <span><strong>Rest Differential:</strong> Difference in rest between teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">•</span>
                  <span><strong>Prime Time Flags:</strong> Thursday/Monday/Sunday Night games</span>
                </li>
              </ul>
            </div>

            {/* Matchup Context */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-400" />
                Matchup Context (6 features)
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span><strong>Divisional Game:</strong> Teams in same division (typically closer games)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span><strong>Conference Game:</strong> Same conference matchup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span><strong>Statistical Differentials:</strong> PPG diff, PAG diff, Win% diff, Yards diff, TO diff</span>
                </li>
              </ul>
            </div>

            {/* Weather */}
            <div className="bg-slate-900/50 rounded-lg p-4 md:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-cyan-400" />
                Weather Conditions (4 features)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong>Temperature:</strong> Game-time temperature in Fahrenheit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong>Wind Speed:</strong> Wind speed in MPH (affects passing game)</span>
                  </li>
                </ul>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong>Precipitation:</strong> Rain/snow probability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong>Dome Flag:</strong> Indoor stadium (weather-neutral)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Prediction Process */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-green-400" />
            Prediction Process
          </h2>

          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 text-blue-400 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Data Collection</h3>
                  <p className="text-slate-300 text-sm">
                    Gather all 33 features for both teams from ESPN API, including recent form, season stats, weather forecasts, and schedule context.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 text-purple-400 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">XGBoost Model Prediction</h3>
                  <p className="text-slate-300 text-sm mb-2">
                    Feed features into two separate trained models:
                  </p>
                  <ul className="text-slate-300 text-sm space-y-1 ml-4">
                    <li>• <strong className="text-white">Spread Model:</strong> Predicts point differential (e.g., +7.5 means home team favored by 7.5)</li>
                    <li>• <strong className="text-white">Total Model:</strong> Predicts combined score (e.g., 47.5 total points)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-500/20 text-green-400 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Calculate Individual Scores</h3>
                  <p className="text-slate-300 text-sm">
                    Using algebra: <code className="bg-slate-800 px-2 py-1 rounded text-blue-400">Home Score = (Total + Spread) / 2</code> and
                    <code className="bg-slate-800 px-2 py-1 rounded text-blue-400 ml-1">Away Score = (Total - Spread) / 2</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-yellow-500/20 text-yellow-400 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Edge Detection vs Vegas</h3>
                  <p className="text-slate-300 text-sm mb-2">
                    Compare our predictions to Vegas lines to find betting value:
                  </p>
                  <div className="bg-slate-800/50 p-3 rounded mt-2">
                    <code className="text-green-400 text-sm">
                      Spread Edge = Our Predicted Spread - Vegas Spread
                    </code>
                    <br />
                    <code className="text-blue-400 text-sm">
                      Total Edge = Our Predicted Total - Vegas Total
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-500/20 text-red-400 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Betting Recommendation</h3>
                  <p className="text-slate-300 text-sm mb-2">Based on edge size:</p>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold">STRONG BET</span>
                      <span>Edge ≥ 4 points</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">GOOD BET</span>
                      <span>Edge 2.5-4 points</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs font-bold">SLIGHT EDGE</span>
                      <span>Edge 1.5-2.5 points</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded text-xs font-bold">NO EDGE</span>
                      <span>Edge &lt; 1.5 points</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance & Limitations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              Model Performance
            </h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>2025 Season:</strong> 71.1% ATS win rate (exceptional)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>2024 Season:</strong> 54.9% ATS win rate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">!</span>
                <span><strong>Historical Average (2021-2024):</strong> 51.1% ATS</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">→</span>
                <span><strong>Expected Long-term:</strong> 52-56% ATS range</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Important Notes
            </h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">⚠</span>
                <span>Win rates vary significantly season-to-season (49-71% range)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">⚠</span>
                <span>Model does not account for injuries, trades, or last-minute changes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">⚠</span>
                <span>Past performance does not guarantee future results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">!</span>
                <span className="text-red-400 font-semibold">Bet responsibly - this is for educational purposes</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Training Details */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Training Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-900/50 rounded p-4">
              <div className="text-slate-400 mb-1">Training Data</div>
              <div className="text-white font-bold">832 games</div>
              <div className="text-slate-500 text-xs">2021-2024 seasons</div>
            </div>
            <div className="bg-slate-900/50 rounded p-4">
              <div className="text-slate-400 mb-1">Algorithm</div>
              <div className="text-white font-bold">XGBoost</div>
              <div className="text-slate-500 text-xs">200 estimators, depth 6</div>
            </div>
            <div className="bg-slate-900/50 rounded p-4">
              <div className="text-slate-400 mb-1">Validation</div>
              <div className="text-white font-bold">Temporal Split</div>
              <div className="text-slate-500 text-xs">Train on past, test on future</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
