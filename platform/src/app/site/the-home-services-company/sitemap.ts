/**
 * Rich sitemap for thehomeservicescompany.com (slug the-home-services-company).
 *
 * Replaces the generic 7-URL /api/tenant-sitemap fallback with the site's full
 * code-defined route tree. The shared tow-family builder covers the common tiers
 * (see src/lib/seo/tenants/_tow-family.ts); this site adds a /partnerships tier
 * (state + state/city, mirroring careers) that is appended here. Served at
 * /site/the-home-services-company/sitemap.xml; middleware rewrites the apex
 * /sitemap.xml here (slug is in TENANTS_WITH_RICH_SITEMAP in src/middleware.ts).
 */
import type { MetadataRoute } from 'next'
import { buildTowFamilyUrls, type TowStaticPath } from '@/lib/seo/tenants/_tow-family'
import type { UrlSpec } from '@/lib/seo/tenant-sitemap'
import { SERVICES } from './_data/services'
import { STATES } from './_data/cities'
import { CUSTOMER_TYPES } from './_data/customer-types'
import { BLOG_POSTS } from './_data/blog-posts'

const BASE = 'https://www.thehomeservicescompany.com'

const STATIC_PATHS: TowStaticPath[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/apply', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/book', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/careers', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/commercial', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/franchise', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/locations', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/partnerships', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/who-we-serve', priority: 0.8, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const base = BASE.replace(/\/+$/, '')
  const specs: UrlSpec[] = buildTowFamilyUrls(BASE, STATIC_PATHS, {
    services: SERVICES,
    states: STATES,
    customerTypes: CUSTOMER_TYPES,
    blogPosts: BLOG_POSTS,
  })

  // /partnerships/[state] and /partnerships/[state]/[city] — this site's extra
  // tier; not part of the shared family tree.
  for (const st of STATES) {
    specs.push({ loc: `${base}/partnerships/${st.slug}`, priority: 0.5, changeFrequency: 'monthly' })
    for (const city of st.cities) {
      specs.push({ loc: `${base}/partnerships/${st.slug}/${city.slug}`, priority: 0.4, changeFrequency: 'monthly' })
    }
  }

  return specs.map((u) => ({
    url: u.loc,
    lastModified,
    changeFrequency: u.changeFrequency,
    priority: u.priority,
  }))
}
