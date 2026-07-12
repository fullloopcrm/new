/**
 * Rich sitemap for thenyctowingservice.com (slug nyc-tow).
 *
 * Replaces the generic 7-URL /api/tenant-sitemap fallback with the site's full
 * code-defined route tree so its hand-built service/location/who-we-serve pages
 * are no longer orphaned. Enumeration is shared across the tow/roadside family
 * via buildTowFamilyUrls — see src/lib/seo/tenants/_tow-family.ts for the tiering
 * rationale (statics + services (+tips) + blog + who-we-serve + state/city
 * locations & careers; the deep combinatorial tiers are intentionally omitted
 * and stay link-crawlable from the hubs).
 *
 * Served at /site/nyc-tow/sitemap.xml; middleware rewrites the apex /sitemap.xml
 * here for the nyc-tow host (slug is in TENANTS_WITH_RICH_SITEMAP in
 * src/middleware.ts).
 */
import type { MetadataRoute } from 'next'
import { buildTowFamilyUrls, type TowStaticPath } from '@/lib/seo/tenants/_tow-family'
import { SERVICES } from './_data/services'
import { STATES } from './_data/cities'
import { CUSTOMER_TYPES } from './_data/customer-types'
import { BLOG_POSTS } from './_data/blog-posts'

const BASE = 'https://www.thenyctowingservice.com'

const STATIC_PATHS: TowStaticPath[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/apply-for-towing-job', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/book-towing-service-today', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/careers', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/commercial', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact-nyc-towing-today', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/franchise', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/locations', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/who-we-serve', priority: 0.8, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return buildTowFamilyUrls(
    BASE,
    STATIC_PATHS,
    { services: SERVICES, states: STATES, customerTypes: CUSTOMER_TYPES, blogPosts: BLOG_POSTS },
    { serviceTips: true },
  ).map((u) => ({
    url: u.loc,
    lastModified,
    changeFrequency: u.changeFrequency,
    priority: u.priority,
  }))
}
