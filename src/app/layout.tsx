import type { Metadata } from "next";
import { Inter, Roboto_Condensed } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.predictionmatrix.com'),
  title: "Prediction Matrix - NFL Picks",
  description: "AI-powered NFL betting predictions using Elo ratings",
  openGraph: {
    title: "Prediction Matrix",
    description: "AI Sports Predictions",
    url: "https://www.predictionmatrix.com",
    siteName: "Prediction Matrix",
    images: [
      {
        url: "https://www.predictionmatrix.com/api/og",
        width: 1200,
        height: 630,
        alt: "Prediction Matrix - AI Sports Predictions",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prediction Matrix",
    description: "AI Sports Predictions",
    images: ["https://www.predictionmatrix.com/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${robotoCondensed.variable} antialiased font-sans`}
        style={{ fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif' }}
      >
        {/* Top accent bar */}
        <div className="h-1 bg-red-600" />

        {/* Main nav */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-4 sm:gap-8">
                <a href="/" className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs sm:text-sm">PM</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">Prediction Matrix</span>
                    <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-wider leading-tight hidden xs:block">AI-Powered NFL Predictions</span>
                  </div>
                </a>
                <div className="hidden sm:flex">
                  <a href="/" className="text-gray-700 hover:text-red-700 hover:border-b-2 hover:border-red-600 px-4 py-4 text-sm font-semibold transition-colors">
                    Picks
                  </a>
                  <a href="/rankings" className="text-gray-700 hover:text-red-700 hover:border-b-2 hover:border-red-600 px-4 py-4 text-sm font-semibold transition-colors">
                    Rankings
                  </a>
                  <a href="/results" className="text-gray-700 hover:text-red-700 hover:border-b-2 hover:border-red-600 px-4 py-4 text-sm font-semibold transition-colors">
                    Results
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500">
                  <span className="font-medium">ATS:</span>
                  <span className="font-bold text-green-600">55.1%</span>
                  <span className="text-gray-300 mx-1">|</span>
                  <span className="font-medium">ML:</span>
                  <span className="font-bold text-green-600">77.9%</span>
                  <span className="text-[10px] text-gray-400">w/edge</span>
                  <span className="text-gray-300 mx-1">|</span>
                  <span className="font-medium">O/U:</span>
                  <span className="font-bold text-green-600">57.4%</span>
                  <span className="text-[10px] text-gray-400">w/edge</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">NFL</span>
                  <span className="bg-gray-100 text-gray-700 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">2025</span>
                </div>
              </div>
            </div>
            {/* Mobile nav */}
            <div className="flex sm:hidden border-t border-gray-100 -mx-3 px-1">
              <a href="/" className="flex-1 text-center text-gray-700 hover:text-red-700 hover:bg-gray-50 py-2.5 text-xs font-semibold transition-colors">
                Picks
              </a>
              <a href="/rankings" className="flex-1 text-center text-gray-700 hover:text-red-700 hover:bg-gray-50 py-2.5 text-xs font-semibold transition-colors">
                Rankings
              </a>
              <a href="/results" className="flex-1 text-center text-gray-700 hover:text-red-700 hover:bg-gray-50 py-2.5 text-xs font-semibold transition-colors">
                Results
              </a>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs sm:text-sm text-gray-500">
                <span>Prediction Matrix</span>
                <span className="text-[10px] sm:text-sm">ATS 55.1% | ML 77.9% | O/U 57.4%</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] sm:text-xs text-gray-400 border-t border-gray-100 pt-3 sm:pt-4">
                <div className="flex items-center gap-4">
                  <a href="/about" className="hover:text-gray-600">About</a>
                  <a href="/terms" className="hover:text-gray-600">Terms</a>
                  <a href="/privacy" className="hover:text-gray-600">Privacy</a>
                </div>
                <span className="leading-relaxed">For entertainment only. 21+. Problem? 1-800-522-4700</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
