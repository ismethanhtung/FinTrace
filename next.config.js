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
        destination: "http://52.77.72.207/stock/image/:symbol",
      },
      {
        source: "/api/stock/:path*",
        destination: "http://52.77.72.207/:path*",
      },
      {
        source: "/api/stock",
        destination: "http://52.77.72.207/",
      },
    ];
  },
};

export default nextConfig;
