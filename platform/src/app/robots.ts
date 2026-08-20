import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Read the Host header so tenant sites emit a robots.txt pointing to their
  // own /sitemap.xml rather than the platform sitemap.
  const h = await headers()
  const hostRaw = h.get('host') || 'homeservicecrm.ai'
  const host = hostRaw.split(':')[0].toLowerCase()

  // Same MAIN_HOSTS as middleware.ts — keep in sync if that list changes.
  const MAIN_HOSTS = new Set([
    'homeservicecrm.ai',
    'www.homeservicecrm.ai',
    'homeservicesbusinesscrm.com',
    'www.homeservicesbusinesscrm.com',
    'localhost',
    '127.0.0.1',
    'platform-ten-psi.vercel.app',
  ])

  const isMainHost = MAIN_HOSTS.has(host)
  // Origin must follow the ACTUAL requesting host, not a hardcoded literal —
  // homeservicesbusinesscrm.com is also a MAIN_HOST right now (holds
  // independently pending the SEO audit) and needs its own robots.txt/
  // sitemap origin, not homeservicecrm.ai's.
  const origin = `https://${host}`

  // Private app surfaces — disallowed on every host (main + tenant).
  const disallow = [
    '/dashboard/',
    '/admin/',
    '/api/',
    '/team/',
    '/portal/',
    '/sign-in/',
    '/sign-up/',
    '/onboarding/',
    '/unsubscribe',
    '/stripe-onboard/',
    // Build assets — GSC showed hashed _next/static/*.js and *.css chunk URLs
    // in "Crawled - currently not indexed". Nothing intentionally links to
    // them, but nothing blocked them either. Explicit disallow closes it.
    '/_next/',
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

  // /sitemap-current.xml is a deliberately-new path for the MARKETING site's
  // own GSC resubmission (see src/app/sitemap-current.xml/route.ts) — it
  // calls mainSitemapXml(), which is hardcoded to the platform's own
  // marketing pages with no tenant/host awareness at all. Pointing every
  // tenant's robots.txt at it (as this previously did unconditionally) told
  // Google to crawl the Full Loop marketing site's sitemap instead of the
  // tenant's own — every non-main-host domain needs the real, tenant-aware
  // /sitemap.xml instead.
  const sitemapPath = isMainHost ? '/sitemap-current.xml' : '/sitemap.xml'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${origin}${sitemapPath}`,
  }
}
