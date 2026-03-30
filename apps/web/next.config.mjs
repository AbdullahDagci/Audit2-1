/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // 404/500 pre-render hatasini onle (React 19 + Next 14 uyumsuzlugu)
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
