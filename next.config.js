/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Netlify configuration
  output: "standalone",
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
}

module.exports = nextConfig
