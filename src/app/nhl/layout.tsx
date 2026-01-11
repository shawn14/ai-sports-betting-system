import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NHL Betting Predictions & Picks',
  description: 'Daily NHL betting predictions with AI-powered puckline picks, over/under totals, and Elo power rankings. Track ATS results and find value bets.',
  alternates: {
    canonical: 'https://www.predictionmatrix.com/nhl',
  },
  openGraph: {
    title: 'NHL Betting Predictions & Picks | Prediction Matrix',
    description: 'Daily NHL betting predictions with AI-powered puckline picks, over/under totals, and Elo power rankings.',
    url: 'https://www.predictionmatrix.com/nhl',
    siteName: 'Prediction Matrix',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://www.predictionmatrix.com/api/og',
        width: 1200,
        height: 630,
        alt: 'NHL Betting Predictions | Prediction Matrix',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NHL Betting Predictions & Picks | Prediction Matrix',
    description: 'Daily NHL betting predictions with AI-powered puckline picks and Elo power rankings.',
    images: ['https://www.predictionmatrix.com/api/og'],
  },
};

export default function NHLLayout({ children }: { children: React.ReactNode }) {
  return children;
}
