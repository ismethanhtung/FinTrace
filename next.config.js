/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/stock/image/:symbol",
        destination: "http://16.163.172.44/stock/image/:symbol",
      },
      {
        source: "/api/stock/:path*",
        destination: "http://16.163.172.44/:path*",
      },
      {
        source: "/api/stock",
        destination: "http://16.163.172.44/",
      },
    ];
  },
};

export default nextConfig;
