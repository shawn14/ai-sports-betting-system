import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NBA Power Rankings - Elo Ratings',
  description: 'NBA team power rankings based on Elo ratings. See which teams are trending up or down with our AI-powered rating system.',
  openGraph: {
    title: 'NBA Power Rankings - Elo Ratings | Prediction Matrix',
    description: 'NBA team power rankings based on Elo ratings. See which teams are trending up or down.',
  },
};

export default function NBARankingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
