'use client';

import Link from 'next/link';
import { BarChart3, User, Settings, LogOut, Bell } from 'lucide-react';
import { useState } from 'react';

export default function LoggedInHeader() {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/games" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">
              Prediction<span className="text-blue-400">Matrix</span>
            </h1>
          </Link>

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
              href="/analytics"
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              Analytics
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              Dashboard
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>

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
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      // TODO: Implement logout
                      window.location.href = '/';
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
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
