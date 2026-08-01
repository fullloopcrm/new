/**
 * NYC Maid — tenant SEO descriptor for the shared sitemap engine.
 * Data-only registration: nycmaid's live /sitemap.xml route.ts keeps
 * generating its own richer (image-annotated) sitemap directly from these
 * same data modules — this descriptor exists so shared seomgr systems
 * (freshness, future indexing-API push, fleet audits) can see nycmaid's
 * URLs the same way they see every other tenant's, without duplicating or
 * regressing the live sitemap's image data.
 */
import { ALL_NEIGHBORHOODS } from '@/app/site/nycmaid/_lib/seo/locations'
import { AREAS } from '@/app/site/nycmaid/_lib/seo/data/areas'
import { SERVICES } from '@/app/site/nycmaid/_lib/seo/services'
import { registerTenantSeo, type UrlSpec } from '@/lib/seo/tenant-sitemap'

const BASE = 'https://www.thenycmaid.com'

const STATIC: { path: string; priority: number; changeFrequency: UrlSpec['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/nyc-maid-service-services-offered-by-the-nyc-maid', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/service-areas-served-by-the-nyc-maid', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/about-the-nyc-maid-service-company', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact-the-nyc-maid-service-today', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/updated-nyc-maid-service-industry-pricing', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/nyc-cleaning-service-frequently-asked-questions-in-2025', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/reviews', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/reviews/submit', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/available-nyc-maid-jobs', priority: 0.8, changeFrequency: 'daily' },
  { path: '/careers/operations-coordinator', priority: 0.8, changeFrequency: 'daily' },
  { path: '/careers/commission-sales-partner', priority: 0.8, changeFrequency: 'daily' },
  { path: '/nyc-maid-service-blog', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/service/nyc-emergency-cleaning-service', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms-conditions', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/legal', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/do-not-share-policy', priority: 0.3, changeFrequency: 'yearly' },
]

registerTenantSeo({
  slug: 'nycmaid',
  baseUrl: BASE,
  buildUrls(): UrlSpec[] {
    const out: UrlSpec[] = []
    for (const s of STATIC) {
      out.push({ loc: `${BASE}${s.path === '/' ? '' : s.path}`, priority: s.priority, changeFrequency: s.changeFrequency, kind: 'static' })
    }
    // Area location pages — /[area.urlSlug]
    for (const a of AREAS) {
      out.push({ loc: `${BASE}/${a.urlSlug}`, priority: 0.9, changeFrequency: 'weekly', kind: 'location' })
    }
    // Neighborhood location pages — /[neighborhood.urlSlug]
    for (const n of ALL_NEIGHBORHOODS) {
      out.push({ loc: `${BASE}/${n.urlSlug}`, priority: 0.8, changeFrequency: 'weekly', kind: 'location' })
    }
    // Service pages — /services/[service.urlSlug]
    for (const s of SERVICES) {
      out.push({ loc: `${BASE}/services/${s.urlSlug}`, priority: 0.8, changeFrequency: 'weekly', kind: 'service' })
    }
    // Service + location combo pages — /[neighborhood.urlSlug]/[service.slug]
    for (const n of ALL_NEIGHBORHOODS) {
      for (const s of SERVICES) {
        out.push({ loc: `${BASE}/${n.urlSlug}/${s.slug}`, priority: 0.6, changeFrequency: 'monthly', kind: 'service-location' })
      }
    }
    // Neighborhood cleaner job pages — /available-nyc-maid-jobs/[neighborhood.slug]
    for (const n of ALL_NEIGHBORHOODS) {
      out.push({ loc: `${BASE}/available-nyc-maid-jobs/${n.slug}`, priority: 0.8, changeFrequency: 'daily', kind: 'job-posting' })
    }
    // Neighborhood sales-partner job pages — /careers/commission-sales-partner/[neighborhood.slug]
    for (const n of ALL_NEIGHBORHOODS) {
      out.push({ loc: `${BASE}/careers/commission-sales-partner/${n.slug}`, priority: 0.8, changeFrequency: 'daily', kind: 'job-posting' })
    }
    return out
  },
})
