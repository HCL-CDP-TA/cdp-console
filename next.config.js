/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Netlify configuration
  trailingSlash: true,
  distDir: '.next',
  target: 'serverless',
};

module.exports = nextConfig;