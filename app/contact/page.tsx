import Link from 'next/link';
import { Mail, MessageSquare, HelpCircle, Shield, Twitter } from 'lucide-react';

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the PredictionMatrix team. We\'re here to help!'
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition">
            PredictionMatrix
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600">
            Have a question? We're here to help.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* General Inquiries */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">General Inquiries</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Questions about our platform, features, or predictions?
            </p>
            <a
              href="mailto:support@predictionmatrix.com"
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              support@predictionmatrix.com
            </a>
            <p className="text-sm text-gray-600 mt-2">
              We typically respond within 24 hours
            </p>
          </div>

          {/* Customer Support */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-600 p-3 rounded-lg">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Customer Support</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Need help with your account or subscription?
            </p>
            <a
              href="mailto:support@predictionmatrix.com"
              className="text-green-600 hover:text-green-700 font-semibold hover:underline"
            >
              support@predictionmatrix.com
            </a>
            <p className="text-sm text-gray-600 mt-2">
              Premium users get priority support
            </p>
          </div>

          {/* Privacy */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-600 p-3 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Privacy & Legal</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Privacy concerns or legal inquiries?
            </p>
            <a
              href="mailto:privacy@predictionmatrix.com"
              className="text-purple-600 hover:text-purple-700 font-semibold hover:underline"
            >
              privacy@predictionmatrix.com
            </a>
            <p className="text-sm text-gray-600 mt-2">
              GDPR, CCPA, and data requests
            </p>
          </div>

          {/* Social */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gray-700 p-3 rounded-lg">
                <Twitter className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Follow Us</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Stay updated with the latest predictions and features
            </p>
            <a
              href="https://twitter.com/predictionmatrix"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 font-semibold hover:underline"
            >
              @predictionmatrix
            </a>
            <p className="text-sm text-gray-600 mt-2">
              Updates, insights, and community
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-gray-50 rounded-xl p-8 mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">How accurate are your predictions?</h3>
              <p className="text-gray-700">
                Our Matrix TSR model achieves approximately 62.6% winner accuracy and 54%+ Against The Spread (ATS) performance based on historical backtesting. Visit our <Link href="/how-it-works" className="text-blue-600 hover:underline">How It Works</Link> page to learn more about our methodology.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Are you a gambling site?</h3>
              <p className="text-gray-700">
                No. PredictionMatrix is an analytics and educational platform. We do NOT facilitate, accept, or process any wagers or bets. We provide predictions and data analysis for informational purposes only. See our <Link href="/disclaimer" className="text-blue-600 hover:underline">Disclaimer</Link> for full details.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">How do I cancel my subscription?</h3>
              <p className="text-gray-700">
                You can cancel your subscription anytime through your account settings. Go to Account → Subscription → Cancel. You'll continue to have access until the end of your current billing period.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Do you offer refunds?</h3>
              <p className="text-gray-700">
                All fees are non-refundable except as required by law. We don't provide refunds for partial subscription periods. See our <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> for details.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">How is my data protected?</h3>
              <p className="text-gray-700">
                We use industry-standard security measures including SSL/TLS encryption, encrypted data storage, and secure password hashing. We never sell your personal information. Read our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> for complete details.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">What sports do you cover?</h3>
              <p className="text-gray-700">
                Currently, we focus exclusively on NFL predictions. We're planning to expand to NBA, MLB, and NHL in the future. Follow us on Twitter for updates on new features and sports coverage.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Can I use your predictions commercially?</h3>
              <p className="text-gray-700">
                No. Our predictions are for personal, non-commercial use only. You may not resell, redistribute, or commercialize our data or predictions. See our <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> for usage restrictions.
              </p>
            </div>
          </div>
        </div>

        {/* Responsible Gaming */}
        <div className="bg-red-50 border-2 border-red-600 rounded-lg p-6 mb-8">
          <h3 className="font-bold text-red-900 mb-3">Problem Gambling Support</h3>
          <p className="text-red-900 mb-3">
            If you or someone you know has a gambling problem, help is available 24/7:
          </p>
          <div className="space-y-2">
            <p className="text-red-900">
              <strong>National Council on Problem Gambling:</strong> <a href="tel:1-800-522-4700" className="underline hover:text-red-700">1-800-GAMBLER</a>
            </p>
            <p className="text-red-900 text-sm">
              Visit our <Link href="/disclaimer" className="underline hover:text-red-700">Disclaimer</Link> page for additional resources.
            </p>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-blue-900 text-white rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold mb-3">Support Hours</h3>
          <p className="text-blue-100 mb-2">
            Monday - Friday: 9:00 AM - 6:00 PM ET
          </p>
          <p className="text-blue-100 mb-4">
            Weekend: Limited support (we'll respond on the next business day)
          </p>
          <p className="text-sm text-blue-200">
            For urgent account issues, please email <a href="mailto:support@predictionmatrix.com" className="underline hover:text-white">support@predictionmatrix.com</a> with "URGENT" in the subject line.
          </p>
        </div>
      </div>
    </div>
  );
}
