import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NFL ATS Results & Pick History',
  description: 'Track our NFL betting predictions performance. View ATS records, spread results, and historical pick accuracy for every game this season.',
  openGraph: {
    title: 'NFL ATS Results & Pick History | Prediction Matrix',
    description: 'Track our NFL betting predictions performance. View ATS records, spread results, and historical accuracy.',
  },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
