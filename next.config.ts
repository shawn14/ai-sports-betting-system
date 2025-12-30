import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/prediction-data.json',
        destination: 'https://0luulmjdaimldet9.public.blob.vercel-storage.com/prediction-matrix-data.json',
      },
      {
        source: '/nba-prediction-data.json',
        destination: 'https://0luulmjdaimldet9.public.blob.vercel-storage.com/nba-prediction-data.json',
      },
      {
        source: '/nba-pace-calibration.json',
        destination: 'https://0luulmjdaimldet9.public.blob.vercel-storage.com/nba-pace-calibration.json',
      },
      {
        source: '/nhl-prediction-data.json',
        destination: 'https://0luulmjdaimldet9.public.blob.vercel-storage.com/nhl-prediction-data.json',
      },
    ];
  },
  async headers() {
    return [
      {
        // Cache prediction data files at the edge for 5 minutes, revalidate in background
        source: '/:path(prediction-data|nba-prediction-data|nhl-prediction-data|nba-pace-calibration).json',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
