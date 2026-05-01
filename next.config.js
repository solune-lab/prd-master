import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'

// Setup Cloudflare dev platform bindings in development
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform()
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: [],
}

export default nextConfig
