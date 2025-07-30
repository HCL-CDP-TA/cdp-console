/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Netlify configuration
  output: "standalone",
}

module.exports = nextConfig
