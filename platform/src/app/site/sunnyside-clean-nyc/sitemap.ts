/**
 * Rich sitemap for cleaningservicesunnysideny.com (slug sunnyside-clean-nyc).
 *
 * Replaces the generic 7-URL /api/tenant-sitemap fallback with the site's full
 * set of INDEXABLE code-defined routes, enumerated from its own _lib/seo data:
 *   statics + /services/[urlSlug] (13) + /service-areas/[urlSlug] (areas +
 *   neighborhoods ≈ 270) + /cleaning-tips-and-tricks/[slug] (blog, 12).
 * Total ≈ 300 URLs.
 *
 * Deliberately EXCLUDED (to mirror the site's own canonical/robots decisions):
 *  - /[slug]/[service] neighborhood×service combos — the pages set
 *    robots.index:false (thin programmatic combos, crawlable for link equity
 *    only), so they must stay out of the sitemap.
 *  - /service-locations/[slug] — those pages canonicalize to
 *    /service-areas/[slug], so listing them would advertise duplicates.
 *
 * Served at /site/sunnyside-clean-nyc/sitemap.xml; middleware rewrites the apex
 * /sitemap.xml here (slug is in TENANTS_WITH_RICH_SITEMAP in src/middleware.ts).
 */
import type { MetadataRoute } from 'next'
import { getAllServiceUrlSlugs } from './_lib/seo/services'
import { getAllUrlSlugs } from './_lib/seo/locations'
import { getAllBlogSlugs } from './_lib/seo/blog-data'

const SITE_URL = 'https://www.cleaningservicesunnysideny.com'

type Freq = MetadataRoute.Sitemap[number]['changeFrequency']

const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: Freq }> = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/about-nyc-cleaning-service-sunnyside-clean-nyc', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/cleaning-tips-and-tricks', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/contact-nyc-cleaning-service-sunnyside-clean-nyc', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/frequently-asked-cleaning-service-related-questions', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/nyc-cleaning-service-pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/nyc-cleaning-services-offered', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/service-areas', priority: 0.8, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const p of STATIC_PAGES) {
    entries.push({ url: `${SITE_URL}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority })
  }

  // Service hubs: /services/[urlSlug]
  for (const slug of getAllServiceUrlSlugs()) {
    entries.push({ url: `${SITE_URL}/services/${slug}`, lastModified, changeFrequency: 'weekly', priority: 0.8 })
  }

  // Area + neighborhood hubs: /service-areas/[urlSlug]
  for (const slug of getAllUrlSlugs()) {
    entries.push({ url: `${SITE_URL}/service-areas/${slug}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
  }

  // Blog posts: /cleaning-tips-and-tricks/[slug]
  for (const slug of getAllBlogSlugs()) {
    entries.push({ url: `${SITE_URL}/cleaning-tips-and-tricks/${slug}`, lastModified, changeFrequency: 'monthly', priority: 0.5 })
  }

  return entries
}
