/**
 * Per-tenant rich sitemap for thenycexterminator.com.
 *
 * Replaces the generic 7-URL /api/tenant-sitemap with a full enumeration of
 * the tenant's actual route tree (statics + dynamic service × neighborhood
 * combinations + areas + careers + tips). Preserves the indexed URL set
 * from the pre-cutover standalone site so DNS flip doesn't bleed SEO.
 *
 * Served at /site/the-nyc-exterminator/sitemap.xml (Next.js native). Middleware
 * must rewrite the apex /sitemap.xml to this path for the tenant host.
 */
import type { MetadataRoute } from 'next'
import servicesData from '@/app/site/the-nyc-exterminator/_data/services.json'
import neighborhoodsData from '@/app/site/the-nyc-exterminator/_data/neighborhoods.json'
import { tips } from '@/app/site/the-nyc-exterminator/_data/tips'

const BASE = 'https://thenycexterminator.com'

const STATIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/areas', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/book-exterminator-today', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/careers', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/pest-control-tips', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/quote-request', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/reviews', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/schedule-service', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'weekly' },
]

// Careers pages are one per neighborhood: /careers/{neighborhood}-exterminator-jobs
// (matches the standalone site's 318 indexed careers URLs). These are NOT job
// titles — the route's parseSlug() requires the -exterminator-jobs suffix, so
// listing job titles here produced 404s AND omitted every real careers URL.
const CAREER_SLUGS = (neighborhoodsData as { slug: string }[]).map(
  (n) => `${n.slug}-exterminator-jobs`,
)

interface ServiceRow { slug: string }
interface NeighborhoodRow { slug: string }
interface TipRow { slug: string }

export default function sitemap(): MetadataRoute.Sitemap {
  const services = servicesData as ServiceRow[]
  const neighborhoods = neighborhoodsData as NeighborhoodRow[]
  const tipRows = tips as TipRow[]

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

  // /[service] — service index pages (32)
  for (const svc of services) {
    urls.push({
      url: `${BASE}/${svc.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  // /[service]/[neighborhood] — combo pages (32 × 318 = 10,176)
  for (const svc of services) {
    for (const n of neighborhoods) {
      urls.push({
        url: `${BASE}/${svc.slug}/${n.slug}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  }

  // /areas/[neighborhood] — area pages (318)
  for (const n of neighborhoods) {
    urls.push({
      url: `${BASE}/areas/${n.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  // /careers/[slug]
  for (const cs of CAREER_SLUGS) {
    urls.push({
      url: `${BASE}/careers/${cs}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  // /pest-control-tips/[slug]
  for (const tip of tipRows) {
    urls.push({
      url: `${BASE}/pest-control-tips/${tip.slug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  return urls
}
