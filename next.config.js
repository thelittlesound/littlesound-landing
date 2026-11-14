/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // unpdf (PDF text for the date agent) ships its own PDF.js build; load it
  // as-is at runtime instead of bundling it.
  experimental: {
    serverComponentsExternalPackages: ['unpdf'],
  },
}

module.exports = nextConfig
