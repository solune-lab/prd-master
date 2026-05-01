import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'

// Setup Cloudflare dev platform bindings in development
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform()
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/prd-master',
  images: { unoptimized: true },
  serverExternalPackages: [],
  env: {
    NEXT_PUBLIC_APP_URL: 'https://soluneai.com/prd-master',
  },
}

export default nextConfig
