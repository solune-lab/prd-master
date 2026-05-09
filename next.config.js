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
    NEXT_PUBLIC_BASE_PATH: '/prd-master',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_51SYT2bRoWZXxrh8fj6DVR4OEqS3QdmlQduDBAvJdtF95D4wVHXiI2TH5pgsFnDMB5LAazF5T1M7VcBhwBlEWP3Oe00MAUMbl2l',
  },
}

export default nextConfig
