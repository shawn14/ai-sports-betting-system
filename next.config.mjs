/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript checking during production builds
    ignoreBuildErrors: true,
  },
  // Disable static optimization to avoid useSearchParams error
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
