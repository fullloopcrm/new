/**
 * Per-tenant rich sitemap for thenycseo.com.
 *
 * Ports the standalone site's sitemap so the FL cutover preserves the indexed
 * URL set. HUB PAGES ONLY: statics + business categories + services +
 * neighborhoods + industries + industry×region. The ~54,700 service×neighborhood
 * combo pages are intentionally NOT enumerated here — they stay live and are
 * crawled via internal links (keeps crawl budget on the pages that rank and
 * avoids flooding the sitemap with near-duplicate combos).
 *
 * Served at /site/the-nyc-seo/sitemap.xml (Next.js native). Middleware rewrites
 * the apex /sitemap.xml to this path for the tenant host (see TENANTS_WITH_RICH_SITEMAP).
 */
import type { MetadataRoute } from 'next'
import {
  getAllServices,
  getAllNeighborhoods,
  getCategories,
  categoryToSlug,
  getRegions,
} from '@/app/site/the-nyc-seo/_lib/data'
import { serviceToIndustrySlug } from '@/app/site/the-nyc-seo/_lib/seo'

const BASE = 'https://www.thenycseo.com'
const LAST_MODIFIED = new Date()

export default function sitemap(): MetadataRoute.Sitemap {
  const services = getAllServices()
  const neighborhoods = getAllNeighborhoods()
  const categories = getCategories()
  const regions = getRegions()

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: LAST_MODIFIED, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/services`, lastModified: LAST_MODIFIED, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/areas`, lastModified: LAST_MODIFIED, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/businesses`, lastModified: LAST_MODIFIED, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/industries`, lastModified: LAST_MODIFIED, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/about`, lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`, lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/pricing`, lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog`, lastModified: LAST_MODIFIED, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/portfolio`, lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const servicePages: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${BASE}/${s.slug}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const businessPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE}/businesses/${categoryToSlug(c)}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const neighborhoodPages: MetadataRoute.Sitemap = neighborhoods.map((n) => ({
    url: `${BASE}/areas/${n.slug}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const industryPages: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${BASE}/industries/${serviceToIndustrySlug(s)}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const industryRegionPages: MetadataRoute.Sitemap = services.flatMap((s) =>
    regions.map((r) => ({
      url: `${BASE}/industries/${serviceToIndustrySlug(s)}/${r.toLowerCase().replace(/\s+/g, '-')}`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  )

  return [
    ...staticPages,
    ...servicePages,
    ...businessPages,
    ...neighborhoodPages,
    ...industryPages,
    ...industryRegionPages,
  ]
}
