import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NFL Power Rankings - Elo Ratings',
  description: 'NFL team power rankings based on Elo ratings. See which teams are trending up or down with our AI-powered rating system updated weekly.',
  openGraph: {
    title: 'NFL Power Rankings - Elo Ratings | Prediction Matrix',
    description: 'NFL team power rankings based on Elo ratings. See which teams are trending up or down.',
  },
};

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
