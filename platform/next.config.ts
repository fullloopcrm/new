import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Remote hosts used as next/image sources across tenant sites. Required now
    // that programmatic pages render on-demand (build-time prerender previously
    // masked missing remotePatterns; on-demand render throws "hostname not
    // configured" → 500 without this).
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'www.pexels.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async rewrites() {
    // Use afterFiles so these rewrites run AFTER middleware prefixes tenant
    // requests with /site. Tenant content already reads getTenantFromHeaders.
    return {
      beforeFiles: [],
      afterFiles: [
        // nycmaid is BESPOKE_SITE_TENANTS (siteBase '/site/nycmaid'), so
        // middleware's rewriteToSite() never produces a bare /site/<path> for
        // it — these sources must carry the /nycmaid segment to ever match.
        // See NYCMAID-SHORT-URL-404-FIX-OPTIONS.md Option A.
        { source: '/site/nycmaid/about', destination: '/site/nycmaid/about-the-nyc-maid-service-company' },
        { source: '/site/reviews', destination: '/site/nyc-customer-reviews-for-the-nyc-maid' },
        { source: '/site/services', destination: '/site/nyc-maid-service-services-offered-by-the-nyc-maid' },
        { source: '/site/nycmaid/faq', destination: '/site/nycmaid/nyc-cleaning-service-frequently-asked-questions-in-2025' },
        { source: '/site/nycmaid/tips', destination: '/site/nycmaid/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid' },
        { source: '/site/nycmaid/blog', destination: '/site/nycmaid/nyc-maid-service-blog' },
        { source: '/site/nycmaid/blog/:slug', destination: '/site/nycmaid/nyc-maid-service-blog/:slug' },
        { source: '/site/nycmaid/areas', destination: '/site/nycmaid/service-areas-served-by-the-nyc-maid' },
        { source: '/site/nycmaid/contact', destination: '/site/nycmaid/contact-the-nyc-maid-service-today' },
        { source: '/site/nycmaid/pricing', destination: '/site/nycmaid/updated-nyc-maid-service-industry-pricing' },
        { source: '/site/careers', destination: '/site/available-nyc-maid-jobs' },
        { source: '/site/careers/:slug', destination: '/site/available-nyc-maid-jobs/:slug' },
        { source: '/site/referral', destination: '/site/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
        { source: '/site/nycmaid/emergency', destination: '/site/nycmaid/service/nyc-emergency-cleaning-service' },
      ],
      fallback: [],
    }
  },
  async redirects() {
    return [
      // NOTE: www is now canonical for every domain (apex -> www 301 lives in
      // src/middleware.ts). The previous www.homeservicesbusinesscrm.com -> apex
      // redirect was removed here — keeping it would infinite-loop against the
      // middleware redirect.
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
      // NOTE: /book/new is the PUBLIC self-book lead form (served from the
      // tenant site), NOT the client portal — so it must NOT redirect to
      // /portal/book (which is auth-gated and bounces new leads to login).
      { source: '/book/collect', destination: '/portal/collect', permanent: true },
      { source: '/book/reschedule/:id', destination: '/portal/reschedule/:id', permanent: true },
      { source: '/book/dashboard', destination: '/portal', permanent: true },
      // Only match UUID check-in tokens so named portal routes (/team/login,
      // /team/earnings, …) pass through to their real pages instead of being
      // swallowed by this legacy check-in redirect.
      { source: '/team/:token([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})', destination: '/team/checkin/:token', permanent: true },
      { source: '/apply/operations-coordinator', destination: '/site/careers/operations-coordinator', permanent: true },
      // Waitlist-only era — partnership form route renamed.
      { source: '/crm-partnership-request-form', destination: '/waitlist', permanent: true },
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
