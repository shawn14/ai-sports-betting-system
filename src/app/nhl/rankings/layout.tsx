import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NHL Power Rankings - Elo Ratings',
  description: 'NHL team power rankings based on Elo ratings. See which teams are trending up or down with our AI-powered rating system.',
  openGraph: {
    title: 'NHL Power Rankings - Elo Ratings | Prediction Matrix',
    description: 'NHL team power rankings based on Elo ratings. See which teams are trending up or down.',
  },
};

export default function NHLRankingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
