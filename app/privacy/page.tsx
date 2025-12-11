import Link from 'next/link';
import { Lock, Eye, Database, Shield, UserCheck } from 'lucide-react';
import LoggedInHeader from '@/components/LoggedInHeader';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for PredictionMatrix - How we collect, use, and protect your data.'
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <LoggedInHeader />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-8 h-8 text-green-600" />
          <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
        </div>

        <p className="text-gray-600 text-sm mb-8">Last Updated: December 8, 2024</p>

        <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-8">
          <p className="text-green-900">
            <strong>Your Privacy Matters:</strong> PredictionMatrix is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, share, and protect your data.
          </p>
        </div>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              1. Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Information You Provide Directly:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Account Information:</strong> Email address, username, password (encrypted)</li>
                  <li><strong>Profile Information:</strong> Optional display name, preferences</li>
                  <li><strong>Payment Information:</strong> Credit card details (processed securely by Stripe - we never store full card numbers)</li>
                  <li><strong>Communications:</strong> Messages, support tickets, feedback you send us</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">Information Collected Automatically:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Usage Data:</strong> Pages viewed, features used, time spent, clickstream data</li>
                  <li><strong>Device Information:</strong> IP address, browser type, operating system, device type</li>
                  <li><strong>Location Data:</strong> General geographic location based on IP address</li>
                  <li><strong>Cookies & Similar Technologies:</strong> See Section 6 for details</li>
                  <li><strong>Performance Data:</strong> Error reports, diagnostic data, load times</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">Information from Third Parties:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Authentication Providers:</strong> If you sign in with Google/Apple, we receive basic profile info</li>
                  <li><strong>Payment Processors:</strong> Stripe provides payment confirmation and billing information</li>
                  <li><strong>Analytics Services:</strong> Aggregated usage statistics from Google Analytics</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-purple-600" />
              2. How We Use Your Information
            </h2>
            <p className="mb-3">We use collected information for the following purposes:</p>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Service Delivery & Functionality:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li>Provide access to predictions, analytics, and platform features</li>
                  <li>Process subscriptions and manage your account</li>
                  <li>Authenticate your identity and secure your account</li>
                  <li>Personalize your experience and recommendations</li>
                  <li>Remember your preferences and settings</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Communication:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li>Send transactional emails (purchase confirmations, password resets)</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Send important service updates and security alerts</li>
                  <li>Send marketing communications (with your consent - you can opt out anytime)</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Platform Improvement & Analytics:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li>Analyze usage patterns and user behavior</li>
                  <li>Improve prediction accuracy and algorithms</li>
                  <li>Debug technical issues and optimize performance</li>
                  <li>Conduct research and development</li>
                  <li>Generate aggregate statistical reports</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Legal & Security:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li>Detect, prevent, and address fraud or security issues</li>
                  <li>Enforce our Terms of Service</li>
                  <li>Comply with legal obligations</li>
                  <li>Protect the rights, property, and safety of users</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Share Your Information</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-4">
              <p className="text-yellow-900 font-semibold">
                We do NOT sell your personal information to third parties.
              </p>
            </div>
            <p className="mb-3">We may share your information in the following circumstances:</p>
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Service Providers:</h3>
                <p className="text-sm">
                  We share data with trusted third-party service providers who help us operate the platform:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-sm">
                  <li><strong>Firebase/Google Cloud:</strong> Database, authentication, hosting</li>
                  <li><strong>Stripe:</strong> Payment processing (PCI-DSS compliant)</li>
                  <li><strong>Vercel:</strong> Web hosting and CDN</li>
                  <li><strong>Email Service Providers:</strong> Transactional and marketing emails</li>
                  <li><strong>Analytics Providers:</strong> Google Analytics (anonymized data)</li>
                </ul>
                <p className="text-sm mt-2 text-gray-600">
                  These providers are contractually obligated to protect your data and use it only for the services they provide to us.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-1">Legal Requirements:</h3>
                <p className="text-sm">
                  We may disclose information if required by law, court order, or to:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-sm">
                  <li>Comply with legal process or government requests</li>
                  <li>Enforce our Terms of Service</li>
                  <li>Protect against fraud or security threats</li>
                  <li>Protect the rights, property, or safety of us, our users, or the public</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-1">Business Transfers:</h3>
                <p className="text-sm">
                  If PredictionMatrix is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-1">With Your Consent:</h3>
                <p className="text-sm">
                  We may share information with third parties when you explicitly consent to such sharing.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-600" />
              4. Data Security
            </h2>
            <p className="mb-3">
              We implement industry-standard security measures to protect your personal information:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">Technical Safeguards:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>SSL/TLS encryption (HTTPS)</li>
                  <li>Encrypted data storage</li>
                  <li>Secure password hashing (bcrypt)</li>
                  <li>Regular security audits</li>
                  <li>Firewall protection</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">Organizational Safeguards:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>Limited employee access</li>
                  <li>Confidentiality agreements</li>
                  <li>Security training</li>
                  <li>Incident response procedures</li>
                  <li>Data breach protocols</li>
                </ul>
              </div>
            </div>
            <div className="bg-red-50 border-l-4 border-red-600 p-4 mt-4">
              <p className="text-red-900 text-sm">
                <strong>Important:</strong> While we implement strong security measures, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security of your information.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mt-3">
              <ul className="space-y-2 text-sm">
                <li><strong>Active Accounts:</strong> Retained while your account is active</li>
                <li><strong>Deleted Accounts:</strong> Most data deleted within 30 days, some data retained for legal/billing purposes</li>
                <li><strong>Payment Records:</strong> Retained for 7 years for tax and accounting purposes</li>
                <li><strong>Analytics Data:</strong> Aggregated data retained indefinitely (anonymized)</li>
                <li><strong>Legal Holds:</strong> Data subject to legal obligations retained as required</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies & Tracking Technologies</h2>
            <p className="mb-3">
              We use cookies and similar technologies to enhance your experience:
            </p>
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Essential Cookies:</h3>
                <p className="text-sm text-gray-700">
                  Required for authentication, security, and basic functionality. Cannot be disabled.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Analytics Cookies:</h3>
                <p className="text-sm text-gray-700">
                  Help us understand how users interact with the platform. You can opt out via browser settings or Google Analytics opt-out.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Preference Cookies:</h3>
                <p className="text-sm text-gray-700">
                  Remember your settings and personalization choices.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              You can control cookies through your browser settings. Note that disabling cookies may limit platform functionality.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-green-600" />
              7. Your Privacy Rights
            </h2>
            <p className="mb-3">
              Depending on your location, you may have the following rights:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Access & Portability:</h3>
                <p className="text-sm text-gray-700">Request a copy of your personal data in a portable format</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Correction:</h3>
                <p className="text-sm text-gray-700">Update or correct inaccurate information</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Deletion:</h3>
                <p className="text-sm text-gray-700">Request deletion of your personal data (subject to legal obligations)</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Opt-Out:</h3>
                <p className="text-sm text-gray-700">Unsubscribe from marketing communications</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Restriction:</h3>
                <p className="text-sm text-gray-700">Request limitation of data processing</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Objection:</h3>
                <p className="text-sm text-gray-700">Object to certain data processing activities</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              To exercise these rights, contact us at <a href="mailto:privacy@predictionmatrix.com" className="text-blue-600 hover:underline">privacy@predictionmatrix.com</a> or through your account settings.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
            <p>
              PredictionMatrix is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18. If you believe we have inadvertently collected information from a child, please contact us immediately and we will delete it.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in the United States or other countries where our service providers operate. These countries may have different data protection laws than your country of residence. By using PredictionMatrix, you consent to such transfers.
            </p>
            <p className="mt-3">
              We implement appropriate safeguards to protect your data during international transfers, including standard contractual clauses and ensuring service providers meet adequate data protection standards.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. California Privacy Rights (CCPA)</h2>
            <p className="mb-3">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Right to know what personal information is collected, used, shared, or sold</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of sale of personal information (we do not sell personal information)</li>
              <li>Right to non-discrimination for exercising your CCPA rights</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              To exercise your CCPA rights, contact us at <a href="mailto:privacy@predictionmatrix.com" className="text-blue-600 hover:underline">privacy@predictionmatrix.com</a>
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Posting the updated policy on this page with a new "Last Updated" date</li>
              <li>Sending an email to registered users</li>
              <li>Displaying a prominent notice on the platform</li>
            </ul>
            <p className="mt-3">
              Your continued use of PredictionMatrix after changes become effective constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
            <p className="mb-3">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-blue-900 text-white rounded-lg p-6">
              <p className="font-bold text-lg mb-3">Privacy Team</p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> <a href="mailto:privacy@predictionmatrix.com" className="text-blue-300 hover:underline">privacy@predictionmatrix.com</a></p>
                <p><strong>Website:</strong> <a href="https://predictionmatrix.com/contact" className="text-blue-300 hover:underline">predictionmatrix.com/contact</a></p>
                <p className="text-blue-200 mt-4">
                  We will respond to privacy-related inquiries within 30 days.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
