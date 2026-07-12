/**
 * Rich sitemap for washandfoldnyc.com (slug wash-and-fold-nyc).
 *
 * Replaces the generic 7-URL /api/tenant-sitemap fallback with the site's full
 * public marketing route tree, enumerated from its own _lib/seo data. (The
 * marketing pages live under the (marketing) route group, so the parenthesized
 * segment does not appear in the URL.)
 *   statics
 *   + /[urlSlug] area/neighborhood hubs (getAllUrlSlugs ≈ 193)
 *   + /[neighborhood.urlSlug]/[service.slug] money-page grid (189 neighborhoods
 *     × 9 services ≈ 1.7k — indexable here, no robots.noindex)
 *   + /services/[service.urlSlug] (9)
 *   + /boroughs/[area.slug] (4)
 *   + /careers/[neighborhood.slug] (189)
 *   + /partners/[neighborhood.slug] (189)
 *   + /buildings/[type] (3 hardcoded building-program types).
 * Total ≈ 2.3k URLs — well under the 50k per-sitemap limit — all indexable, so
 * included in full. Slug fields mirror each route's own lookup (urlSlug vs slug)
 * so no 404s. Excludes the (app) customer/team funnel (/book, /apply, /team,
 * /referral) — that is the transactional app, not the SEO surface.
 *
 * Served at /site/wash-and-fold-nyc/sitemap.xml; middleware rewrites the apex
 * /sitemap.xml here (slug is in TENANTS_WITH_RICH_SITEMAP in src/middleware.ts).
 */
import type { MetadataRoute } from 'next'
import { SERVICES, getAllServiceUrlSlugs } from './_lib/seo/services'
import { ALL_NEIGHBORHOODS, AREAS, getAllUrlSlugs } from './_lib/seo/locations'

const SITE_URL = 'https://www.washandfoldnyc.com'

type Freq = MetadataRoute.Sitemap[number]['changeFrequency']

// Hardcoded building-program types — the source page (buildings/[slug]) keys its
// BUILDING_DATA object on exactly these three slugs (no data-module export).
const BUILDING_TYPES = ['luxury-buildings', 'doorman-buildings', 'student-housing']

const STATIC_PAGES: Array<{ path: string; priority: number; changeFrequency: Freq }> = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/buildings', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/careers', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/do-not-share-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/legal', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/locations', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/partners', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/reviews', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/terms-conditions', priority: 0.3, changeFrequency: 'yearly' },
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

  // Building-program hubs: /buildings/[type]
  for (const type of BUILDING_TYPES) {
    entries.push({ url: `${SITE_URL}/buildings/${type}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
  }

  // Borough hubs: /boroughs/[area.slug]
  for (const a of AREAS) {
    entries.push({ url: `${SITE_URL}/boroughs/${a.slug}`, lastModified, changeFrequency: 'weekly', priority: 0.7 })
  }

  // Area + neighborhood top-level hubs: /[urlSlug]
  for (const slug of getAllUrlSlugs()) {
    entries.push({ url: `${SITE_URL}/${slug}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
  }

  // Neighborhood-scoped pages: money grid + careers + partners.
  for (const n of ALL_NEIGHBORHOODS) {
    entries.push({ url: `${SITE_URL}/careers/${n.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.4 })
    entries.push({ url: `${SITE_URL}/partners/${n.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.4 })
    for (const s of SERVICES) {
      entries.push({ url: `${SITE_URL}/${n.urlSlug}/${s.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.6 })
    }
  }

  return entries
}
