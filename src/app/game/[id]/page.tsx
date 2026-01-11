import type { Metadata } from 'next';
import NFLGameDetailClient from './client';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `NFL Game Prediction`,
    description: 'AI-powered NFL game prediction with spread analysis, moneyline odds, and over/under totals. See our model breakdown and betting edge.',
    alternates: {
      canonical: `https://www.predictionmatrix.com/game/${id}`,
    },
    openGraph: {
      title: 'NFL Game Prediction | Prediction Matrix',
      description: 'AI-powered NFL game prediction with spread analysis and betting edge.',
      url: `https://www.predictionmatrix.com/game/${id}`,
      siteName: 'Prediction Matrix',
      type: 'article',
      locale: 'en_US',
      images: [
        {
          url: 'https://www.predictionmatrix.com/api/og',
          width: 1200,
          height: 630,
          alt: 'NFL Game Prediction | Prediction Matrix',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'NFL Game Prediction | Prediction Matrix',
      description: 'AI-powered NFL game prediction with spread analysis and betting edge.',
      images: ['https://www.predictionmatrix.com/api/og'],
    },
  };
}

export default async function NFLGameDetailPage({ params }: Props) {
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
        name: 'NFL Predictions',
        item: 'https://www.predictionmatrix.com/rankings',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Game Prediction',
        item: `https://www.predictionmatrix.com/game/${id}`,
      },
    ],
  };

  const sportsEventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: 'NFL Game',
    description: 'NFL football game with AI-powered betting predictions',
    sport: 'American Football',
    url: `https://www.predictionmatrix.com/game/${id}`,
    organizer: {
      '@type': 'SportsOrganization',
      name: 'National Football League',
      url: 'https://www.nfl.com',
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
      <NFLGameDetailClient />
    </>
  );
}
