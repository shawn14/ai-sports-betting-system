import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NFL Betting Dashboard - Today\'s Picks',
  description: 'Live NFL betting dashboard with today\'s spread picks, game predictions, and real-time odds. AI-powered analysis updated every 2 hours.',
  openGraph: {
    title: 'NFL Betting Dashboard - Today\'s Picks | Prediction Matrix',
    description: 'Live NFL betting dashboard with today\'s spread picks and AI-powered game predictions.',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
