import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CBB Betting Predictions & Picks',
  description: 'Daily college basketball betting predictions with AI-powered spread picks, over/under analysis, and Elo power rankings. Track ATS results and find value bets.',
  alternates: {
    canonical: 'https://www.predictionmatrix.com/cbb',
  },
  openGraph: {
    title: 'CBB Betting Predictions & Picks | Prediction Matrix',
    description: 'Daily college basketball betting predictions with AI-powered spread picks, over/under analysis, and Elo power rankings.',
    url: 'https://www.predictionmatrix.com/cbb',
    siteName: 'Prediction Matrix',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://www.predictionmatrix.com/api/og',
        width: 1200,
        height: 630,
        alt: 'College Basketball Betting Predictions | Prediction Matrix',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CBB Betting Predictions & Picks | Prediction Matrix',
    description: 'Daily college basketball betting predictions with AI-powered spread picks and Elo power rankings.',
    images: ['https://www.predictionmatrix.com/api/og'],
  },
};

export default function CBBLayout({ children }: { children: React.ReactNode }) {
  return children;
}
