'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, Sparkles } from 'lucide-react';
import Logo from '@/components/Logo';

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
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Logo href="/" className="justify-center mb-8" size="md" />

        {/* Main Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Premium Access</h2>
            <p className="text-slate-400">Coming Soon</p>
          </div>

          {!isSuccess ? (
            <>
              {/* Features Preview */}
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3 text-slate-300 text-sm">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">Advanced ML Models:</strong> 56%+ ATS accuracy predictions
                  </div>
                </div>
                <div className="flex items-start gap-3 text-slate-300 text-sm">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">Real-Time Edge Detection:</strong> Live betting opportunities
                  </div>
                </div>
                <div className="flex items-start gap-3 text-slate-300 text-sm">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">Premium Analytics:</strong> Advanced dashboards and ROI tracking
                  </div>
                </div>
                <div className="flex items-start gap-3 text-slate-300 text-sm">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">Multi-Sport Coverage:</strong> NBA, MLB, NHL coming Q1 2026
                  </div>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Join the Waitlist
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Joining...
                    </>
                  ) : (
                    'Get Early Access'
                  )}
                </button>

                <p className="text-xs text-slate-400 text-center">
                  Be the first to know when we launch. No spam, ever.
                </p>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
              <p className="text-slate-300 mb-6">
                We'll notify you as soon as premium features are available.
              </p>
              <button
                onClick={() => setIsSuccess(false)}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Add another email
              </button>
            </div>
          )}
        </div>

        {/* Launch Date */}
        <p className="text-center text-slate-400 mt-6 text-sm">
          Expected Launch: Q1 2026
        </p>

        {/* Back to Home */}
        <Link
          href="/"
          className="block text-center text-slate-400 hover:text-slate-300 mt-4 text-sm"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
