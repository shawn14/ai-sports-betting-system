import Link from 'next/link';
import { Mail, Phone, Clock } from 'lucide-react';
import LoggedInHeader from '@/components/LoggedInHeader';
import ContactForm from '@/components/ContactForm';

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the PredictionMatrix team. We\'re here to help!'
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <LoggedInHeader />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600">
            Have a question? We're here to help.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Contact Info Cards */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Email Us</h2>
            </div>
            <p className="text-gray-700 mb-3">
              General inquiries and support
            </p>
            <a
              href="mailto:support@predictionmatrix.com"
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              support@predictionmatrix.com
            </a>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-600 p-3 rounded-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Support</h2>
            </div>
            <p className="text-gray-700 mb-3">
              We typically respond within 24 hours
            </p>
            <p className="text-green-700 font-semibold">
              Premium users get priority support
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-600 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Hours</h2>
            </div>
            <p className="text-gray-700 mb-2">
              Monday - Friday
            </p>
            <p className="text-purple-700 font-semibold">
              9:00 AM - 6:00 PM ET
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-gray-50 rounded-xl p-8 border-2 border-gray-200 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Send Us a Message</h2>
          <ContactForm />
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-xl p-8 border-2 border-gray-200 mb-8">
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
              <h3 className="font-bold text-gray-900 mb-2">How is my data protected?</h3>
              <p className="text-gray-700">
                We use industry-standard security measures including SSL/TLS encryption, encrypted data storage, and secure password hashing. We never sell your personal information. Read our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> for complete details.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">What sports do you cover?</h3>
              <p className="text-gray-700">
                Currently, we focus exclusively on NFL predictions. We're planning to expand to NBA, MLB, and NHL in the future.
              </p>
            </div>
          </div>
        </div>

        {/* Responsible Gaming */}
        <div className="bg-red-50 border-2 border-red-600 rounded-lg p-6">
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
      </div>
    </div>
  );
}
