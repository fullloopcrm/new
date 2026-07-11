/**
 * Rich sitemap for landscapinginnyc.com (slug landscaping-in-nyc).
 *
 * Replaces the generic 7-URL /api/tenant-sitemap fallback with the site's full
 * code-defined route tree, enumerated from its own _lib data:
 *   statics + /services/[slug] + /areas/[borough] + /areas/[borough]/[area]
 *   + /areas/[borough]/[area]/[service] (the money-page grid: 137 areas × 18
 *   services ≈ 2.5k) + /blog/[slug] + /careers/[borough] + /careers/[borough]/
 *   [area] + /careers/[borough]/[area]/[job] (137 areas × 8 jobs ≈ 1.1k).
 * Total ≈ 3.9k URLs — well under the 50k per-sitemap limit — all indexable, so
 * included in full. URL shapes come from the site's own URL helpers so no slug
 * drifts or 404s. Served at /site/landscaping-in-nyc/sitemap.xml; middleware
 * rewrites the apex /sitemap.xml here (slug is in TENANTS_WITH_RICH_SITEMAP in
 * src/middleware.ts).
 */
import type { MetadataRoute } from 'next'
import {
  SITE_DOMAIN,
  services,
  areas,
  getAllBoroughs,
  getServiceUrl,
  getBoroughUrl,
  getAreaUrl,
  getAreaServiceUrl,
} from './_lib/siteData'
import { blogPosts } from './_lib/blogPosts'
import { getAllJobSlugs } from './_lib/jobs'

type Freq = MetadataRoute.Sitemap[number]['changeFrequency']

const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: Freq }> = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/apply', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/areas', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/careers', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/estimate', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/get-a-free-estimate', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/landscaping-101', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const p of STATIC_PAGES) {
    entries.push({ url: `${SITE_DOMAIN}${p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority })
  }

  // Service hubs: /services/[slug]
  for (const s of services) {
    entries.push({ url: `${SITE_DOMAIN}${getServiceUrl(s)}`, lastModified, changeFrequency: 'weekly', priority: 0.8 })
  }

  // Borough hubs: /areas/[borough]
  for (const b of getAllBoroughs()) {
    entries.push({ url: `${SITE_DOMAIN}${getBoroughUrl(b.slug)}`, lastModified, changeFrequency: 'weekly', priority: 0.7 })
    entries.push({ url: `${SITE_DOMAIN}/careers/${b.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.4 })
  }

  const jobSlugs = getAllJobSlugs()

  // Area hubs + area×service money pages + area career hubs + area×job pages.
  for (const a of areas) {
    entries.push({ url: `${SITE_DOMAIN}${getAreaUrl(a)}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
    entries.push({ url: `${SITE_DOMAIN}/careers/${a.boroughSlug}/${a.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.4 })
    for (const s of services) {
      entries.push({ url: `${SITE_DOMAIN}${getAreaServiceUrl(a, s)}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
    }
    for (const jobSlug of jobSlugs) {
      entries.push({ url: `${SITE_DOMAIN}/careers/${a.boroughSlug}/${a.slug}/${jobSlug}`, lastModified, changeFrequency: 'monthly', priority: 0.4 })
    }
  }

  // Blog posts: /blog/[slug]
  for (const post of blogPosts) {
    entries.push({ url: `${SITE_DOMAIN}/blog/${post.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.5 })
  }

  return entries
}
