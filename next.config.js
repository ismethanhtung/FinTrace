/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/stock/:path*",
        destination: "http://16.163.172.44/:path*",
      },
    ];
  },
};

export default nextConfig;
