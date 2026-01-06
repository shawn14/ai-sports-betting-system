import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NBA Betting Predictions & Picks',
  description: 'Daily NBA betting predictions with AI-powered spread picks, over/under analysis, and Elo power rankings. Track ATS results and find value bets.',
  openGraph: {
    title: 'NBA Betting Predictions & Picks | Prediction Matrix',
    description: 'Daily NBA betting predictions with AI-powered spread picks, over/under analysis, and Elo power rankings.',
  },
};

export default function NBALayout({ children }: { children: React.ReactNode }) {
  return children;
}
