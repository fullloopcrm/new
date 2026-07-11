/**
 * Rich sitemap for fladumpsterrentals.com (slug fla-dumpster-rentals).
 *
 * Replaces the generic 7-URL /api/tenant-sitemap fallback with the site's full
 * code-defined route tree: statics + service hubs + area hubs + the
 * service×neighborhood money pages + blog posts. All slugs come from the site's
 * own _lib/_data, so no URL 404s. The service×neighborhood tier is ~10.9k URLs
 * (25 services × 436 neighborhoods) — well under the 50k per-sitemap limit and
 * indexable (no noindex), so it is included in full. Served at
 * /site/fla-dumpster-rentals/sitemap.xml; middleware rewrites the apex
 * /sitemap.xml here (slug is in TENANTS_WITH_RICH_SITEMAP in src/middleware.ts).
 */
import type { MetadataRoute } from 'next'
import { getAllServices, getAllNeighborhoods } from './_lib/data'
import { getAllSlugs } from './_lib/blog'

const SITE_URL = 'https://www.fladumpsterrentals.com'

type Freq = MetadataRoute.Sitemap[number]['changeFrequency']

const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: Freq }> = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/areas', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/best-dumpster-rental-florida', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/broker-service', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/cheap-dumpster-rental', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contractor-program', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/dumpster-sizes', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/free-quote', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/guide', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/how-it-works', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/junk-removal-vs-dumpster-rental', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/reviews', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/same-day-dumpster-rental', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/schedule-dumpster-rental-form', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const p of STATIC_PAGES) {
    entries.push({ url: `${SITE_URL}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority })
  }

  const services = getAllServices()
  const neighborhoods = getAllNeighborhoods()

  // Area hubs: /areas/[neighborhood]
  for (const n of neighborhoods) {
    entries.push({ url: `${SITE_URL}/areas/${n.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
  }

  // Service hubs: /[service]  +  money pages: /[service]/[neighborhood]
  for (const s of services) {
    entries.push({ url: `${SITE_URL}/${s.slug}`, lastModified, changeFrequency: 'weekly', priority: 0.8 })
    for (const n of neighborhoods) {
      entries.push({ url: `${SITE_URL}/${s.slug}/${n.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
    }
  }

  // Blog posts: /blog/[slug]
  for (const slug of getAllSlugs()) {
    entries.push({ url: `${SITE_URL}/blog/${slug}`, lastModified, changeFrequency: 'monthly', priority: 0.5 })
  }

  return entries
}
