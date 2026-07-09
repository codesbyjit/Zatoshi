/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'https', hostname: '**.minio.*' },
    ],
  },
  output: 'standalone',
  transpilePackages: ['@repo/types', '@repo/utils'],
  async rewrites() {
    return [
      {
        source: '/images/:path*',
        destination: `${API_URL}/images/:path*`,
      },
    ];
  },
};

export default nextConfig;
