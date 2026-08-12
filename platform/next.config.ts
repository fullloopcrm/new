import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // jsdom (via isomorphic-dompurify, used by src/lib/sanitize-html.ts for
  // Task Board note HTML) reads its own default-stylesheet.css off disk at
  // runtime for CSSOM support -- Next's serverless file tracer doesn't
  // discover that require(fs)-based read on its own, so the compiled
  // function 500s with ENOENT in production unless the asset is traced in
  // explicitly. See vercel/next.js docs on outputFileTracingIncludes.
  outputFileTracingIncludes: {
    '/api/boards/**': ['./node_modules/jsdom/lib/jsdom/browser/default-stylesheet.css'],
  },
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
        // seomgr Search Console FILE-method verification tokens — serves at the
        // root of ANY domain (see src/app/api/seo/verify-file/[file]/route.ts;
        // that route only ever echoes a token it minted itself, so this is safe
        // to leave permanently wired rather than added ad hoc per verify batch).
        { source: '/:file(google[\\w-]+\\.html)', destination: '/api/seo/verify-file/:file' },
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
      { source: '/book/reschedule/:id', destination: '/portal/bookings/:id', permanent: true },
      { source: '/book/dashboard', destination: '/portal', permanent: true },
      // Only match UUID check-in tokens so named portal routes (/team/login,
      // /team/earnings, …) pass through to their real pages instead of being
      // swallowed by this legacy check-in redirect.
      { source: '/team/:token([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})', destination: '/team/checkin/:token', permanent: true },
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
      // Recorded-answer job applications need in-page camera/mic access.
      // Scoped override — every other route stays locked down by the rule
      // above. Tenant custom domains hit the clean external path
      // (/apply/administrator) directly; middleware's /site/<tenant>/...
      // rewrite is an internal routing detail invisible to this header
      // matcher, which runs against the incoming request path — so both
      // forms are matched here to cover the real external URL and any
      // direct internal-path access (e.g. main-host template preview).
      {
        source: '/apply/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        ],
      },
      {
        source: '/site/:tenant/apply/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        ],
      },
      // /widget is the only page meant to be iframed — the 7 SEO satellite
      // microsites embed it for their floating chat launcher. The blanket
      // X-Frame-Options: DENY above blocks that outright. CSP frame-ancestors
      // takes precedence over X-Frame-Options when both are present (browsers
      // ignore X-Frame-Options once frame-ancestors is set), so this narrow
      // allowlist is enough — no need to touch the DENY rule for every other
      // route.
      {
        source: '/widget',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://automatedcrmsoftware.com https://www.automatedcrmsoftware.com https://automatedhomeservicebusiness.com https://www.automatedhomeservicebusiness.com https://automatemyhomeservicebusiness.com https://www.automatemyhomeservicebusiness.com https://automationinbusiness.com https://www.automationinbusiness.com https://crmforhomeservicebusiness.com https://www.crmforhomeservicebusiness.com https://theautomatedcrm.com https://www.theautomatedcrm.com https://whatisacrmsystem.com https://www.whatisacrmsystem.com",
          },
        ],
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  org: "full-loop-crm",
  project: "javascript-nextjs",

  // Build-time source-map upload token — not set yet, source maps won't
  // upload until it exists. See docs/adr/0006-error-tracking-sentry-plan.md.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  // Distinct from the existing /admin/monitoring dashboard — this is
  // Sentry's own ad-blocker-bypass proxy route, unrelated to that system.
  tunnelRoute: "/sentry-tunnel",

  silent: !process.env.CI,
});
