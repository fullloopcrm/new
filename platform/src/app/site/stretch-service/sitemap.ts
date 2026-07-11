/**
 * Rich sitemap for stretchservice.com (slug stretch-service).
 *
 * Replaces the generic 7-URL /api/tenant-sitemap fallback with the site's full
 * code-defined route tree, enumerated from its own _lib data (nationwide):
 *   statics (incl. the 7 hand-built /stretching-101/* guides)
 *   + /services/[slug]
 *   + /locations/[state] + /locations/[state]/[city]
 *     + /locations/[state]/[city]/[service] (money-page grid: 902 cities × 11
 *       services ≈ 9.9k)
 *   + /corporate-wellness/[state] + /corporate-wellness/[state]/[city]
 *   + the /jobs tree: /jobs/[state], /jobs/[state]/[city], /jobs/service/[slug],
 *     /jobs/specialty/[slug]
 *   + /parks/[slug] (475 parks + beaches).
 * Total ≈ 14k URLs — under the 50k per-sitemap limit — all indexable, so
 * included in full. URL shapes come from the site's own URL helpers (and the
 * corporate-wellness/jobs canonical patterns) so no slug drifts or 404s. This
 * site has no /blog/[slug] route — /blog is an index page only. Served at
 * /site/stretch-service/sitemap.xml; middleware rewrites the apex /sitemap.xml
 * here (slug is in TENANTS_WITH_RICH_SITEMAP in src/middleware.ts).
 */
import type { MetadataRoute } from 'next'
import {
  SITE_URL,
  services,
  states,
  cities,
  clientTypes,
  parks,
  getServiceUrl,
  getStateUrl,
  getCityUrl,
  getCityServiceUrl,
  getParkUrl,
} from './_lib/siteData'

type Freq = MetadataRoute.Sitemap[number]['changeFrequency']

const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: Freq }> = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/careers', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/corporate-wellness', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/discounts', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/hotel-stretching', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/jobs', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/legal', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/locations', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/parks', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/stretching-101', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/stretching-101/complete-wellness-guide', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/stretching-101/daily-stretching-routine', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/stretching-101/stretching-for-athletes', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/stretching-101/stretching-for-back-pain', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/stretching-101/stretching-for-desk-workers', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/stretching-101/stretching-for-seniors', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/stretching-101/tips', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const p of STATIC_PAGES) {
    entries.push({ url: `${SITE_URL}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority })
  }

  // Service hubs: /services/[slug]  +  /jobs/service/[slug]
  for (const s of services) {
    entries.push({ url: `${SITE_URL}${getServiceUrl(s)}`, lastModified, changeFrequency: 'weekly', priority: 0.8 })
    entries.push({ url: `${SITE_URL}/jobs/service/${s.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.4 })
  }

  // Specialty (client-type) job pages: /jobs/specialty/[slug]
  for (const ct of clientTypes) {
    entries.push({ url: `${SITE_URL}/jobs/specialty/${ct.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.4 })
  }

  // State hubs: /locations/[state] + /corporate-wellness/[state] + /jobs/[state]
  for (const st of states) {
    entries.push({ url: `${SITE_URL}${getStateUrl(st)}`, lastModified, changeFrequency: 'weekly', priority: 0.7 })
    entries.push({ url: `${SITE_URL}/corporate-wellness/${st.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.5 })
    entries.push({ url: `${SITE_URL}/jobs/${st.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.4 })
  }

  // City hubs + city×service money pages + corporate-wellness + city job pages.
  for (const c of cities) {
    entries.push({ url: `${SITE_URL}${getCityUrl(c)}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
    entries.push({ url: `${SITE_URL}/corporate-wellness/${c.stateSlug}/${c.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.5 })
    entries.push({ url: `${SITE_URL}/jobs/${c.stateSlug}/${c.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.4 })
    for (const s of services) {
      entries.push({ url: `${SITE_URL}${getCityServiceUrl(c, s)}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
    }
  }

  // Parks & tourist spots: /parks/[slug]
  for (const p of parks) {
    entries.push({ url: `${SITE_URL}${getParkUrl(p)}`, lastModified, changeFrequency: 'monthly', priority: 0.5 })
  }

  return entries
}
