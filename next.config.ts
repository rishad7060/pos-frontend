import type { NextConfig } from "next";

// TEAM_003: Disabled next-pwa - using custom simple Service Worker instead
// The next-pwa plugin was generating SW but caches weren't being populated
// Using a minimal custom SW in public/sw.js

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
