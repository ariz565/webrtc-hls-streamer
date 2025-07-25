/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/socket',
        destination: 'http://localhost:3001/socket.io/',
      },
      {
        source: '/hls/:path*',
        destination: 'http://localhost:3002/hls/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
