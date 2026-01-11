import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NFL Betting Dashboard - Today\'s Picks',
  description: 'Live NFL betting dashboard with today\'s spread picks, game predictions, and real-time odds. AI-powered analysis updated every 2 hours.',
  alternates: {
    canonical: 'https://www.predictionmatrix.com/dashboard',
  },
  openGraph: {
    title: 'NFL Betting Dashboard - Today\'s Picks | Prediction Matrix',
    description: 'Live NFL betting dashboard with today\'s spread picks and AI-powered game predictions.',
    url: 'https://www.predictionmatrix.com/dashboard',
    siteName: 'Prediction Matrix',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://www.predictionmatrix.com/api/og',
        width: 1200,
        height: 630,
        alt: 'NFL Betting Dashboard | Prediction Matrix',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NFL Betting Dashboard - Today\'s Picks | Prediction Matrix',
    description: 'Live NFL betting dashboard with today\'s spread picks and AI-powered game predictions.',
    images: ['https://www.predictionmatrix.com/api/og'],
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
