import Link from 'next/link';
import { FileText, Shield, AlertCircle } from 'lucide-react';
import LoggedInHeader from '@/components/LoggedInHeader';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service and User Agreement for PredictionMatrix.'
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <LoggedInHeader />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
        </div>

        <p className="text-gray-600 text-sm mb-8">Last Updated: December 8, 2024</p>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-8">
          <p className="text-blue-900 text-sm">
            <strong>Important:</strong> By accessing or using PredictionMatrix, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
          </p>
        </div>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p>
              These Terms of Service ("Terms") govern your access to and use of PredictionMatrix ("Platform," "Service," "we," "us," or "our"), including any content, functionality, and services offered on or through predictionmatrix.com.
            </p>
            <p className="mt-3">
              By creating an account, accessing our website, or using our services, you accept and agree to be bound by these Terms and our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> and <Link href="/disclaimer" className="text-blue-600 hover:underline">Disclaimer</Link>.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
            <p>
              PredictionMatrix is a <strong>sports analytics and prediction platform</strong> that provides AI-powered NFL game predictions, statistical analysis, and data visualization tools. We are NOT a gambling operator, sportsbook, or betting platform.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 my-4">
              <p className="text-yellow-900 font-semibold">
                We do not facilitate, accept, or process any wagers, bets, or gambling transactions of any kind.
              </p>
            </div>
            <p>
              Our services include:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>AI-powered game predictions using our Matrix TSR algorithm</li>
              <li>Statistical analysis and performance metrics</li>
              <li>Betting line comparisons and edge detection</li>
              <li>Historical backtesting and performance tracking</li>
              <li>Educational content about predictive modeling</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility & Account Requirements</h2>
            <div className="space-y-3">
              <p>
                <strong>Age Requirement:</strong> You must be at least 18 years of age (or the age of majority in your jurisdiction) to use PredictionMatrix. By using our platform, you represent and warrant that you meet this age requirement.
              </p>
              <p>
                <strong>Account Registration:</strong> Some features require you to create an account. You agree to:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Maintain the security of your password</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
              <p className="mt-3">
                <strong>Account Termination:</strong> We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or misuse our platform.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. User Responsibilities & Prohibited Conduct</h2>
            <p className="mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>Use the platform for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Use automated bots, scrapers, or data mining tools without permission</li>
              <li>Reverse engineer, decompile, or attempt to extract our proprietary algorithms</li>
              <li>Resell, redistribute, or commercialize our predictions or data</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Impersonate others or provide false information</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Violate any applicable gambling laws in your jurisdiction</li>
            </ul>
            <div className="bg-red-50 border-l-4 border-red-600 p-4 my-4">
              <p className="text-red-900 text-sm">
                <strong>Legal Compliance:</strong> You are solely responsible for ensuring your use of PredictionMatrix complies with all applicable laws in your jurisdiction, including gambling and sports betting regulations.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Intellectual Property Rights</h2>
            <div className="space-y-3">
              <p>
                <strong>Our Property:</strong> The Platform and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, audio, and the design, selection, and arrangement thereof) are owned by PredictionMatrix, its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p>
                <strong>Your License:</strong> Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use PredictionMatrix for personal, non-commercial purposes.
              </p>
              <p>
                <strong>Restrictions:</strong> You may not:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Copy, modify, or create derivative works of our content</li>
                <li>Sell, license, or exploit our proprietary algorithms</li>
                <li>Remove copyright or proprietary notices</li>
                <li>Use our trademarks without written permission</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Subscription & Payment Terms</h2>
            <div className="space-y-3">
              <p>
                <strong>Free & Paid Plans:</strong> PredictionMatrix offers both free and premium subscription tiers. Premium features require payment of applicable fees.
              </p>
              <p>
                <strong>Billing:</strong> Premium subscriptions are billed in advance on a recurring basis (monthly or annually). You authorize us to charge your payment method for all fees owed.
              </p>
              <p>
                <strong>Auto-Renewal:</strong> Subscriptions automatically renew unless you cancel before the renewal date. You can cancel anytime through your account settings.
              </p>
              <p>
                <strong>Refunds:</strong> All fees are non-refundable except as required by law or as expressly stated in our refund policy. We do not provide refunds for partial subscription periods.
              </p>
              <p>
                <strong>Price Changes:</strong> We reserve the right to modify subscription prices with 30 days' notice to existing subscribers.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Disclaimers & Limitation of Liability</h2>
            <div className="space-y-3">
              <p>
                <strong>NO WARRANTIES:</strong> THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p>
                <strong>No Guarantee of Accuracy:</strong> We do not warrant that our predictions, analytics, or data will be accurate, complete, reliable, or error-free. Sports outcomes are inherently unpredictable.
              </p>
              <p>
                <strong>No Guarantee of Availability:</strong> We do not guarantee uninterrupted, timely, or secure access to the Platform. Technical issues, maintenance, or other factors may cause service disruptions.
              </p>
              <div className="bg-gray-900 text-white rounded-lg p-6 my-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-2">LIMITATION OF LIABILITY</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      TO THE FULLEST EXTENT PERMITTED BY LAW, PREDICTIONMATRIX AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
                    </p>
                    <ul className="text-sm text-gray-300 list-disc list-inside mt-2 space-y-1">
                      <li>Your use or inability to use the Platform</li>
                      <li>Any reliance on predictions, analytics, or content</li>
                      <li>Any financial losses from gambling or betting activities</li>
                      <li>Unauthorized access to your account or data</li>
                      <li>Errors, mistakes, or inaccuracies in our content</li>
                    </ul>
                    <p className="text-sm text-gray-300 mt-3">
                      OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless PredictionMatrix and its officers, directors, employees, contractors, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Your violation of these Terms</li>
              <li>Your use or misuse of the Platform</li>
              <li>Your violation of any laws or regulations</li>
              <li>Your violation of any rights of another person or entity</li>
              <li>Any gambling or betting activities you engage in</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Third-Party Links & Services</h2>
            <p>
              Our Platform may contain links to third-party websites, including licensed sportsbooks and gambling operators. These links are provided for your convenience only. We do not endorse, control, or assume responsibility for the content, privacy policies, or practices of any third-party websites.
            </p>
            <p className="mt-3">
              <strong>Your Risk:</strong> You access third-party websites at your own risk and should review their terms and policies before using their services.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting a notice on the Platform or sending an email to registered users. Your continued use of the Platform after changes become effective constitutes acceptance of the modified Terms.
            </p>
            <p className="mt-3">
              <strong>Review Regularly:</strong> We encourage you to review these Terms periodically for any updates.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason, including if you breach these Terms.
            </p>
            <p className="mt-3">
              Upon termination:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Your right to use the Platform will immediately cease</li>
              <li>You must cease all use of the Platform</li>
              <li>All provisions that should survive termination shall survive</li>
              <li>No refunds will be provided for prepaid subscription periods</li>
            </ul>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law & Dispute Resolution</h2>
            <div className="space-y-3">
              <p>
                <strong>Governing Law:</strong> These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
              </p>
              <p>
                <strong>Arbitration Agreement:</strong> Any dispute arising from these Terms or your use of the Platform shall be resolved through binding arbitration in accordance with the Commercial Arbitration Rules of the American Arbitration Association, rather than in court.
              </p>
              <p>
                <strong>Exceptions:</strong> Either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement of intellectual property rights.
              </p>
              <p>
                <strong>Class Action Waiver:</strong> You agree to bring claims only in your individual capacity and not as part of any class or representative action.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. General Provisions</h2>
            <div className="space-y-3">
              <p>
                <strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy and Disclaimer, constitute the entire agreement between you and PredictionMatrix.
              </p>
              <p>
                <strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
              </p>
              <p>
                <strong>No Waiver:</strong> Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
              </p>
              <p>
                <strong>Assignment:</strong> You may not assign or transfer these Terms without our written consent. We may assign our rights without restriction.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Information</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mt-3">
              <p className="font-semibold text-gray-900">PredictionMatrix</p>
              <p className="text-gray-700 text-sm mt-1">Email: <a href="mailto:legal@predictionmatrix.com" className="text-blue-600 hover:underline">legal@predictionmatrix.com</a></p>
              <p className="text-gray-700 text-sm">Website: <a href="https://predictionmatrix.com" className="text-blue-600 hover:underline">predictionmatrix.com</a></p>
            </div>
          </section>

          {/* Acknowledgment */}
          <div className="bg-blue-900 text-white rounded-lg p-6 mt-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold mb-2">Acknowledgment</h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  By using PredictionMatrix, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these Terms, please discontinue use of our platform immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
