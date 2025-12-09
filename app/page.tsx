import Link from 'next/link';
import { ArrowRight, TrendingUp, Target, Shield, CheckCircle, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="relative">
                {/* Main logo circle with gradient */}
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">P</span>
                  </div>
                </div>
                {/* Pulse effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 rounded-full animate-ping opacity-20"></div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">PREDICTION</span>
                  <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">MATRIX</span>
                </h1>
                <p className="text-[10px] text-slate-400 tracking-widest uppercase">AI Sports Analytics</p>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-white transition">Features</a>
              <a href="#how-it-works" className="text-slate-300 hover:text-white transition">How It Works</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</a>
              <Link
                href="/chat-predict"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition font-semibold"
              >
                Try Chat
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-300 font-semibold">61.8% Win Rate | 191 Games Backtested</span>
            </div>

            <h2 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight">
              AI-Powered NFL<br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Betting Intelligence
              </span>
            </h2>

            <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Professional-grade sports betting analytics powered by machine learning.
              Get high-confidence predictions backed by data, not gut feelings.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg transition font-semibold flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-8 py-4 rounded-lg transition font-semibold"
              >
                Log In
              </Link>
            </div>
            <p className="text-slate-400 text-sm mb-8">No credit card required • 7-day free trial</p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Real-Time Data</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>Verified Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-800/50 border-y border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">61.8%</div>
              <div className="text-slate-400">Winner Accuracy</div>
              <div className="text-slate-500 text-sm mt-1">validated predictions</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">$3,770</div>
              <div className="text-slate-400">Estimated Profit</div>
              <div className="text-slate-500 text-sm mt-1">$100/game @ -110 odds</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">±7.5</div>
              <div className="text-slate-400">Avg Spread Error</div>
              <div className="text-slate-500 text-sm mt-1">point differential accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-400 mb-2">191</div>
              <div className="text-slate-400">Games Backtested</div>
              <div className="text-slate-500 text-sm mt-1">2025 Season Weeks 2-14</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4">
              Everything you need to win
            </h3>
            <p className="text-xl text-slate-400">
              Professional-grade tools that give you an edge over the market
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/70 transition">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Three Bet Types</h4>
              <p className="text-slate-400 leading-relaxed">
                Every prediction shows Moneyline (winner), Spread (point differential), and Total (over/under) with individual confidence ratings.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Moneyline winner predictions</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Spread recommendations</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Over/under totals</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/70 transition">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Matrix TSR Algorithm</h4>
              <p className="text-slate-400 leading-relaxed">
                Team Strength Rating system with 6 components: Net Points, Momentum, Conference, Home/Away, Offensive and Defensive strength.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Instant predictions</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Conversational AI interface</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>61.8% accuracy validated</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 hover:bg-slate-800/70 transition">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Pre-Game Intelligence</h4>
              <p className="text-slate-400 leading-relaxed">
                AI-powered intelligence gathering for injuries, weather, and news. Get confidence adjustments based on real-time factors.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Injury report analysis</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Weather impact assessment</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Key storylines & news</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4">
              Simple, transparent process
            </h3>
            <p className="text-xl text-slate-400">
              From data to decision in three steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Ask About a Game</h4>
              <p className="text-slate-400">
                Chat naturally with our AI. Type &quot;Predict Week 15 Chiefs vs Chargers&quot; or just &quot;2&quot; after seeing a game list.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Matrix TSR Calculation</h4>
              <p className="text-slate-400">
                System calculates Team Strength Ratings using Net Points, Momentum, Conference, Home/Away, Offense, and Defense.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Get Three Predictions</h4>
              <p className="text-slate-400">
                Receive Moneyline, Spread, and Total predictions with confidence ratings and optional pre-game intelligence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4">
              Choose your plan
            </h3>
            <p className="text-xl text-slate-400">
              Start free, upgrade when you&apos;re ready
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8">
              <h4 className="text-lg font-semibold text-slate-400 mb-2">Free</h4>
              <div className="text-4xl font-bold text-white mb-6">
                $0<span className="text-lg text-slate-400">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>5 predictions per week</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Email alerts</span>
                </li>
              </ul>
              <Link
                href="/chat-predict"
                className="block text-center bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition font-semibold"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-blue-600/20 to-slate-800/50 border-2 border-blue-500/50 rounded-xl p-8 relative">
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <h4 className="text-lg font-semibold text-blue-400 mb-2">Pro</h4>
              <div className="text-4xl font-bold text-white mb-6">
                $49<span className="text-lg text-slate-400">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Unlimited predictions</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Real-time alerts</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Historical data</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link
                href="/chat-predict"
                className="block text-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-semibold"
              >
                Start 7-Day Trial
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8">
              <h4 className="text-lg font-semibold text-slate-400 mb-2">Premium</h4>
              <div className="text-4xl font-bold text-white mb-6">
                $99<span className="text-lg text-slate-400">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Custom models</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>API access</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>White-label options</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>Dedicated support</span>
                </li>
              </ul>
              <Link
                href="/chat-predict"
                className="block text-center bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition font-semibold"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to start winning?
          </h3>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of smart bettors using AI to beat the odds.
          </p>
          <Link
            href="/chat-predict"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg transition font-semibold text-lg"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-slate-400 text-sm mt-4">
            No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h5 className="font-semibold text-white mb-4">Product</h5>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><Link href="/chat-predict" className="hover:text-white transition">Chat</Link></li>
                <li><Link href="/backtest-results" className="hover:text-white transition">Backtest</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">Company</h5>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/about" className="hover:text-white transition">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">Legal</h5>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
                <li><Link href="/disclaimer" className="hover:text-white transition">Disclaimer</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">Social</h5>
              <ul className="space-y-2 text-slate-400">
                <li><a href="https://twitter.com/predictionmatrix" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-700/50 text-center text-slate-400 text-sm">
            <p>© 2025 PredictionMatrix. All rights reserved.</p>
            <p className="mt-2">
              Gambling can be addictive. Please bet responsibly. 21+ only.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
