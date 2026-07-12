/**
 * Rich sitemap for debtserviceratioloan.com (slug debt-service-ratio-loan).
 *
 * Replaces the generic 7-URL /api/tenant-sitemap fallback with the site's full
 * code-defined route tree, enumerated from its own _lib data:
 *   statics + /services/[slug] + /locations/[state] + /locations/[state]/[city]
 *   + /locations/[state]/[city]/[service] (the money-page grid: 648 cities × 19
 *   services ≈ 12.3k) + /blog/[slug].
 * Total ≈ 13k URLs — under the 50k per-sitemap limit — all indexable, so
 * included in full. URL shapes come from the site's own URL helpers so no slug
 * drifts or 404s. Served at /site/debt-service-ratio-loan/sitemap.xml;
 * middleware rewrites the apex /sitemap.xml here (slug is in
 * TENANTS_WITH_RICH_SITEMAP in src/middleware.ts).
 */
import type { MetadataRoute } from 'next'
import {
  services,
  cities,
  getAllStates,
  getServiceUrl,
  getStateUrl,
  getCityUrl,
  getCityServiceUrl,
} from './_lib/siteData'
import { blogPosts } from './_lib/blogPosts'

const SITE_URL = 'https://www.debtserviceratioloan.com'

type Freq = MetadataRoute.Sitemap[number]['changeFrequency']

const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: Freq }> = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/calculator', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/dscr-101', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/locations', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/speak-to-a-loan-officer', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const p of STATIC_PAGES) {
    entries.push({ url: `${SITE_URL}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority })
  }

  // Service hubs: /services/[slug]
  for (const s of services) {
    entries.push({ url: `${SITE_URL}${getServiceUrl(s)}`, lastModified, changeFrequency: 'weekly', priority: 0.8 })
  }

  // State hubs: /locations/[state]
  for (const st of getAllStates()) {
    entries.push({ url: `${SITE_URL}${getStateUrl(st.name)}`, lastModified, changeFrequency: 'weekly', priority: 0.7 })
  }

  // City hubs + city×service money pages
  for (const c of cities) {
    entries.push({ url: `${SITE_URL}${getCityUrl(c)}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
    for (const s of services) {
      entries.push({ url: `${SITE_URL}${getCityServiceUrl(c, s)}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
    }
  }

  // Blog posts: /blog/[slug]
  for (const post of blogPosts) {
    entries.push({ url: `${SITE_URL}/blog/${post.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.5 })
  }

  return entries
}
