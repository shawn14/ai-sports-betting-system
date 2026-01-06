import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NBA ATS Results & Pick History',
  description: 'Track our NBA betting predictions performance. View ATS records, spread results, and historical pick accuracy for every game.',
  openGraph: {
    title: 'NBA ATS Results & Pick History | Prediction Matrix',
    description: 'Track our NBA betting predictions performance. View ATS records, spread results, and historical accuracy.',
  },
};

export default function NBAResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
