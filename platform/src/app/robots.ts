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

  const origin = MAIN_HOSTS.has(host)
    ? 'https://homeservicesbusinesscrm.com'
    : `https://${host}`

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
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
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  }
}
