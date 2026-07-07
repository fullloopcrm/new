/**
 * The Home Services Company — tenant SEO descriptor for the shared sitemap engine.
 *
 * Fixes the mass-deindex: this national programmatic site (/locations/[state]/
 * [city]/[service]) had ~41k pages but its live /sitemap.xml listed only ~12
 * static URLs (it fell through to the generic /api/tenant-sitemap fallback and
 * was never registered here, and its scaffolded sitemap-index pointed at 404
 * chunk routes). Google discovered the location pages once, found them
 * unlisted + thin, and dropped them. Registering the real URL tree here makes
 * the fallback emit every location page so they can be re-crawled.
 *
 * Pulls from the tenant's own data modules so the sitemap stays in lockstep
 * with what the routes actually render (getStateBySlug / getCityBySlug /
 * SERVICES all validate against these same sources).
 */
import { STATES } from '@/app/site/the-home-services-company/_data/cities'
import { SERVICES } from '@/app/site/the-home-services-company/_data/services'
import { registerTenantSeo, type UrlSpec } from '@/lib/seo/tenant-sitemap'

const BASE = 'https://www.thehomeservicescompany.com'

// Confirmed 200 top-level routes (each has a page.tsx).
const STATIC: { path: string; priority: number; changeFrequency: UrlSpec['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/locations', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/commercial', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/who-we-serve', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/book', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/careers', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/apply', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/franchise', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/partnerships', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
]

registerTenantSeo({
  slug: 'the-home-services-company',
  baseUrl: BASE,
  buildUrls(): UrlSpec[] {
    const out: UrlSpec[] = []

    for (const s of STATIC) {
      out.push({ loc: `${BASE}${s.path === '/' ? '' : s.path}`, priority: s.priority, changeFrequency: s.changeFrequency })
    }

    // /services/[slug] — one page per service (40)
    for (const svc of SERVICES) {
      out.push({ loc: `${BASE}/services/${svc.slug}`, priority: 0.7, changeFrequency: 'weekly' })
    }

    // /locations/[state] (51) + /locations/[state]/[city] (~990)
    // + /locations/[state]/[city]/[service] (~39.6k). getCityBySlug + SERVICES
    // validate against these exact sources, so every emitted URL renders 200.
    for (const state of STATES) {
      out.push({ loc: `${BASE}/locations/${state.slug}`, priority: 0.7, changeFrequency: 'weekly' })
      for (const city of state.cities) {
        out.push({ loc: `${BASE}/locations/${state.slug}/${city.slug}`, priority: 0.6, changeFrequency: 'weekly' })
        for (const svc of SERVICES) {
          out.push({
            loc: `${BASE}/locations/${state.slug}/${city.slug}/${svc.slug}`,
            priority: 0.5,
            changeFrequency: 'monthly',
          })
        }
      }
    }

    return out
  },
})
