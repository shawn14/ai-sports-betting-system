import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NHL Betting Predictions & Picks',
  description: 'Daily NHL betting predictions with AI-powered puckline picks, over/under totals, and Elo power rankings. Track ATS results and find value bets.',
  openGraph: {
    title: 'NHL Betting Predictions & Picks | Prediction Matrix',
    description: 'Daily NHL betting predictions with AI-powered puckline picks, over/under totals, and Elo power rankings.',
  },
};

export default function NHLLayout({ children }: { children: React.ReactNode }) {
  return children;
}
