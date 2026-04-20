import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.homeservicesbusinesscrm.com' }],
        destination: 'https://homeservicesbusinesscrm.com/:path*',
        permanent: true,
      },
      {
        source: '/sm.xml',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/features',
        destination: '/full-loop-crm-service-features',
        permanent: true,
      },
      // Legacy nycmaid URLs → fullloop equivalents (preserve email links,
      // GBP links, and existing backlinks after cutover).
      { source: '/book/new', destination: '/portal/book', permanent: true },
      { source: '/book/collect', destination: '/portal/collect', permanent: true },
      { source: '/book/reschedule/:id', destination: '/portal/reschedule/:id', permanent: true },
      { source: '/book/dashboard', destination: '/portal', permanent: true },
      { source: '/team/:token', destination: '/team/checkin/:token', permanent: true },
      { source: '/apply/operations-coordinator', destination: '/site/careers/operations-coordinator', permanent: true },
      // Legacy marketing paths moved under /site/*
      { source: '/about', destination: '/site/about', permanent: true },
      { source: '/services', destination: '/site/services', permanent: true },
      { source: '/careers', destination: '/site/careers', permanent: true },
      { source: '/reviews', destination: '/site/reviews', permanent: true },
      { source: '/faq', destination: '/site/faq', permanent: true },
      { source: '/blog', destination: '/site/blog', permanent: true },
      { source: '/blog/:slug', destination: '/site/blog/:slug', permanent: true },
      { source: '/privacy-policy', destination: '/site/privacy-policy', permanent: true },
      { source: '/terms-conditions', destination: '/site/terms-conditions', permanent: true },
      { source: '/refund-policy', destination: '/site/refund-policy', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
};

export default nextConfig;
