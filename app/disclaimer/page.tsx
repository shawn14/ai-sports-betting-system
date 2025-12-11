import Link from 'next/link';
import { AlertTriangle, Phone, Shield } from 'lucide-react';
import LoggedInHeader from '@/components/LoggedInHeader';

export const metadata = {
  title: 'Responsible Gaming & Disclaimer',
  description: 'Important disclaimer and responsible gaming information for PredictionMatrix users.'
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-white">
      <LoggedInHeader />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Critical Warning Banner */}
        <div className="bg-red-50 border-2 border-red-600 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-red-900 mb-3">Important Disclaimer</h2>
              <p className="text-red-900 text-lg font-semibold mb-2">
                This platform is for entertainment and informational purposes only.
              </p>
              <p className="text-red-800">
                PredictionMatrix is NOT a gambling operator. We do not facilitate, accept, or process any wagers, bets, or gambling transactions. We are solely an analytics platform that provides statistical predictions and data analysis for sports games.
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Responsible Gaming & Disclaimer</h1>

        {/* Last Updated */}
        <p className="text-gray-600 text-sm mb-8">Last Updated: December 8, 2024</p>

        {/* Table of Contents */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#no-guarantees" className="text-blue-600 hover:underline">No Guarantees</a></li>
            <li><a href="#age-restrictions" className="text-blue-600 hover:underline">Age & Legal Restrictions</a></li>
            <li><a href="#responsible-gaming" className="text-blue-600 hover:underline">Responsible Gaming Resources</a></li>
            <li><a href="#accuracy" className="text-blue-600 hover:underline">Information Accuracy</a></li>
            <li><a href="#liability" className="text-blue-600 hover:underline">Limitation of Liability</a></li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="space-y-8 text-gray-700 leading-relaxed">
          {/* Section 1: No Guarantees */}
          <section id="no-guarantees">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. No Guarantees of Winnings</h2>
            <div className="space-y-3">
              <p>
                <strong>Past performance does not guarantee future results.</strong> All predictions, analytics, and recommendations provided by PredictionMatrix are based on statistical models, historical data, and algorithmic analysis. These are estimates and projections, not certainties.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 my-4">
                <p className="text-yellow-900 font-semibold">
                  ⚠️ Sports outcomes are inherently unpredictable. No model, system, or strategy can guarantee profitable results from sports betting.
                </p>
              </div>
              <p>
                Our Matrix prediction system achieves approximately 62% winner accuracy and 54%+ Against The Spread (ATS) performance based on historical backtesting. However, these metrics are historical and do not guarantee future performance. Individual results will vary.
              </p>
              <p>
                <strong>Financial Risk:</strong> All forms of gambling carry financial risk. You should never wager money that you cannot afford to lose. Betting should only be done for entertainment purposes, and any money wagered should be considered the cost of that entertainment.
              </p>
            </div>
          </section>

          {/* Section 2: Age & Legal Restrictions */}
          <section id="age-restrictions">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Age & Legal Restrictions</h2>
            <div className="space-y-3">
              <p>
                <strong>Age Requirement:</strong> You must be at least 18 years of age to use PredictionMatrix. In some jurisdictions, the legal gambling age is 21 or higher. You are solely responsible for ensuring you meet the age requirements in your jurisdiction.
              </p>
              <p>
                <strong>Geographic Restrictions:</strong> Sports betting laws vary significantly by country, state, and locality. It is YOUR sole responsibility to determine whether sports betting is legal in your jurisdiction before placing any wagers.
              </p>
              <p>
                <strong>Prohibited Jurisdictions:</strong> Some jurisdictions prohibit or restrict access to sports betting information and analytics. If you are located in a jurisdiction where accessing sports betting-related content is prohibited, you should immediately discontinue use of this platform.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 my-4">
                <p className="text-blue-900">
                  <strong>Your Responsibility:</strong> By using PredictionMatrix, you represent and warrant that your use complies with all applicable local, state, national, and international laws and regulations.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Responsible Gaming */}
          <section id="responsible-gaming">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Responsible Gaming Resources</h2>
            <div className="space-y-4">
              <p>
                Gambling addiction is a serious issue that affects millions of people worldwide. If you or someone you know is struggling with problem gambling, help is available.
              </p>

              <div className="bg-green-900 text-white rounded-lg p-6 my-6">
                <div className="flex items-center gap-3 mb-4">
                  <Phone className="w-6 h-6" />
                  <h3 className="text-xl font-bold">National Problem Gambling Helpline</h3>
                </div>
                <p className="text-2xl font-bold mb-2">1-800-GAMBLER (1-800-426-2537)</p>
                <p className="text-green-100 text-sm">
                  24/7 confidential helpline providing support, resources, and referrals for problem gamblers and their families.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">National Council on Problem Gambling</h4>
                  <p className="text-sm mb-2">Chat and text support available</p>
                  <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    www.ncpgambling.org →
                  </a>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">Gamblers Anonymous</h4>
                  <p className="text-sm mb-2">Support groups and recovery programs</p>
                  <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    www.gamblersanonymous.org →
                  </a>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mt-6">
                <h4 className="font-bold text-gray-900 mb-3">10 Rules of Responsible Gaming</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Set a budget and stick to it. Never chase losses.</li>
                  <li>Treat gambling as entertainment, not a way to make money.</li>
                  <li>Never gamble with money needed for essential expenses.</li>
                  <li>Set time limits and take regular breaks.</li>
                  <li>Never gamble under the influence of alcohol or drugs.</li>
                  <li>Don't gamble when you're upset, depressed, or in pain.</li>
                  <li>Balance gambling with other activities and hobbies.</li>
                  <li>Don't borrow money to gamble.</li>
                  <li>Be aware of warning signs of problem gambling.</li>
                  <li>Seek help immediately if gambling is causing problems in your life.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Section 4: Information Accuracy */}
          <section id="accuracy">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Information Accuracy & Currency</h2>
            <div className="space-y-3">
              <p>
                While we strive to provide accurate and up-to-date information, PredictionMatrix makes no warranties or guarantees regarding the accuracy, completeness, or timeliness of any predictions, statistics, odds, or other information provided on this platform.
              </p>
              <p>
                <strong>Data Sources:</strong> Our predictions are based on data from ESPN API, NFL.com standings, The Odds API, and other third-party sources. We are not responsible for errors or inaccuracies in the underlying data.
              </p>
              <p>
                <strong>Odds Information:</strong> Betting lines and odds displayed on PredictionMatrix are for informational purposes only and may not reflect current market prices. Always verify odds with licensed sportsbooks before placing any wagers.
              </p>
              <p>
                <strong>Model Limitations:</strong> Our Matrix prediction model is a statistical tool that analyzes team performance, momentum, offensive/defensive efficiency, and other factors. However, it cannot account for all variables affecting game outcomes, including:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Last-minute player injuries or lineup changes</li>
                <li>Weather conditions on game day</li>
                <li>Coaching decisions and in-game adjustments</li>
                <li>Motivation factors and intangible elements</li>
                <li>Unpredictable events and randomness inherent in sports</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Liability */}
          <section id="liability">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Limitation of Liability</h2>
            <div className="space-y-3">
              <p>
                <strong>No Responsibility for Losses:</strong> PredictionMatrix and its owners, operators, employees, and affiliates are NOT responsible for any financial losses, damages, or other consequences resulting from your use of our platform or reliance on our predictions and analytics.
              </p>
              <p>
                <strong>Your Decisions:</strong> Any decision to place a wager or bet on a sporting event is solely YOUR decision and YOUR responsibility. We do not encourage, promote, or facilitate gambling activities.
              </p>
              <p>
                <strong>Third-Party Links:</strong> Our platform may contain links to third-party websites, including licensed sportsbooks and gambling operators. We are not responsible for the content, practices, or policies of these third-party sites. Use them at your own risk.
              </p>
              <p>
                <strong>Service Availability:</strong> We make no guarantees regarding the continuous availability, reliability, or uptime of PredictionMatrix. The service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.
              </p>
            </div>
          </section>

          {/* Section 6: Educational Purpose */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Educational & Entertainment Purpose</h2>
            <div className="space-y-3">
              <p>
                PredictionMatrix is designed as an <strong>educational tool and analytics platform</strong> for sports enthusiasts to better understand game dynamics, team performance, and predictive modeling.
              </p>
              <p>
                Our platform serves as a "Bloomberg terminal for sports predictions" - a sophisticated analytics dashboard that provides data-driven insights. Just as financial analysts use Bloomberg for market analysis without guaranteeing investment returns, our platform provides sports analytics without guaranteeing betting outcomes.
              </p>
              <p>
                We encourage users to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Study our methodology and learn about predictive modeling</li>
                <li>Understand the factors that influence game outcomes</li>
                <li>Make informed, data-driven decisions</li>
                <li>Use our tools responsibly and within their means</li>
              </ul>
            </div>
          </section>

          {/* Final Notice */}
          <div className="bg-gray-900 text-white rounded-lg p-6 mt-8">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2">Final Notice</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  By continuing to use PredictionMatrix, you acknowledge that you have read, understood, and agree to this disclaimer. You accept full responsibility for any decisions made based on information provided by our platform. If you do not agree with any part of this disclaimer, you should discontinue use of PredictionMatrix immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="border-t border-gray-200 pt-6 mt-8">
            <p className="text-sm text-gray-600">
              Questions about this disclaimer? <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
