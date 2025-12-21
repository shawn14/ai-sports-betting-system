import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/prediction-data.json',
        destination: 'https://heqfdmx3v2zyikwl.public.blob.vercel-storage.com/prediction-matrix-data.json',
      },
    ];
  },
};

export default nextConfig;
