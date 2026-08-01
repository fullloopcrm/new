/**
 * The Florida Maid — tenant SEO descriptor for the shared sitemap engine.
 * Pulls from the tenant's own data modules. Covers all four page families
 * every tenant site has: service, location, service+location, job-posting.
 */
import { ALL_NEIGHBORHOODS, AREAS } from '@/app/site/the-florida-maid/_lib/seo/locations'
import { SERVICES } from '@/app/site/the-florida-maid/_lib/seo/services'
import { registerTenantSeo, type UrlSpec } from '@/lib/seo/tenant-sitemap'

const BASE = 'https://www.thefloridamaid.com'

const STATIC: { path: string; priority: number; changeFrequency: UrlSpec['changeFrequency'] }[] = [
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
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/careers', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/apply', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/referral', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms-conditions', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/do-not-share-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/legal', priority: 0.3, changeFrequency: 'yearly' },
]

registerTenantSeo({
  slug: 'the-florida-maid',
  baseUrl: BASE,
  buildUrls(): UrlSpec[] {
    const out: UrlSpec[] = []
    for (const s of STATIC) {
      out.push({ loc: `${BASE}${s.path === '/' ? '' : s.path}`, priority: s.priority, changeFrequency: s.changeFrequency, kind: 'static' })
    }
    // Area location pages — /[area.urlSlug] (11)
    for (const a of AREAS) {
      out.push({ loc: `${BASE}/${a.urlSlug}`, priority: 0.8, changeFrequency: 'weekly', kind: 'location' })
    }
    // Neighborhood location pages — /[neighborhood.urlSlug]
    for (const n of ALL_NEIGHBORHOODS) {
      out.push({ loc: `${BASE}/${n.urlSlug}`, priority: 0.7, changeFrequency: 'weekly', kind: 'location' })
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
    // Neighborhood JOB pages — /available-florida-maid-jobs/[neighborhood.slug]
    for (const n of ALL_NEIGHBORHOODS) {
      out.push({ loc: `${BASE}/available-florida-maid-jobs/${n.slug}`, priority: 0.7, changeFrequency: 'weekly', kind: 'job-posting' })
    }
    return out
  },
})
