import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: false,
      },
      {
        source: '/my-learning',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/mylearning',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/all-courses',
        destination: '/',
        permanent: false,
      },
      {
        source: '/catalog',
        destination: '/',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/videos/:path*',
        destination: '/uploads/videos/:path*',
      },
      {
        source: '/thumbnails/:path*',
        destination: '/uploads/thumbnails/:path*',
      },
    ];
  },
};

export default nextConfig;
