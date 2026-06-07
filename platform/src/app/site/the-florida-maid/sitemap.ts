/**
 * Per-tenant rich sitemap for thefloridamaid.com.
 *
 * Replaces the generic 7-URL /api/tenant-sitemap (which listed ZERO job pages
 * and a wrong NYC `/available-nyc-maid-jobs` path) with a full enumeration of
 * the tenant's real route tree: statics + 11 area service pages + 579
 * neighborhood service pages + the careers page + all 579 neighborhood JOB
 * pages. Without these in the sitemap, Google for Jobs could not discover or
 * retain the postings — it had indexed only 6 of 582.
 *
 * Served at /site/the-florida-maid/sitemap.xml (Next.js native). Middleware
 * rewrites the apex /sitemap.xml to this path for the tenant host
 * (the-florida-maid is in TENANTS_WITH_RICH_SITEMAP).
 *
 * URLs use the www host to match the canonical tags emitted by the pages.
 */
import type { MetadataRoute } from 'next'
import { ALL_NEIGHBORHOODS, AREAS } from '@/app/site/the-florida-maid/_lib/seo/locations'

const BASE = 'https://www.thefloridamaid.com'

type ChangeFreq = MetadataRoute.Sitemap[number]['changeFrequency']

const STATIC_PATHS: { path: string; priority: number; changeFrequency: ChangeFreq }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/florida-maid-service-services-offered-by-the-florida-maid', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/service-areas-served-by-the-florida-maid', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/book-now', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/available-florida-maid-jobs', priority: 0.9, changeFrequency: 'daily' },
  { path: '/florida-customer-reviews-for-the-florida-maid', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/updated-florida-maid-service-industry-pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/florida-cleaning-service-frequently-asked-questions-in-2026', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about-the-florida-maid-service-company', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact-the-florida-maid-service-today', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/florida-maid-and-cleaning-tips-and-advice-by-the-florida-maid', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/florida-maid-service-blog', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms-conditions', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const urls: MetadataRoute.Sitemap = []

  // Static pages
  for (const s of STATIC_PATHS) {
    urls.push({
      url: `${BASE}${s.path === '/' ? '' : s.path}`,
      lastModified,
      changeFrequency: s.changeFrequency,
      priority: s.priority,
    })
  }

  // Area service pages — /[area.urlSlug] (11)
  for (const area of AREAS) {
    urls.push({
      url: `${BASE}/${area.urlSlug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  // Neighborhood service pages — /[neighborhood.urlSlug] (579)
  for (const n of ALL_NEIGHBORHOODS) {
    urls.push({
      url: `${BASE}/${n.urlSlug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  // Neighborhood JOB pages — /available-florida-maid-jobs/[neighborhood.slug] (579)
  for (const n of ALL_NEIGHBORHOODS) {
    urls.push({
      url: `${BASE}/available-florida-maid-jobs/${n.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  return urls
}
