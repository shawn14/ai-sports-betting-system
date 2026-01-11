import type { Metadata } from 'next';
import NBATeamClient from './client';

const NBA_TEAMS: Record<string, string> = {
  ATL: 'Atlanta Hawks', BOS: 'Boston Celtics', BKN: 'Brooklyn Nets',
  CHA: 'Charlotte Hornets', CHI: 'Chicago Bulls', CLE: 'Cleveland Cavaliers',
  DAL: 'Dallas Mavericks', DEN: 'Denver Nuggets', DET: 'Detroit Pistons',
  GSW: 'Golden State Warriors', HOU: 'Houston Rockets', IND: 'Indiana Pacers',
  LAC: 'LA Clippers', LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies',
  MIA: 'Miami Heat', MIL: 'Milwaukee Bucks', MIN: 'Minnesota Timberwolves',
  NOP: 'New Orleans Pelicans', NYK: 'New York Knicks', OKC: 'Oklahoma City Thunder',
  ORL: 'Orlando Magic', PHI: 'Philadelphia 76ers', PHX: 'Phoenix Suns',
  POR: 'Portland Trail Blazers', SAC: 'Sacramento Kings', SAS: 'San Antonio Spurs',
  TOR: 'Toronto Raptors', UTA: 'Utah Jazz', WAS: 'Washington Wizards',
};

type Props = {
  params: Promise<{ abbr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { abbr } = await params;
  const upperAbbr = abbr.toUpperCase();
  const teamName = NBA_TEAMS[upperAbbr] || upperAbbr;

  return {
    title: `${teamName} Betting Stats & Predictions`,
    description: `${teamName} betting statistics, Elo power ranking, ATS record, and upcoming game predictions. AI-powered NBA analysis.`,
    alternates: {
      canonical: `https://www.predictionmatrix.com/nba/teams/${abbr.toLowerCase()}`,
    },
    openGraph: {
      title: `${teamName} Betting Stats | Prediction Matrix`,
      description: `${teamName} betting statistics, power ranking, and game predictions.`,
      url: `https://www.predictionmatrix.com/nba/teams/${abbr.toLowerCase()}`,
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

export default async function NBATeamPage({ params }: Props) {
  const { abbr } = await params;
  const upperAbbr = abbr.toUpperCase();
  const teamName = NBA_TEAMS[upperAbbr] || upperAbbr;

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
        name: 'NBA',
        item: 'https://www.predictionmatrix.com/nba',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: teamName,
        item: `https://www.predictionmatrix.com/nba/teams/${abbr.toLowerCase()}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <NBATeamClient />
    </>
  );
}
