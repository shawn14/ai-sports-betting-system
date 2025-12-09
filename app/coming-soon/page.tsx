'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setIsSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e0a] via-[#1a1a1a] to-[#0a0e0a]">
      {/* Matrix Rain Background Effect */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ff41]/5 to-transparent animate-pulse" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Back Button */}
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-[#00ff41] transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>

        <div className="max-w-2xl w-full">
          {/* Matrix Logo */}
          <div className="text-center mb-8">
            <div className="inline-block relative">
              <div className="text-6xl font-black text-[#00ff41] font-mono tracking-wider drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">
                M
              </div>
              <div className="absolute -inset-2 bg-[#00ff41]/10 blur-xl rounded-full -z-10" />
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00ff41]/20 rounded-lg p-8 md:p-12 shadow-2xl">
            <h1 className="text-4xl md:text-5xl font-black text-white text-center mb-4">
              Premium Access
              <span className="block text-[#00ff41] mt-2">Coming Soon</span>
            </h1>

            <p className="text-gray-300 text-center text-lg mb-8 leading-relaxed">
              We're building something extraordinary. Advanced AI predictions, exclusive betting insights,
              and premium analytics tools are on the way.
            </p>

            {/* Features Preview */}
            <div className="grid gap-4 mb-10">
              <div className="flex items-start gap-3 text-gray-300">
                <div className="w-2 h-2 bg-[#00ff41] rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong className="text-white">Advanced ML Models:</strong> Next-generation XGBoost predictions with 56%+ ATS accuracy
                </div>
              </div>
              <div className="flex items-start gap-3 text-gray-300">
                <div className="w-2 h-2 bg-[#00ff41] rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong className="text-white">Real-Time Edge Detection:</strong> Live betting opportunities updated every 5 minutes
                </div>
              </div>
              <div className="flex items-start gap-3 text-gray-300">
                <div className="w-2 h-2 bg-[#00ff41] rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong className="text-white">Premium Analytics:</strong> Advanced dashboards, line movement tracking, and ROI optimization
                </div>
              </div>
              <div className="flex items-start gap-3 text-gray-300">
                <div className="w-2 h-2 bg-[#00ff41] rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong className="text-white">Multi-Sport Coverage:</strong> NBA, MLB, and NHL predictions coming Q1 2026
                </div>
              </div>
            </div>

            {/* Email Form */}
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Join the Waitlist
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-12 pr-4 py-3 bg-[#0a0e0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41] transition"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#00ff41] hover:bg-[#00ff41]/90 text-black font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00ff41]/20"
                >
                  {isSubmitting ? 'Joining...' : 'Get Early Access'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Be the first to know when we launch. No spam, ever.
                </p>
              </form>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-[#00ff41] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
                <p className="text-gray-300 mb-6">
                  We'll notify you as soon as premium features are available.
                </p>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="text-[#00ff41] hover:text-[#00ff41]/80 transition"
                >
                  Add another email
                </button>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Expected Launch: Q1 2026</p>
            <p className="mt-2">Questions? <a href="mailto:support@predictionmatrix.com" className="text-[#00ff41] hover:underline">Contact us</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
