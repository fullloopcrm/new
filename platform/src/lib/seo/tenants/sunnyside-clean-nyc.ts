/**
 * Sunnyside Clean NYC — tenant SEO descriptor for the shared sitemap engine.
 * Registered into TENANT_SEO so /api/tenant-sitemap (which the middleware
 * rewrites cleaningservicesunnysideny.com/sitemap.xml to) emits the full
 * code-defined URL set instead of the thin DB fallback.
 *
 * Every URL below maps to a real Sunnyside route:
 *   /services/[urlSlug]            <- SERVICES (getServiceByUrlSlug)
 *   /service-areas/[urlSlug]       <- AREAS + ALL_NEIGHBORHOODS (getArea/NeighborhoodByUrlSlug)
 *   /service-locations/[urlSlug]   <- AREAS + ALL_NEIGHBORHOODS
 *   /cleaning-tips-and-tricks/[slug] <- BLOG_POSTS (getBlogPost)
 */
import { AREAS } from '@/app/site/sunnyside-clean-nyc/_lib/seo/data/areas'
import { ALL_NEIGHBORHOODS } from '@/app/site/sunnyside-clean-nyc/_lib/seo/locations'
import { SERVICES } from '@/app/site/sunnyside-clean-nyc/_lib/seo/services'
import { BLOG_POSTS } from '@/app/site/sunnyside-clean-nyc/_lib/seo/blog-data'
import { registerTenantSeo, type UrlSpec } from '@/lib/seo/tenant-sitemap'

const BASE = 'https://www.cleaningservicesunnysideny.com'

const STATIC: { path: string; priority: number; changeFrequency: UrlSpec['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/nyc-cleaning-services-offered', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/nyc-cleaning-service-pricing', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/service-areas', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/about-nyc-cleaning-service-sunnyside-clean-nyc', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact-nyc-cleaning-service-sunnyside-clean-nyc', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/frequently-asked-cleaning-service-related-questions', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/cleaning-tips-and-tricks', priority: 0.7, changeFrequency: 'weekly' },
]

registerTenantSeo({
  slug: 'sunnyside-clean-nyc',
  baseUrl: BASE,
  buildUrls(): UrlSpec[] {
    const out: UrlSpec[] = []

    for (const s of STATIC) {
      out.push({ loc: `${BASE}${s.path === '/' ? '' : s.path}`, priority: s.priority, changeFrequency: s.changeFrequency })
    }

    // Service pages — /services/[urlSlug]
    for (const svc of SERVICES) {
      out.push({ loc: `${BASE}/services/${svc.urlSlug}`, priority: 0.8, changeFrequency: 'weekly' })
    }

    // Borough + neighborhood pages — /service-areas/[urlSlug]
    for (const a of AREAS) {
      out.push({ loc: `${BASE}/service-areas/${a.urlSlug}`, priority: 0.8, changeFrequency: 'weekly' })
    }
    for (const n of ALL_NEIGHBORHOODS) {
      out.push({ loc: `${BASE}/service-areas/${n.urlSlug}`, priority: 0.7, changeFrequency: 'weekly' })
    }

    // /service-locations/[urlSlug] pages are duplicate presentations of the
    // /service-areas/ pages above and now canonical to them — excluded from the
    // sitemap so only the canonical URL is advertised.

    // Blog posts — /cleaning-tips-and-tricks/[slug]
    for (const p of BLOG_POSTS) {
      out.push({ loc: `${BASE}/cleaning-tips-and-tricks/${p.slug}`, priority: 0.6, changeFrequency: 'monthly' })
    }

    return out
  },
})
