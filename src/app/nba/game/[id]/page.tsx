import type { Metadata } from 'next';
import NBAGameDetailClient from './client';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `NBA Game Prediction`,
    description: 'AI-powered NBA game prediction with spread analysis, moneyline odds, and over/under totals. See our model breakdown and betting edge.',
    alternates: {
      canonical: `https://www.predictionmatrix.com/nba/game/${id}`,
    },
    openGraph: {
      title: 'NBA Game Prediction | Prediction Matrix',
      description: 'AI-powered NBA game prediction with spread analysis and betting edge.',
      url: `https://www.predictionmatrix.com/nba/game/${id}`,
      siteName: 'Prediction Matrix',
      type: 'article',
      locale: 'en_US',
      images: [
        {
          url: 'https://www.predictionmatrix.com/api/og',
          width: 1200,
          height: 630,
          alt: 'NBA Game Prediction | Prediction Matrix',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'NBA Game Prediction | Prediction Matrix',
      description: 'AI-powered NBA game prediction with spread analysis and betting edge.',
      images: ['https://www.predictionmatrix.com/api/og'],
    },
  };
}

export default async function NBAGameDetailPage({ params }: Props) {
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
        name: 'NBA Predictions',
        item: 'https://www.predictionmatrix.com/nba',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Game Prediction',
        item: `https://www.predictionmatrix.com/nba/game/${id}`,
      },
    ],
  };

  const sportsEventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: 'NBA Game',
    description: 'NBA basketball game with AI-powered betting predictions',
    sport: 'Basketball',
    url: `https://www.predictionmatrix.com/nba/game/${id}`,
    organizer: {
      '@type': 'SportsOrganization',
      name: 'National Basketball Association',
      url: 'https://www.nba.com',
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
      <NBAGameDetailClient />
    </>
  );
}
