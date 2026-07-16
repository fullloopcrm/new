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
