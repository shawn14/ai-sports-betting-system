'use client';

import Link from 'next/link';
import { User, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { signOut, auth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import ScoresTicker from '@/components/ScoresTicker';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

export default function LoggedInHeader() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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
    <header className="sticky top-0 z-50">
      {/* Scores Ticker */}
      <ScoresTicker />

      {/* Main Header */}
      <div className="bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] border-b border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/games" className="hover:opacity-80 transition-opacity">
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">
                  PREDICTION<span className="text-blue-500">MATRIX</span>
                </h1>
                <p className="text-[9px] text-gray-400 tracking-wider uppercase">AI Sports Analytics</p>
              </div>
            </Link>

            {/* Center Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/games"
                className="px-3 py-2 text-gray-300 hover:text-white text-sm font-medium transition"
              >
                Games
              </Link>
              <Link
                href="/predictions"
                className="px-3 py-2 text-gray-300 hover:text-white text-sm font-medium transition"
              >
                Predictions
              </Link>
              <Link
                href="/rankings"
                className="px-3 py-2 text-gray-300 hover:text-white text-sm font-medium transition"
              >
                Rankings
              </Link>
              <Link
                href="/how-it-works"
                className="px-3 py-2 text-gray-300 hover:text-white text-sm font-medium transition"
              >
                How It Works
              </Link>
              <Link
                href="/backtest-results"
                className="px-3 py-2 text-gray-300 hover:text-white text-sm font-medium transition"
              >
                Backtest
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-300 hover:text-white transition"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white transition"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 rounded-full object-cover border border-gray-600"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline text-sm font-medium">Account</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#2a2a2a] border border-gray-700 rounded shadow-lg py-1 z-50">
                    {user && (
                      <div className="px-4 py-3 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                          {user.photoURL && (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || 'User'}
                              className="w-10 h-10 rounded-full object-cover border border-gray-600"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            {user.displayName && (
                              <p className="text-white text-sm font-medium truncate">
                                {user.displayName}
                              </p>
                            )}
                            <p className="text-gray-400 text-xs truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Upgrade Button */}
              <Link
                href="/coming-soon"
                className="hidden lg:flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition"
              >
                Upgrade
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-[#1a1a1a] border-t border-gray-700">
            <nav className="px-4 py-3 space-y-1">
              <Link
                href="/games"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded text-sm font-medium transition"
              >
                Games
              </Link>
              <Link
                href="/predictions"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded text-sm font-medium transition"
              >
                Predictions
              </Link>
              <Link
                href="/rankings"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded text-sm font-medium transition"
              >
                Rankings
              </Link>
              <Link
                href="/how-it-works"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded text-sm font-medium transition"
              >
                How It Works
              </Link>
              <Link
                href="/backtest-results"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded text-sm font-medium transition"
              >
                Backtest
              </Link>
              <Link
                href="/coming-soon"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition text-center mt-2"
              >
                Upgrade
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
