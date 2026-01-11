import type { Metadata } from 'next';
import NFLTeamClient from './client';

const NFL_TEAMS: Record<string, string> = {
  ARI: 'Arizona Cardinals', ATL: 'Atlanta Falcons', BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills', CAR: 'Carolina Panthers', CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals', CLE: 'Cleveland Browns', DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos', DET: 'Detroit Lions', GB: 'Green Bay Packers',
  HOU: 'Houston Texans', IND: 'Indianapolis Colts', JAX: 'Jacksonville Jaguars',
  KC: 'Kansas City Chiefs', LAC: 'Los Angeles Chargers', LAR: 'Los Angeles Rams',
  LV: 'Las Vegas Raiders', MIA: 'Miami Dolphins', MIN: 'Minnesota Vikings',
  NE: 'New England Patriots', NO: 'New Orleans Saints', NYG: 'New York Giants',
  NYJ: 'New York Jets', PHI: 'Philadelphia Eagles', PIT: 'Pittsburgh Steelers',
  SEA: 'Seattle Seahawks', SF: 'San Francisco 49ers', TB: 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans', WAS: 'Washington Commanders',
};

type Props = {
  params: Promise<{ abbr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { abbr } = await params;
  const upperAbbr = abbr.toUpperCase();
  const teamName = NFL_TEAMS[upperAbbr] || upperAbbr;

  return {
    title: `${teamName} Betting Stats & Predictions`,
    description: `${teamName} betting statistics, Elo power ranking, ATS record, and upcoming game predictions. AI-powered NFL analysis.`,
    alternates: {
      canonical: `https://www.predictionmatrix.com/nfl/teams/${abbr.toLowerCase()}`,
    },
    openGraph: {
      title: `${teamName} Betting Stats | Prediction Matrix`,
      description: `${teamName} betting statistics, power ranking, and game predictions.`,
      url: `https://www.predictionmatrix.com/nfl/teams/${abbr.toLowerCase()}`,
      siteName: 'Prediction Matrix',
      type: 'article',
      locale: 'en_US',
      images: [
        {
          url: 'https://www.predictionmatrix.com/api/og',
          width: 1200,
          height: 630,
          alt: `${teamName} Betting Stats | Prediction Matrix`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${teamName} Betting Stats | Prediction Matrix`,
      description: `${teamName} betting statistics, power ranking, and game predictions.`,
      images: ['https://www.predictionmatrix.com/api/og'],
    },
  };
}

export default async function NFLTeamPage({ params }: Props) {
  const { abbr } = await params;
  const upperAbbr = abbr.toUpperCase();
  const teamName = NFL_TEAMS[upperAbbr] || upperAbbr;

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
        name: 'NFL',
        item: 'https://www.predictionmatrix.com/rankings',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: teamName,
        item: `https://www.predictionmatrix.com/nfl/teams/${abbr.toLowerCase()}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <NFLTeamClient />
    </>
  );
}
