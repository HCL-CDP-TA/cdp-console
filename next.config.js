/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Netlify configuration
  trailingSlash: true,
  output: "standalone",
}

module.exports = nextConfig
