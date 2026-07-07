/**
 * NYC Roadside Emergency Assistance (nycroadsideemergencyassistance.com) —
 * tenant SEO descriptor. Enumerates locations/services/who-we-serve plus the
 * roadway pages (streets/tunnels/bridges/highways). Validators (getCityBySlug /
 * SERVICES.find / roadway .slug) match these sources → URLs render 200.
 */
import { STATES } from '@/app/site/nycroadsideemergencyassistance/_data/cities'
import { SERVICES } from '@/app/site/nycroadsideemergencyassistance/_data/services'
import { CUSTOMER_TYPES } from '@/app/site/nycroadsideemergencyassistance/_data/customer-types'
import { STREETS } from '@/app/site/nycroadsideemergencyassistance/_data/streets'
import { TUNNELS } from '@/app/site/nycroadsideemergencyassistance/_data/tunnels'
import { BRIDGES } from '@/app/site/nycroadsideemergencyassistance/_data/bridges'
import { HIGHWAYS } from '@/app/site/nycroadsideemergencyassistance/_data/highways'
import { registerTenantSeo, type UrlSpec } from '@/lib/seo/tenant-sitemap'

const BASE = 'https://www.nycroadsideemergencyassistance.com'

const STATIC: { path: string; priority: number; changeFrequency: UrlSpec['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/locations', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/who-we-serve', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/streets', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/tunnels', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/bridges', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/highways', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/commercial', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/careers', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/franchise', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
]

registerTenantSeo({
  slug: 'nycroadsideemergencyassistance',
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
    for (const [seg, list] of [['streets', STREETS], ['tunnels', TUNNELS], ['bridges', BRIDGES], ['highways', HIGHWAYS]] as const) {
      for (const r of list) {
        out.push({ loc: `${BASE}/${seg}/${r.slug}`, priority: 0.6, changeFrequency: 'monthly' })
      }
    }
    for (const state of STATES) {
      out.push({ loc: `${BASE}/locations/${state.slug}`, priority: 0.7, changeFrequency: 'weekly' })
      for (const city of state.cities) {
        out.push({ loc: `${BASE}/locations/${state.slug}/${city.slug}`, priority: 0.6, changeFrequency: 'weekly' })
      }
    }
    return out
  },
})
