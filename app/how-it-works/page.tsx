'use client';

import LoggedInHeader from '@/components/LoggedInHeader';
import { Brain, TrendingUp, Home, Shield, Target, Zap, BarChart3, CheckCircle } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <LoggedInHeader />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-full mb-6">
            <Brain className="w-6 h-6 text-blue-600" />
            <span className="text-blue-900 font-semibold">Matrix Prediction System</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            How Our Model Works
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            The Matrix model is a sophisticated Team Strength Rating (TSR) system that analyzes six critical factors to predict NFL game outcomes with <strong>62.6% accuracy</strong> and an average spread error of just <strong>±11.8 points</strong>.
          </p>
        </div>

        {/* Accuracy Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center border border-green-200">
            <div className="text-4xl font-bold text-green-900 mb-2">62.6%</div>
            <div className="text-green-700 font-medium">Winner Accuracy</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border border-blue-200">
            <div className="text-4xl font-bold text-blue-900 mb-2">±11.8</div>
            <div className="text-blue-700 font-medium">Avg Spread Error</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center border border-purple-200">
            <div className="text-4xl font-bold text-purple-900 mb-2">54%+</div>
            <div className="text-purple-700 font-medium">ATS Win Rate</div>
          </div>
        </div>

        {/* What is TSR */}
        <div className="bg-gray-50 rounded-xl p-8 mb-16 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">What is Team Strength Rating (TSR)?</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            TSR is a comprehensive score that measures a team's true strength by analyzing multiple dimensions of their performance. Unlike simple win-loss records, TSR considers how teams perform in different situations, their recent momentum, and their efficiency on both sides of the ball.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Each game prediction starts by calculating TSR scores for both teams, then comparing them to determine the predicted winner, margin of victory, and total points.
          </p>
        </div>

        {/* The 6 Core Components */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">The 6 Core Components</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Net Performance */}
            <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Net Point Performance</h3>
              </div>
              <p className="text-gray-700 mb-3">
                Measures how many more points a team scores than they allow per game, compared to league average.
              </p>
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-900">
                <strong>Weight:</strong> 0-10 points (typically 5.0)
              </div>
            </div>

            {/* Momentum */}
            <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Momentum (Last 5)</h3>
              </div>
              <p className="text-gray-700 mb-3">
                Compares a team's performance in their last 5 games to their season average. Hot teams get a boost.
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-sm text-green-900">
                <strong>Weight:</strong> 0-10 points (typically 3.0)
              </div>
            </div>

            {/* Conference Strength */}
            <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Conference Strength</h3>
              </div>
              <p className="text-gray-700 mb-3">
                Rewards teams who win more than 50% of their conference games, as these are tougher matchups.
              </p>
              <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-900">
                <strong>Weight:</strong> 0-10 points (typically 2.0)
              </div>
            </div>

            {/* Home Field Advantage */}
            <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Home className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Home Field Advantage</h3>
              </div>
              <p className="text-gray-700 mb-3">
                Calculates how much better a team performs at home versus on the road. Only applied to home team.
              </p>
              <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-900">
                <strong>Weight:</strong> 0-5 points (typically 2.5)
              </div>
            </div>

            {/* Offensive Strength */}
            <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <Zap className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Offensive Strength</h3>
              </div>
              <p className="text-gray-700 mb-3">
                How many more points per game a team scores compared to league average scoring.
              </p>
              <div className="bg-red-50 rounded-lg p-3 text-sm text-red-900">
                <strong>Weight:</strong> -10 to +10 points (typically 4.0)
              </div>
            </div>

            {/* Defensive Strength */}
            <div className="bg-white rounded-xl p-6 border-2 border-indigo-200 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <Shield className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Defensive Strength</h3>
              </div>
              <p className="text-gray-700 mb-3">
                How many fewer points per game a team allows compared to league average. Lower is better.
              </p>
              <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-900">
                <strong>Weight:</strong> -10 to +10 points (typically 4.0)
              </div>
            </div>
          </div>
        </div>

        {/* How Predictions Work */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 mb-16 border border-blue-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">How We Generate Predictions</h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">
                1
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Calculate TSR for Both Teams</h4>
                <p className="text-gray-700">
                  We compute a Team Strength Rating for both the home and away team by weighing all six components based on their current season performance, recent form, and situational factors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">
                2
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Compare TSR to Predict Spread</h4>
                <p className="text-gray-700">
                  The difference between the home team's TSR and away team's TSR gives us the predicted point spread. For example, if the home team has TSR of +8.5 and the away team has -3.2, we predict the home team to win by 11.7 points.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">
                3
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Calculate Predicted Total</h4>
                <p className="text-gray-700">
                  We cross-blend each team's offensive efficiency with the opponent's defensive efficiency, then apply recency weighting to emphasize recent scoring trends. This gives us the predicted total points for the game.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">
                4
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Generate Exact Scores</h4>
                <p className="text-gray-700">
                  Using the predicted total and spread, we calculate exact final scores for both teams. A volatility factor adjusts for game flow uncertainty (e.g., high-scoring shootout vs. defensive battle).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 mt-1">
                5
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Calculate Confidence & Edge</h4>
                <p className="text-gray-700">
                  The larger the TSR gap between teams, the higher our confidence. We then compare our prediction to Vegas lines to identify betting edges where our model disagrees significantly with the market.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TSR Formula Section */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 mb-16 border-2 border-slate-300">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">The TSR Formula</h2>

          <div className="bg-white rounded-lg p-6 mb-6 border border-slate-200">
            <div className="text-center mb-4">
              <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Mathematical Structure</span>
            </div>
            <div className="bg-slate-900 text-white rounded-lg p-6 font-mono text-sm overflow-x-auto">
              <div className="mb-4">
                <span className="text-blue-400">TSR</span> =
                <span className="text-green-400"> (w_net</span> × <span className="text-yellow-400">Net_Points</span><span className="text-green-400">)</span> +
              </div>
              <div className="ml-8 mb-4">
                <span className="text-green-400">(w_momentum</span> × <span className="text-yellow-400">Momentum</span><span className="text-green-400">)</span> +
              </div>
              <div className="ml-8 mb-4">
                <span className="text-green-400">(w_conf</span> × <span className="text-yellow-400">Conference</span><span className="text-green-400">)</span> +
              </div>
              <div className="ml-8 mb-4">
                <span className="text-green-400">(w_home</span> × <span className="text-yellow-400">Home_Advantage</span><span className="text-green-400">)</span> +
              </div>
              <div className="ml-8 mb-4">
                <span className="text-green-400">(w_off</span> × <span className="text-yellow-400">Offensive</span><span className="text-green-400">)</span> +
              </div>
              <div className="ml-8">
                <span className="text-green-400">(w_def</span> × <span className="text-yellow-400">Defensive</span><span className="text-green-400">)</span>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-600 text-center">
              <strong>Note:</strong> Exact weight values are proprietary, but typical ranges are shown in each component above.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Component Calculation Example</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold text-blue-900 mb-1">Net Point Performance:</div>
                  <div className="bg-blue-50 rounded p-3 font-mono text-xs">
                    Team PF/game: 28.5<br/>
                    Team PA/game: 19.2<br/>
                    Team Net: <span className="text-blue-600 font-bold">+9.3 ppg</span><br/>
                    League Avg Net: +0.0<br/>
                    <span className="text-green-600 font-bold">Contribution: +9.3 points</span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-green-900 mb-1">Momentum (Last 5):</div>
                  <div className="bg-green-50 rounded p-3 font-mono text-xs">
                    Last 5 Win%: 80% (4-1)<br/>
                    Season Win%: 64%<br/>
                    Difference: <span className="text-green-600 font-bold">+16%</span><br/>
                    <span className="text-green-600 font-bold">Contribution: +0.48 points</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">From TSR to Prediction</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold text-purple-900 mb-1">Spread Calculation:</div>
                  <div className="bg-purple-50 rounded p-3 font-mono text-xs">
                    Home TSR: +18.5<br/>
                    Away TSR: +6.2<br/>
                    Raw Spread: <span className="text-purple-600 font-bold">+12.3</span><br/>
                    Regression Factor: 0.85<br/>
                    <span className="text-green-600 font-bold">Final Spread: +10.5</span>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded p-3 text-xs">
                  <strong className="text-yellow-900">Regression Dampening:</strong> Reduces extreme predictions by 15% to prevent overconfidence and align closer to market reality.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-900 text-white rounded-lg p-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Unique Enhancements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold text-indigo-200 mb-2">1. Regression-to-Mean Dampening</div>
                <div className="text-indigo-100">
                  Multiplies raw spread predictions by 0.85 (15% reduction) to prevent extreme outliers and improve market alignment. This brings predictions closer to realistic game outcomes.
                </div>
              </div>
              <div>
                <div className="font-semibold text-indigo-200 mb-2">2. Efficiency-Based Totals</div>
                <div className="text-indigo-100">
                  Cross-multiplies each team's offensive efficiency with opponent's defensive efficiency, normalized to league average. Includes 5% dampening to prevent systematic drift.
                </div>
              </div>
              <div>
                <div className="font-semibold text-indigo-200 mb-2">3. Recency Weighting</div>
                <div className="text-indigo-100">
                  Recent performance (Last 5 games) is weighted more heavily in total calculations to capture current team form and scoring trends.
                </div>
              </div>
              <div>
                <div className="font-semibold text-indigo-200 mb-2">4. Volatility Adjustment</div>
                <div className="text-indigo-100">
                  Configurable volatility factor (0-2) adjusts score distribution based on expected game flow - higher for shootouts, lower for defensive battles.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Example Prediction */}
        <div className="bg-white rounded-xl p-8 mb-16 border-2 border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Example: Eagles vs. Cowboys</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="text-xl font-bold text-green-900 mb-4">Philadelphia Eagles (Home)</h3>
              <div className="space-y-2 text-sm text-green-900">
                <div className="flex justify-between">
                  <span>Net Performance:</span>
                  <strong>+6.2</strong>
                </div>
                <div className="flex justify-between">
                  <span>Momentum (Last 5):</span>
                  <strong>+2.1</strong>
                </div>
                <div className="flex justify-between">
                  <span>Conference Strength:</span>
                  <strong>+1.4</strong>
                </div>
                <div className="flex justify-between">
                  <span>Home Field Advantage:</span>
                  <strong>+3.5</strong>
                </div>
                <div className="flex justify-between">
                  <span>Offensive Strength:</span>
                  <strong>+4.8</strong>
                </div>
                <div className="flex justify-between">
                  <span>Defensive Strength:</span>
                  <strong>+2.9</strong>
                </div>
                <div className="border-t border-green-300 pt-2 mt-2 flex justify-between text-lg font-bold">
                  <span>Total TSR:</span>
                  <strong>+20.9</strong>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
              <h3 className="text-xl font-bold text-red-900 mb-4">Dallas Cowboys (Away)</h3>
              <div className="space-y-2 text-sm text-red-900">
                <div className="flex justify-between">
                  <span>Net Performance:</span>
                  <strong>+3.1</strong>
                </div>
                <div className="flex justify-between">
                  <span>Momentum (Last 5):</span>
                  <strong>-1.5</strong>
                </div>
                <div className="flex justify-between">
                  <span>Conference Strength:</span>
                  <strong>+0.8</strong>
                </div>
                <div className="flex justify-between">
                  <span>Home Field Advantage:</span>
                  <strong>+0.0</strong>
                </div>
                <div className="flex justify-between">
                  <span>Offensive Strength:</span>
                  <strong>+2.2</strong>
                </div>
                <div className="flex justify-between">
                  <span>Defensive Strength:</span>
                  <strong>+1.1</strong>
                </div>
                <div className="border-t border-red-300 pt-2 mt-2 flex justify-between text-lg font-bold">
                  <span>Total TSR:</span>
                  <strong>+5.7</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900 text-white rounded-lg p-6 text-center">
            <div className="text-sm font-semibold mb-2">FINAL PREDICTION</div>
            <div className="text-3xl font-bold mb-4">Eagles 31, Cowboys 16</div>
            <div className="text-lg mb-2">Spread: Eagles -15.2 | Total: 47 points</div>
            <div className="text-sm opacity-90">Confidence: 78% | TSR Difference: +15.2</div>
          </div>
        </div>

        {/* Why It Works */}
        <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Why the Matrix Model Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Multi-Dimensional Analysis</h4>
                <p className="text-gray-700 text-sm">
                  Unlike simple power ratings, we analyze teams from six different angles to capture their true strength.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Recency Weighting</h4>
                <p className="text-gray-700 text-sm">
                  Recent performance matters more than games from week 1. Teams evolve throughout the season.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Situational Awareness</h4>
                <p className="text-gray-700 text-sm">
                  Home field advantage, conference strength, and momentum are all factored into predictions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Continuous Validation</h4>
                <p className="text-gray-700 text-sm">
                  Every prediction is backtested against historical results to ensure accuracy remains high.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Balanced Approach</h4>
                <p className="text-gray-700 text-sm">
                  Equal weight to offense and defense prevents overvaluing high-scoring teams.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Edge Detection</h4>
                <p className="text-gray-700 text-sm">
                  By comparing to Vegas lines, we identify games where the market is mispriced.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
