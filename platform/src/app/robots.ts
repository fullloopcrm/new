import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Read the Host header so tenant sites emit a robots.txt pointing to their
  // own /sitemap.xml rather than the platform sitemap.
  const h = await headers()
  const hostRaw = h.get('host') || 'homeservicesbusinesscrm.com'
  const host = hostRaw.split(':')[0].toLowerCase()

  // Same MAIN_HOSTS as middleware.ts — keep in sync if that list changes.
  const MAIN_HOSTS = new Set([
    'homeservicesbusinesscrm.com',
    'www.homeservicesbusinesscrm.com',
    'fullloopcrm.com',
    'www.fullloopcrm.com',
    'localhost',
    '127.0.0.1',
    'platform-ten-psi.vercel.app',
  ])

  const isMainHost = MAIN_HOSTS.has(host)
  const origin = isMainHost
    ? 'https://homeservicesbusinesscrm.com'
    : `https://${host}`

  // Private app surfaces — disallowed on every host (main + tenant). Kept in
  // sync with middleware.ts's APP_ROOT_PREFIXES by hand (that file can't be
  // imported here at build time) — every reserved, non-token-gated
  // APP_ROOT_PREFIXES entry needs an equivalent line here, since each one
  // serves at its own literal, unauthenticated path on every tenant custom
  // domain. '/fullloop' (operator PIN login) and '/reset-pin' (PIN reset)
  // are auth surfaces exactly like '/sign-in/' above; '/reviews/submit' is a
  // fixed, non-token-gated form (unlike the genuinely token-gated
  // '/quote/(.*)', '/invoice/(.*)', '/sign/(.*)' public flows, which are
  // intentionally NOT listed here).
  //
  // '/login' is a DIFFERENT class from the APP_ROOT_PREFIXES entries above —
  // it is not a middleware constant at all, but a literal page that lives
  // INSIDE several bespoke tenants' own site/<slug>/ subtree
  // (src/app/site/{nyc-mobile-salon,the-florida-maid,wash-and-fold-nyc,
  // wash-and-fold-hoboken}/.../login/page.tsx, each rendering the exact same
  // SiteAdminLoginClient operator-PIN-login form '/fullloop' renders
  // globally). Because rewriteToSite() has no APP_ROOT_PREFIXES entry for
  // '/login', it resolves through the normal /site/<slug> rewrite like any
  // other tenant page — so unlike '/fullloop', this one was never a
  // candidate for Drift AJ's APP_ROOT_PREFIXES-vs-disallow diff at all; nothing
  // in this file, or in reconcile-tenant-config.mjs, watched it until now.
  //
  // The '$'-suffixed entries below (Google's "end of path" anchor) are a
  // SEPARATE fix from the trailing-slash entries just above each one, not a
  // duplicate: 'Disallow: /team/' only matches paths STRICTLY under '/team/'
  // ('/team/dashboard', '/team/foo') — it does NOT match the bare '/team'
  // path itself (the canonical example in Google's own robots.txt docs).
  // '/dashboard', '/admin', '/portal', and '/team' each have a real
  // src/app/<name>/page.tsx that middleware's APP_ROOT_PREFIXES passthrough
  // serves at that exact bare path — tenant headers injected, no auth gate
  // at the middleware level — on every tenant custom domain (confirmed live:
  // /portal and /team are 'use client' pages with only client-side
  // localStorage auth, so the bare path server-renders real content before
  // any redirect; /dashboard and /admin do have a server-side layout auth
  // gate, but the bare URL is still indexable as a redirect target with zero
  // robots.txt coverage without this). '/api' and '/stripe-onboard' have no
  // live bare page today, but are included for the same structural reason
  // reconcile-tenant-config.mjs's Drift AJ checks the full APP_ROOT_PREFIXES
  // set rather than only currently-populated members — see Drift AJ/AK in
  // that file (robotsDisallowCoversPath) for the coverage-check fix this
  // pairs with. '/sign-in', '/sign-up', and '/onboarding' get the same
  // '$'-anchored fix for the identical bug on the MAIN host: Clerk's
  // '[[...sign-in]]' / '[[...sign-up]]' catch-alls and onboarding's own
  // page.tsx both match their bare path too, and isMainHost() requests never
  // go through rewriteToSite() at all, so they reach those real Next.js
  // routes directly.
  const disallow = [
    '/dashboard/',
    '/dashboard$',
    '/admin/',
    '/admin$',
    '/api/',
    '/api$',
    '/team/',
    '/team$',
    '/portal/',
    '/portal$',
    '/sign-in/',
    '/sign-in$',
    '/sign-up/',
    '/sign-up$',
    '/onboarding/',
    '/onboarding$',
    '/unsubscribe',
    '/stripe-onboard/',
    '/stripe-onboard$',
    '/fullloop',
    '/reset-pin',
    '/reviews/submit',
    '/login',
  ]

  // /join is invite-acceptance (private) on most hosts, so it's blocked by
  // default. But on a few tenant sites /join/* is the PUBLIC hiring funnel
  // (job pages with JobPosting structured data) that was crawlable on the
  // pre-cutover standalone site — keep those crawlable so the DNS flip
  // doesn't drop their indexed job pages.
  const JOIN_CRAWLABLE_HOSTS = new Set([
    'thenycmobilesalon.com',
    'www.thenycmobilesalon.com',
  ])
  if (!JOIN_CRAWLABLE_HOSTS.has(host)) {
    disallow.push('/join/')
  }

  // The 2026-05-03 teaser pivot killed these on the MARKETING site only
  // (middleware returns 410 there). They are NOT killed on tenant domains —
  // tenant sites have a live /apply hiring funnel, so blocking it on tenants
  // would hide the cleaner-application page from Google. Only disallow on main.
  if (isMainHost) {
    // /apply is tenant-scoped hiring on the main host — keep it out of the index.
    disallow.push('/apply')
  }

  // Some bespoke tenants reuse a public-lead-form-shaped top-level segment
  // name for an entirely different, PRIVATE page instead: an email+PIN
  // client-login form (POST /api/client/login) plus its own
  // dashboard/collect/reschedule subpages — the tenant-embedded equivalent
  // of the global '/portal' page above, just forked per tenant instead of
  // shared. 'book' is the segment name on wash-and-fold-nyc/
  // wash-and-fold-hoboken, but the SAME 'book' segment is nyc-mobile-salon's
  // and the-home-services-company's genuinely PUBLIC lead-capture page (and
  // nycmaid's own legacy /book/new stub) — so, unlike '/login' above, a
  // blanket disallow entry for '/book' in the shared list would wrongly hide
  // those tenants' real public pages. This carve-out is scoped per-host,
  // mirroring JOIN_CRAWLABLE_HOSTS's per-host shape just above, but adding a
  // disallow rule per host instead of exempting one. Domains sourced from
  // each tenant's own already-hardcoded canonical URL (wash-and-fold-nyc's
  // sitemap.ts SITE_URL, wash-and-fold-hoboken's layout.tsx metadataBase —
  // both branded "The NYC Maid" — and the-florida-maid's existing
  // STATIC_TENANT_MAP entry in src/middleware.ts).
  const PRIVATE_CLIENT_LOGIN_HOSTS: Record<string, string> = {
    'washandfoldnyc.com': '/book',
    'www.washandfoldnyc.com': '/book',
    'thenycmaid.com': '/book',
    'www.thenycmaid.com': '/book',
    'thefloridamaid.com': '/clients',
    'www.thefloridamaid.com': '/clients',
  }
  const privateClientLoginPath = PRIVATE_CLIENT_LOGIN_HOSTS[host]
  if (privateClientLoginPath) {
    disallow.push(privateClientLoginPath)
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  }
}
