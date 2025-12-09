'use client';

import Link from 'next/link';
import { User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function LoggedInHeader() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo href="/games" size="md" />

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/games"
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              Games
            </Link>
            <Link
              href="/predictions"
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              Predictions
            </Link>
            <Link
              href="/how-it-works"
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              How It Works
            </Link>
            <Link
              href="/backtest-results"
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              Backtest
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <User className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Account</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Upgrade Badge */}
            <Link
              href="/pricing"
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-lg transition"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
