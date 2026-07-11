/**
 * Rich sitemap for nycroadsideemergencyassistance.com
 * (slug nycroadsideemergencyassistance).
 *
 * Replaces the generic 7-URL /api/tenant-sitemap fallback with the site's full
 * code-defined route tree. The shared tow-family builder covers the common tiers
 * (see src/lib/seo/tenants/_tow-family.ts); this site adds roadway landing tiers
 * (bridges / highways / streets / tunnels, each with a [slug] page enumerated
 * from its own data) plus an /answers page, appended here. Served at
 * /site/nycroadsideemergencyassistance/sitemap.xml; middleware rewrites the apex
 * /sitemap.xml here (slug is in TENANTS_WITH_RICH_SITEMAP in src/middleware.ts).
 */
import type { MetadataRoute } from 'next'
import { buildTowFamilyUrls, type TowStaticPath } from '@/lib/seo/tenants/_tow-family'
import type { UrlSpec } from '@/lib/seo/tenant-sitemap'
import { SERVICES } from './_data/services'
import { STATES } from './_data/cities'
import { CUSTOMER_TYPES } from './_data/customer-types'
import { BLOG_POSTS } from './_data/blog-posts'
import { BRIDGES } from './_data/bridges'
import { HIGHWAYS } from './_data/highways'
import { STREETS } from './_data/streets'
import { TUNNELS } from './_data/tunnels'

const BASE = 'https://www.nycroadsideemergencyassistance.com'

const STATIC_PATHS: TowStaticPath[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/answers', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/apply-for-towing-job', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/book-towing-service-today', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/bridges', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/careers', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/commercial', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact-nyc-towing-today', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/franchise', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/highways', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/locations', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/streets', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/tunnels', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/who-we-serve', priority: 0.8, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const base = BASE.replace(/\/+$/, '')
  const specs: UrlSpec[] = buildTowFamilyUrls(
    BASE,
    STATIC_PATHS,
    { services: SERVICES, states: STATES, customerTypes: CUSTOMER_TYPES, blogPosts: BLOG_POSTS },
    { serviceTips: true },
  )

  // Roadway landing pages — /{bridges,highways,streets,tunnels}/[slug], each
  // enumerated from its own data. Not part of the shared family tree.
  const roadwayTiers: Array<{ segment: string; items: readonly { slug: string }[] }> = [
    { segment: 'bridges', items: BRIDGES },
    { segment: 'highways', items: HIGHWAYS },
    { segment: 'streets', items: STREETS },
    { segment: 'tunnels', items: TUNNELS },
  ]
  for (const tier of roadwayTiers) {
    for (const r of tier.items) {
      specs.push({ loc: `${base}/${tier.segment}/${r.slug}`, priority: 0.5, changeFrequency: 'monthly' })
    }
  }

  return specs.map((u) => ({
    url: u.loc,
    lastModified,
    changeFrequency: u.changeFrequency,
    priority: u.priority,
  }))
}
