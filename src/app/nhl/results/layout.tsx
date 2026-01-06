import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NHL ATS Results & Pick History',
  description: 'Track our NHL betting predictions performance. View puckline records, spread results, and historical pick accuracy for every game.',
  openGraph: {
    title: 'NHL ATS Results & Pick History | Prediction Matrix',
    description: 'Track our NHL betting predictions performance. View puckline records and historical accuracy.',
  },
};

export default function NHLResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
