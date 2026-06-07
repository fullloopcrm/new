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
    '/join/',
    '/unsubscribe',
    '/stripe-onboard/',
  ]

  // The 2026-05-03 teaser pivot killed these on the MARKETING site only
  // (middleware returns 410 there). They are NOT killed on tenant domains —
  // tenant sites have a live /apply hiring funnel, so blocking it on tenants
  // would hide the cleaner-application page from Google. Only disallow on main.
  if (isMainHost) {
    disallow.push(
      '/apply',
      '/full-loop-crm-pricing',
      '/full-loop-crm-frequently-asked-questions',
      '/agreement',
      '/waitlist',
      '/partner-with-full-loop-crm',
      '/focus-partner',
    )
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
