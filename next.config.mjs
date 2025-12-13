/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error'],
          }
        : false,
  },
  experimental: {
    optimizePackageImports: ['lodash', 'react-icons'],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://sayings-backend.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
