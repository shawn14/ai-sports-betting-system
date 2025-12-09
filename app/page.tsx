'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Target, Shield, CheckCircle, BarChart3, Menu, X } from 'lucide-react';
import ScoresTicker from '@/components/ScoresTicker';

export default function LandingPage() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50">
        {/* Scores Ticker */}
        <ScoresTicker />

        <div className="bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] border-b border-gray-800 shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <div>
                  <h1 className="text-base font-bold tracking-tight text-white">
                    PREDICTION<span className="text-blue-500">MATRIX</span>
                  </h1>
                  <p className="text-[9px] text-gray-400 tracking-wider uppercase">AI Sports Analytics</p>
                </div>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <a href="#features" className="text-gray-300 hover:text-white text-sm font-medium">Features</a>
                <a href="#how-it-works" className="text-gray-300 hover:text-white text-sm font-medium">How It Works</a>
                <a href="#pricing" className="text-gray-300 hover:text-white text-sm font-medium">Pricing</a>
                <Link
                  href="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-semibold"
                >
                  Log In
                </Link>
              </nav>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-300 hover:text-white transition"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="md:hidden bg-[#1a1a1a] border-t border-gray-700">
              <nav className="px-4 py-3 space-y-1">
                <a
                  href="#features"
                  onClick={() => setShowMobileMenu(false)}
                  className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded text-sm font-medium transition"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setShowMobileMenu(false)}
                  className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded text-sm font-medium transition"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  onClick={() => setShowMobileMenu(false)}
                  className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded text-sm font-medium transition"
                >
                  Pricing
                </a>
                <Link
                  href="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition text-center mt-2"
                >
                  Log In
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-1 mb-6">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-700 font-semibold">73.2% ATS Win Rate • 21% Better Than Vegas</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              AI-Powered NFL<br />
              <span className="text-blue-600">Betting Intelligence</span>
            </h2>

            <p className="text-base text-gray-600 mb-8 max-w-2xl mx-auto">
              Professional-grade sports betting analytics powered by machine learning.
              Get high-confidence predictions backed by data, not gut feelings.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Link
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded text-sm font-semibold flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 px-6 py-2.5 rounded text-sm font-semibold"
              >
                Log In
              </Link>
            </div>
            <p className="text-gray-500 text-xs mb-6">No credit card required • 7-day free trial</p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-gray-600 text-xs">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Real-Time Data</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Verified Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">73.2%</div>
              <div className="text-gray-700 text-sm font-medium">ATS Win Rate</div>
              <div className="text-gray-500 text-xs mt-0.5">131-48 against the spread</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">21%</div>
              <div className="text-gray-700 text-sm font-medium">Better Than Vegas</div>
              <div className="text-gray-500 text-xs mt-0.5">lower prediction error</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">±10.8</div>
              <div className="text-gray-700 text-sm font-medium">Avg Spread Error</div>
              <div className="text-gray-500 text-xs mt-0.5">vs ±14.1 Vegas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">179</div>
              <div className="text-gray-700 text-sm font-medium">Games Backtested</div>
              <div className="text-gray-500 text-xs mt-0.5">2025 Season Weeks 2-14</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              Everything you need to win
            </h3>
            <p className="text-base text-gray-600">
              Professional-grade tools that give you an edge over the market
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <div className="bg-white border border-gray-200 rounded p-6 hover:shadow-md transition">
              <div className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Three Bet Types</h4>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Every prediction shows Moneyline (winner), Spread (point differential), and Total (over/under) with individual confidence ratings.
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-xs text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Moneyline winner predictions</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Spread recommendations</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Over/under totals</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-gray-200 rounded p-6 hover:shadow-md transition">
              <div className="w-10 h-10 bg-purple-50 rounded flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Matrix TSR Algorithm</h4>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Team Strength Rating system with 6 components: Net Points, Momentum, Conference, Home/Away, Offensive and Defensive strength.
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-xs text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Instant predictions</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Conversational AI interface</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>61.8% accuracy validated</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-gray-200 rounded p-6 hover:shadow-md transition">
              <div className="w-10 h-10 bg-green-50 rounded flex items-center justify-center mb-4">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Pre-Game Intelligence</h4>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                AI-powered intelligence gathering for injuries, weather, and news. Get confidence adjustments based on real-time factors.
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-xs text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Injury report analysis</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Weather impact assessment</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>Key storylines & news</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-12 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              Simple, transparent process
            </h3>
            <p className="text-base text-gray-600">
              From data to decision in three steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Ask About a Game</h4>
              <p className="text-gray-600 text-sm">
                Chat naturally with our AI. Type "Predict Week 15 Chiefs vs Chargers" or just "2" after seeing a game list.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Matrix TSR Calculation</h4>
              <p className="text-gray-600 text-sm">
                System calculates Team Strength Ratings using Net Points, Momentum, Conference, Home/Away, Offense, and Defense.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Get Three Predictions</h4>
              <p className="text-gray-600 text-sm">
                Receive Moneyline, Spread, and Total predictions with confidence ratings and optional pre-game intelligence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              Choose your plan
            </h3>
            <p className="text-base text-gray-600">
              Start free, upgrade when you're ready
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white border border-gray-200 rounded p-6">
              <h4 className="text-sm font-semibold text-gray-600 mb-1">Free</h4>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                $0<span className="text-base text-gray-500">/mo</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>5 predictions per week</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Email alerts</span>
                </li>
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded text-sm font-semibold"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-blue-50 border-2 border-blue-600 rounded p-6 relative">
              <div className="absolute top-0 right-4 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                POPULAR
              </div>
              <h4 className="text-sm font-semibold text-blue-600 mb-1">Pro</h4>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                $49<span className="text-base text-gray-500">/mo</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Unlimited predictions</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Real-time alerts</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Historical data</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
              >
                Start 7-Day Trial
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-white border border-gray-200 rounded p-6">
              <h4 className="text-sm font-semibold text-gray-600 mb-1">Premium</h4>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                $99<span className="text-base text-gray-500">/mo</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Custom models</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>API access</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>White-label options</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Dedicated support</span>
                </li>
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded text-sm font-semibold"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 bg-blue-50 border-y border-blue-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-3">
            Ready to start winning?
          </h3>
          <p className="text-base text-gray-600 mb-6">
            Join thousands of smart bettors using AI to beat the odds.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded text-sm font-semibold"
          >
            Start Your Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-gray-500 text-xs mt-3">
            No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-300 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <h5 className="font-semibold text-gray-900 text-sm mb-3">Product</h5>
              <ul className="space-y-1.5 text-gray-600 text-xs">
                <li><a href="#features" className="hover:text-gray-900">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-900">Pricing</a></li>
                <li><Link href="/predictions" className="hover:text-gray-900">Predictions</Link></li>
                <li><Link href="/backtest-results" className="hover:text-gray-900">Backtest</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-gray-900 text-sm mb-3">Company</h5>
              <ul className="space-y-1.5 text-gray-600 text-xs">
                <li><Link href="/about" className="hover:text-gray-900">About</Link></li>
                <li><Link href="/contact" className="hover:text-gray-900">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-gray-900 text-sm mb-3">Legal</h5>
              <ul className="space-y-1.5 text-gray-600 text-xs">
                <li><Link href="/privacy" className="hover:text-gray-900">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-gray-900">Terms</Link></li>
                <li><Link href="/disclaimer" className="hover:text-gray-900">Disclaimer</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-gray-900 text-sm mb-3">Social</h5>
              <ul className="space-y-1.5 text-gray-600 text-xs">
                <li><a href="https://twitter.com/predictionmatrix" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-200 text-center text-gray-500 text-xs">
            <p>© 2025 PredictionMatrix. All rights reserved.</p>
            <p className="mt-1.5">
              Gambling can be addictive. Please bet responsibly. 21+ only.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
