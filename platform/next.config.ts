import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Use afterFiles so these rewrites run AFTER middleware prefixes tenant
    // requests with /site. Tenant content already reads getTenantFromHeaders.
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/site/about', destination: '/site/about-the-nyc-maid-service-company' },
        { source: '/site/reviews', destination: '/site/nyc-customer-reviews-for-the-nyc-maid' },
        { source: '/site/services', destination: '/site/nyc-maid-service-services-offered-by-the-nyc-maid' },
        { source: '/site/faq', destination: '/site/nyc-cleaning-service-frequently-asked-questions-in-2025' },
        { source: '/site/tips', destination: '/site/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid' },
        { source: '/site/blog', destination: '/site/nyc-maid-service-blog' },
        { source: '/site/blog/:slug', destination: '/site/nyc-maid-service-blog/:slug' },
        { source: '/site/areas', destination: '/site/service-areas-served-by-the-nyc-maid' },
        { source: '/site/contact', destination: '/site/contact-the-nyc-maid-service-today' },
        { source: '/site/pricing', destination: '/site/updated-nyc-maid-service-industry-pricing' },
        { source: '/site/careers', destination: '/site/available-nyc-maid-jobs' },
        { source: '/site/careers/:slug', destination: '/site/available-nyc-maid-jobs/:slug' },
        { source: '/site/referral', destination: '/site/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
        { source: '/site/emergency', destination: '/site/service/nyc-emergency-cleaning-service' },
      ],
      fallback: [],
    }
  },
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
      // Clean marketing URLs are handled via afterFiles rewrites above
      // (they run after middleware injects /site prefix for tenant domains).
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
