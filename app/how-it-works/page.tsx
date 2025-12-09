'use client';

import LoggedInHeader from '@/components/LoggedInHeader';
import { Brain, TrendingUp, Home, Shield, Target, Zap, BarChart3, CheckCircle } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LoggedInHeader />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="bg-white border-b border-gray-200 pb-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            How Our Model Works
          </h1>
          <p className="text-sm text-gray-600">
            The Matrix model is a Team Strength Rating (TSR) system that analyzes six critical factors to predict NFL game outcomes with <strong>73.2% Against The Spread accuracy</strong>, achieving <strong>21% better performance than Vegas</strong> with an average spread error of just <strong>±10.8 points</strong> (vs ±14.1 for Vegas).
          </p>
        </div>

        {/* Accuracy Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6 bg-white border border-gray-200 rounded p-4">
          <div className="text-center border-r border-gray-200">
            <div className="text-3xl font-bold text-gray-900">73.2%</div>
            <div className="text-gray-600 text-xs">ATS Win Rate</div>
            <div className="text-gray-500 text-[10px] mt-0.5">131-48 record</div>
          </div>
          <div className="text-center border-r border-gray-200">
            <div className="text-3xl font-bold text-gray-900">±10.8</div>
            <div className="text-gray-600 text-xs">Our Spread Error</div>
            <div className="text-gray-500 text-[10px] mt-0.5">vs ±14.1 Vegas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">21%</div>
            <div className="text-gray-600 text-xs">Better Than Vegas</div>
            <div className="text-gray-500 text-[10px] mt-0.5">lower prediction error</div>
          </div>
        </div>

        {/* What is TSR */}
        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-2">What is Team Strength Rating (TSR)?</h2>
          <p className="text-xs text-gray-700 mb-2">
            TSR is a comprehensive score that measures a team's true strength by analyzing multiple dimensions of their performance. Unlike simple win-loss records, TSR considers how teams perform in different situations, their recent momentum, and their efficiency on both sides of the ball.
          </p>
          <p className="text-xs text-gray-700">
            Each game prediction starts by calculating TSR scores for both teams, then comparing them to determine the predicted winner, margin of victory, and total points.
          </p>
        </div>

        {/* The 6 Core Components */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-3 bg-white border border-gray-200 rounded p-3">The 6 Core Components</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Net Performance */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Net Point Performance</h3>
              </div>
              <p className="text-xs text-gray-700 mb-2">
                Measures how many more points a team scores than they allow per game, compared to league average.
              </p>
              <div className="text-[10px] text-gray-600">
                <strong>Weight:</strong> 0-10 points (typically 5.0)
              </div>
            </div>

            {/* Momentum */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-bold text-gray-900">Momentum (Last 5)</h3>
              </div>
              <p className="text-xs text-gray-700 mb-2">
                Compares a team's performance in their last 5 games to their season average. Hot teams get a boost.
              </p>
              <div className="text-[10px] text-gray-600">
                <strong>Weight:</strong> 0-10 points (typically 3.0)
              </div>
            </div>

            {/* Conference Strength */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-gray-900">Conference Strength</h3>
              </div>
              <p className="text-xs text-gray-700 mb-2">
                Rewards teams who win more than 50% of their conference games, as these are tougher matchups.
              </p>
              <div className="text-[10px] text-gray-600">
                <strong>Weight:</strong> 0-10 points (typically 2.0)
              </div>
            </div>

            {/* Home Field Advantage */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Home className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-gray-900">Home Field Advantage</h3>
              </div>
              <p className="text-xs text-gray-700 mb-2">
                Calculates how much better a team performs at home versus on the road. Only applied to home team.
              </p>
              <div className="text-[10px] text-gray-600">
                <strong>Weight:</strong> 0-5 points (typically 2.5)
              </div>
            </div>

            {/* Offensive Strength */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-gray-900">Offensive Strength</h3>
              </div>
              <p className="text-xs text-gray-700 mb-2">
                How many more points per game a team scores compared to league average scoring.
              </p>
              <div className="text-[10px] text-gray-600">
                <strong>Weight:</strong> -10 to +10 points (typically 4.0)
              </div>
            </div>

            {/* Defensive Strength */}
            <div className="bg-white border border-gray-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900">Defensive Strength</h3>
              </div>
              <p className="text-xs text-gray-700 mb-2">
                How many fewer points per game a team allows compared to league average. Lower is better.
              </p>
              <div className="text-[10px] text-gray-600">
                <strong>Weight:</strong> -10 to +10 points (typically 4.0)
              </div>
            </div>
          </div>
        </div>

        {/* How Predictions Work */}
        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-3">How We Generate Predictions</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-1">Calculate TSR for Both Teams</h4>
                <p className="text-[11px] text-gray-700">
                  We compute a Team Strength Rating for both the home and away team by weighing all six components based on their current season performance, recent form, and situational factors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-1">Compare TSR to Predict Spread</h4>
                <p className="text-[11px] text-gray-700">
                  The difference between the home team's TSR and away team's TSR gives us the predicted point spread.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-1">Calculate Predicted Total</h4>
                <p className="text-[11px] text-gray-700">
                  We cross-blend each team's offensive efficiency with the opponent's defensive efficiency, then apply recency weighting to emphasize recent scoring trends.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                4
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-1">Generate Exact Scores</h4>
                <p className="text-[11px] text-gray-700">
                  Using the predicted total and spread, we calculate exact final scores for both teams. A volatility factor adjusts for game flow uncertainty.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                5
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-1">Calculate Confidence & Edge</h4>
                <p className="text-[11px] text-gray-700">
                  The larger the TSR gap between teams, the higher our confidence. We then compare our prediction to Vegas lines to identify betting edges.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Why It Works */}
        <div className="bg-white border border-gray-200 rounded p-4">
          <h2 className="text-base font-bold text-gray-900 mb-3">Why the Matrix Model Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-0.5">Multi-Dimensional Analysis</h4>
                <p className="text-[11px] text-gray-700">
                  Unlike simple power ratings, we analyze teams from six different angles to capture their true strength.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-0.5">Recency Weighting</h4>
                <p className="text-[11px] text-gray-700">
                  Recent performance matters more than games from week 1. Teams evolve throughout the season.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-0.5">Situational Awareness</h4>
                <p className="text-[11px] text-gray-700">
                  Home field advantage, conference strength, and momentum are all factored into predictions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-0.5">Continuous Validation</h4>
                <p className="text-[11px] text-gray-700">
                  Every prediction is backtested against historical results to ensure accuracy remains high.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-0.5">Balanced Approach</h4>
                <p className="text-[11px] text-gray-700">
                  Equal weight to offense and defense prevents overvaluing high-scoring teams.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-0.5">Edge Detection</h4>
                <p className="text-[11px] text-gray-700">
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
