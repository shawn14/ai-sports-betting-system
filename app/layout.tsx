import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalChat from "@/components/GlobalChat";
import Disclaimer from "@/components/Disclaimer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "PredictionMatrix - AI Sports Betting Analytics",
    template: "%s | PredictionMatrix"
  },
  description: "Advanced AI-powered sports betting analytics. Find profitable edges with machine learning predictions, real-time odds comparison, and data-driven insights. NFL, NBA, MLB, NHL betting intelligence.",
  keywords: ["sports betting", "NFL predictions", "betting analytics", "AI predictions", "betting edge", "sports betting AI", "odds comparison", "betting intelligence", "sports analytics", "machine learning betting"],
  authors: [{ name: "PredictionMatrix" }],
  creator: "PredictionMatrix",
  publisher: "PredictionMatrix",
  metadataBase: new URL('https://predictionmatrix.com'),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://predictionmatrix.com",
    title: "PredictionMatrix - AI Sports Betting Analytics",
    description: "Find profitable betting edges with AI-powered predictions, real-time odds comparison, and advanced analytics.",
    siteName: "PredictionMatrix",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "PredictionMatrix - AI Sports Betting Analytics"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "PredictionMatrix - AI Sports Betting Analytics",
    description: "Find profitable betting edges with AI-powered predictions and advanced analytics.",
    images: ["/api/og"],
    creator: "@predictionmatrix"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  manifest: '/manifest.json',
  applicationName: 'PredictionMatrix',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PredictionMatrix'
  },
  verification: {
    // Add these when you set up Google Search Console, Bing, etc.
    // google: 'your-google-verification-code',
    // bing: 'your-bing-verification-code',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://predictionmatrix.com" />
      </head>
      <body className={inter.className}>
        <Disclaimer />
        <div className="pb-24">
          {children}
        </div>
        <GlobalChat />
      </body>
    </html>
  );
}
