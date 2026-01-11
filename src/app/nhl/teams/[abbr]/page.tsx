import type { Metadata } from 'next';
import NHLTeamClient from './client';

const NHL_TEAMS: Record<string, string> = {
  // Atlantic
  BOS: 'Boston Bruins', BUF: 'Buffalo Sabres', DET: 'Detroit Red Wings',
  FLA: 'Florida Panthers', MTL: 'Montreal Canadiens', OTT: 'Ottawa Senators',
  TB: 'Tampa Bay Lightning', TOR: 'Toronto Maple Leafs',
  // Metropolitan
  CAR: 'Carolina Hurricanes', CBJ: 'Columbus Blue Jackets', NJ: 'New Jersey Devils',
  NYI: 'New York Islanders', NYR: 'New York Rangers', PHI: 'Philadelphia Flyers',
  PIT: 'Pittsburgh Penguins', WSH: 'Washington Capitals',
  // Central
  ARI: 'Arizona Coyotes', CHI: 'Chicago Blackhawks', COL: 'Colorado Avalanche',
  DAL: 'Dallas Stars', MIN: 'Minnesota Wild', NSH: 'Nashville Predators',
  STL: 'St. Louis Blues', WPG: 'Winnipeg Jets', UTA: 'Utah Hockey Club',
  // Pacific
  ANA: 'Anaheim Ducks', CGY: 'Calgary Flames', EDM: 'Edmonton Oilers',
  LA: 'Los Angeles Kings', SEA: 'Seattle Kraken', SJ: 'San Jose Sharks',
  VAN: 'Vancouver Canucks', VGK: 'Vegas Golden Knights',
};

type Props = {
  params: Promise<{ abbr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { abbr } = await params;
  const upperAbbr = abbr.toUpperCase();
  const teamName = NHL_TEAMS[upperAbbr] || upperAbbr;

  return {
    title: `${teamName} Betting Stats & Predictions`,
    description: `${teamName} betting statistics, Elo power ranking, puckline record, and upcoming game predictions. AI-powered NHL analysis.`,
    alternates: {
      canonical: `https://www.predictionmatrix.com/nhl/teams/${abbr.toLowerCase()}`,
    },
    openGraph: {
      title: `${teamName} Betting Stats | Prediction Matrix`,
      description: `${teamName} betting statistics, power ranking, and game predictions.`,
      url: `https://www.predictionmatrix.com/nhl/teams/${abbr.toLowerCase()}`,
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

export default async function NHLTeamPage({ params }: Props) {
  const { abbr } = await params;
  const upperAbbr = abbr.toUpperCase();
  const teamName = NHL_TEAMS[upperAbbr] || upperAbbr;

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
        name: 'NHL',
        item: 'https://www.predictionmatrix.com/nhl',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: teamName,
        item: `https://www.predictionmatrix.com/nhl/teams/${abbr.toLowerCase()}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <NHLTeamClient />
    </>
  );
}
