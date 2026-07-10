/**
 * The Florida Maid sitemap — self-contained static route list.
 *
 * NOTE: this was previously a thin wrapper over the shared multi-tenant sitemap
 * engine (@/lib/seo/tenant-seo). The 2026-07-08 template cutover removed this
 * tenant's descriptor from that registry, so the wrapper crashed at build time
 * (`TENANT_SEO['the-florida-maid']` was undefined). Restored as a self-contained
 * static sitemap so the build is not coupled to the shared registry. If the rich
 * per-URL sitemap is wanted back, re-add the descriptor at
 * src/lib/seo/tenants/the-florida-maid.ts and restore the wrapper.
 */
import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.thefloridamaid.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const paths: { path: string; priority: number }[] = [
    { path: '', priority: 1.0 },
    { path: '/book-now', priority: 0.9 },
    { path: '/florida-maid-service-services-offered-by-the-florida-maid', priority: 0.9 },
    { path: '/services', priority: 0.9 },
    { path: '/service-areas-served-by-the-florida-maid', priority: 0.8 },
    { path: '/updated-florida-maid-service-industry-pricing', priority: 0.8 },
    { path: '/contact-the-florida-maid-service-today', priority: 0.8 },
    { path: '/florida-customer-reviews-for-the-florida-maid', priority: 0.7 },
    { path: '/florida-cleaning-service-frequently-asked-questions-in-2026', priority: 0.7 },
    { path: '/about-the-florida-maid-service-company', priority: 0.6 },
    { path: '/florida-maid-service-blog', priority: 0.6 },
    { path: '/florida-maid-and-cleaning-tips-and-advice-by-the-florida-maid', priority: 0.6 },
    { path: '/available-florida-maid-jobs', priority: 0.6 },
    { path: '/careers', priority: 0.5 },
    { path: '/apply', priority: 0.5 },
    { path: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced', priority: 0.5 },
    { path: '/referral', priority: 0.4 },
    { path: '/privacy-policy', priority: 0.3 },
    { path: '/terms-conditions', priority: 0.3 },
    { path: '/refund-policy', priority: 0.3 },
    { path: '/do-not-share-policy', priority: 0.3 },
    { path: '/legal', priority: 0.3 },
  ]

  return paths.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p.priority,
  }))
}
