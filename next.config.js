
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: [],
  },
}
module.exports = nextConfig
