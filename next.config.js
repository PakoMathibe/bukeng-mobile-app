/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    domains: ['localhost', 'maps.googleapis.com', 'api.mapbox.com'],
  },
  experimental: {
    serverActions: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  // Add this to fix manifest.json serving
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json; charset=utf-8',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;