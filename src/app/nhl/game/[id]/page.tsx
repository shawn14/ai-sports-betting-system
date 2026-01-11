import type { Metadata } from 'next';
import NHLGameDetailClient from './client';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `NHL Game Prediction`,
    description: 'AI-powered NHL game prediction with puckline analysis, moneyline odds, and over/under totals. See our model breakdown and betting edge.',
    alternates: {
      canonical: `https://www.predictionmatrix.com/nhl/game/${id}`,
    },
    openGraph: {
      title: 'NHL Game Prediction | Prediction Matrix',
      description: 'AI-powered NHL game prediction with puckline analysis and betting edge.',
      url: `https://www.predictionmatrix.com/nhl/game/${id}`,
      siteName: 'Prediction Matrix',
      type: 'article',
      locale: 'en_US',
      images: [
        {
          url: 'https://www.predictionmatrix.com/api/og',
          width: 1200,
          height: 630,
          alt: 'NHL Game Prediction | Prediction Matrix',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'NHL Game Prediction | Prediction Matrix',
      description: 'AI-powered NHL game prediction with puckline analysis and betting edge.',
      images: ['https://www.predictionmatrix.com/api/og'],
    },
  };
}

export default async function NHLGameDetailPage({ params }: Props) {
  const { id } = await params;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.predictionmatrix.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'NHL Predictions',
        item: 'https://www.predictionmatrix.com/nhl',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Game Prediction',
        item: `https://www.predictionmatrix.com/nhl/game/${id}`,
      },
    ],
  };

  const sportsEventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: 'NHL Game',
    description: 'NHL hockey game with AI-powered betting predictions',
    sport: 'Ice Hockey',
    url: `https://www.predictionmatrix.com/nhl/game/${id}`,
    organizer: {
      '@type': 'SportsOrganization',
      name: 'National Hockey League',
      url: 'https://www.nhl.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventJsonLd) }}
      />
      <NHLGameDetailClient />
    </>
  );
}
