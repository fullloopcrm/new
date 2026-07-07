/**
 * The Roadside Helper (theroadsidehelper.com) — tenant SEO descriptor.
 * National /locations/[state]/[city]/[service] tree (same pattern as HSC).
 * getCityBySlug + SERVICES.find validate against these sources → URLs render 200.
 */
import { STATES } from '@/app/site/theroadsidehelper/_data/cities'
import { SERVICES } from '@/app/site/theroadsidehelper/_data/services'
import { CUSTOMER_TYPES } from '@/app/site/theroadsidehelper/_data/customer-types'
import { registerTenantSeo, type UrlSpec } from '@/lib/seo/tenant-sitemap'

const BASE = 'https://www.theroadsidehelper.com'

const STATIC: { path: string; priority: number; changeFrequency: UrlSpec['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/locations', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/who-we-serve', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/commercial', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/careers', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/franchise', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
]

registerTenantSeo({
  slug: 'theroadsidehelper',
  baseUrl: BASE,
  buildUrls(): UrlSpec[] {
    const out: UrlSpec[] = []
    for (const s of STATIC) {
      out.push({ loc: `${BASE}${s.path === '/' ? '' : s.path}`, priority: s.priority, changeFrequency: s.changeFrequency })
    }
    for (const svc of SERVICES) {
      out.push({ loc: `${BASE}/services/${svc.slug}`, priority: 0.7, changeFrequency: 'weekly' })
    }
    for (const ct of CUSTOMER_TYPES) {
      out.push({ loc: `${BASE}/who-we-serve/${ct.slug}`, priority: 0.7, changeFrequency: 'weekly' })
    }
    for (const state of STATES) {
      out.push({ loc: `${BASE}/locations/${state.slug}`, priority: 0.7, changeFrequency: 'weekly' })
      for (const city of state.cities) {
        out.push({ loc: `${BASE}/locations/${state.slug}/${city.slug}`, priority: 0.6, changeFrequency: 'weekly' })
        for (const svc of SERVICES) {
          out.push({ loc: `${BASE}/locations/${state.slug}/${city.slug}/${svc.slug}`, priority: 0.5, changeFrequency: 'monthly' })
        }
      }
    }
    return out
  },
})
