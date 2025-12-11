import Link from 'next/link';
import { Target, Brain, TrendingUp, Shield, Users, Lightbulb } from 'lucide-react';
import LoggedInHeader from '@/components/LoggedInHeader';

export const metadata = {
  title: 'About PredictionMatrix',
  description: 'Learn about PredictionMatrix - The Bloomberg Terminal for Sports Predictions.'
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <LoggedInHeader />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            The Bloomberg Terminal<br />for Sports Predictions
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            PredictionMatrix combines cutting-edge AI, advanced statistics, and real-time data to provide professional-grade sports analytics and predictions.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 mb-12 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            To democratize access to institutional-grade sports analytics. Just as Bloomberg revolutionized financial markets by providing professional traders with real-time data and analytics, we're bringing that same level of sophistication to sports prediction.
          </p>
        </div>

        {/* What We Do */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">What We Do</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 transition">
              <Brain className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Predictions</h3>
              <p className="text-gray-700">
                Our proprietary Matrix TSR algorithm analyzes team performance across 6 critical dimensions to generate accurate game predictions with 62.6% winner accuracy.
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 transition">
              <TrendingUp className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Real-Time Analytics</h3>
              <p className="text-gray-700">
                Track betting lines, detect edges, and monitor performance in real-time with our comprehensive analytics dashboard.
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 transition">
              <Shield className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Backtested Performance</h3>
              <p className="text-gray-700">
                Every prediction is validated against historical data. We track our performance transparently with 54%+ ATS accuracy.
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 transition">
              <Lightbulb className="w-8 h-8 text-yellow-600 mb-3" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Educational Platform</h3>
              <p className="text-gray-700">
                Learn about predictive modeling, statistical analysis, and data-driven decision making through our comprehensive tools and resources.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Data Collection</h3>
                <p className="text-gray-700">
                  We aggregate data from ESPN API, NFL.com standings, The Odds API, and other authoritative sources. Data is updated in real-time throughout the NFL season.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Matrix TSR Analysis</h3>
                <p className="text-gray-700">
                  Our proprietary Team Strength Rating algorithm evaluates six factors: Net Point Performance, Momentum, Conference Strength, Home Field Advantage, Offensive Efficiency, and Defensive Efficiency.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Prediction Generation</h3>
                <p className="text-gray-700">
                  The TSR differential between teams determines predicted spreads and totals. Regression-to-mean dampening prevents extreme outliers. Confidence scores are calculated based on model certainty.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Edge Detection</h3>
                <p className="text-gray-700">
                  We compare our predictions to market betting lines to identify potential edges. Edges of 4+ points are flagged as "Strong Bets," while 2.5-4 points are "Value Bets."
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                5
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Continuous Improvement</h3>
                <p className="text-gray-700">
                  Every prediction is tracked post-game. We backtest results, analyze performance, and refine our models to improve accuracy over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Values</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-600">
              <h3 className="font-bold text-gray-900 mb-2">Transparency</h3>
              <p className="text-gray-700">
                We track and display our performance honestly. You can review our historical accuracy, backtest results, and methodology at any time.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-green-600">
              <h3 className="font-bold text-gray-900 mb-2">Data-Driven</h3>
              <p className="text-gray-700">
                Every prediction is backed by statistical analysis and historical validation. We don't rely on gut feelings or unsubstantiated claims.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-purple-600">
              <h3 className="font-bold text-gray-900 mb-2">Responsible Gaming</h3>
              <p className="text-gray-700">
                We promote responsible use of our platform. We're an educational analytics tool, not a gambling operator. We provide resources for problem gambling support.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-yellow-600">
              <h3 className="font-bold text-gray-900 mb-2">Continuous Innovation</h3>
              <p className="text-gray-700">
                We constantly refine our models, incorporate new data sources, and explore cutting-edge machine learning techniques to improve prediction accuracy.
              </p>
            </div>
          </div>
        </section>

        {/* Team/Technology */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Technology Stack</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2 text-sm">AI & Machine Learning</h3>
              <p className="text-gray-600 text-sm">Custom Matrix TSR algorithm, statistical modeling, regression analysis</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2 text-sm">Data Infrastructure</h3>
              <p className="text-gray-600 text-sm">Next.js, Firebase, real-time APIs, automated data pipelines</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2 text-sm">Analytics & Visualization</h3>
              <p className="text-gray-600 text-sm">Interactive dashboards, performance tracking, edge detection algorithms</p>
            </div>
          </div>
        </section>

        {/* Disclaimer Note */}
        <div className="bg-yellow-50 border-2 border-yellow-600 rounded-lg p-6 mb-8">
          <h3 className="font-bold text-yellow-900 mb-2">Important Note</h3>
          <p className="text-yellow-900 leading-relaxed">
            PredictionMatrix is an analytics and educational platform. We are <strong>NOT a gambling operator</strong> and do not facilitate, accept, or process any wagers or bets. All predictions are for informational and entertainment purposes only. Past performance does not guarantee future results. Please gamble responsibly.
          </p>
          <Link href="/disclaimer" className="text-yellow-900 underline font-semibold hover:text-yellow-700 inline-block mt-2">
            Read our full disclaimer →
          </Link>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Join thousands of users who rely on PredictionMatrix for professional-grade sports analytics and predictions.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/games"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              View Predictions
            </Link>
            <Link
              href="/how-it-works"
              className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 transition border-2 border-blue-500"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
