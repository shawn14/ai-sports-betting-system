'use client';

import Link from 'next/link';
import { User, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { signOut, auth } from '@/lib/firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import ScoresTicker from '@/components/ScoresTicker';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import NavDropdown from './NavDropdown';

// Navigation categories configuration
const navCategories = [
  {
    title: 'This Week',
    items: [
      { label: 'Predictions', href: '/predictions', description: 'AI picks for upcoming games' },
      { label: 'Intelligence', href: '/intelligence', description: 'Pre-game analysis' },
      { label: 'AI Analyst', href: '/analyst', description: 'Weekly performance' },
    ]
  },
  {
    title: 'Teams',
    items: [
      { label: 'Rankings', href: '/rankings', description: 'Power rankings' },
      { label: 'Analytics', href: '/analytics', description: 'Team stats' },
    ]
  },
  {
    title: 'Learn',
    items: [
      { label: 'How It Works', href: '/how-it-works', description: 'Model explanation' },
      { label: 'Methodology', href: '/methodology', description: 'Technical details' },
    ]
  },
];

export default function LoggedInHeader() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

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

  // Check if any item in category matches current path
  const isCategoryActive = (category: typeof navCategories[0]) => {
    return category.items.some(item => pathname === item.href);
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
            <Link href="/predictions" className="hover:opacity-80 transition-opacity">
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">
                  PREDICTION<span className="text-blue-500">MATRIX</span>
                </h1>
                <p className="text-[9px] text-gray-400 tracking-wider uppercase">AI Sports Analytics</p>
              </div>
            </Link>

            {/* Center Navigation - Dropdown Menus */}
            <nav className="hidden md:flex items-center space-x-1">
              {navCategories.map((category) => (
                <NavDropdown
                  key={category.title}
                  title={category.title}
                  items={category.items}
                  isActive={isCategoryActive(category)}
                />
              ))}
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
                      className="w-6 h-6 rounded-full object-cover border border-gray-600"
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

        {/* Mobile Menu - Accordion Style */}
        {showMobileMenu && (
          <div className="md:hidden bg-[#1a1a1a] border-t border-gray-700">
            {navCategories.map((category) => (
              <div key={category.title} className="border-b border-gray-800">
                <button
                  onClick={() => setOpenMobileCategory(openMobileCategory === category.title ? null : category.title)}
                  className="w-full flex items-center justify-between px-4 py-3 text-white font-medium hover:bg-gray-800 transition"
                >
                  <span className="text-sm">{category.title}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${
                    openMobileCategory === category.title ? 'rotate-180' : ''
                  }`} />
                </button>
                {openMobileCategory === category.title && (
                  <div className="bg-gray-800">
                    {category.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setShowMobileMenu(false);
                          setOpenMobileCategory(null);
                        }}
                        className="block px-6 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/coming-soon"
              onClick={() => setShowMobileMenu(false)}
              className="block mx-4 my-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition text-center"
            >
              Upgrade
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
