/**
 * Shared URL builder for the "tow / roadside / home-services" family of bespoke
 * sites. These sites were forked from one template and share the same route
 * tree and _data shapes (SERVICES, STATES{cities}, CUSTOMER_TYPES, BLOG_POSTS),
 * so one builder enumerates all of them — each descriptor just passes its own
 * base URL, its own static route list, and its own data.
 *
 * Tiering: we emit every hand-built static page plus the enumerable dynamic
 * tiers (service pages, blog posts, customer-type hubs, state + city location
 * and careers pages). We DELIBERATELY OMIT the deep combinatorial tiers
 * (locations/[state]/[city]/[service] and who-we-serve/[type]/[state]/[city]):
 * states×cities×services runs into the hundreds of thousands and would blow the
 * 50k-URL sitemap limit. Those pages stay link-crawlable from the city and
 * who-we-serve hubs — same tradeoff the We-Pay-You-Junk sitemap already makes.
 * Every slug here comes straight from the site's own data, so no URL 404s.
 */
import type { UrlSpec, ChangeFreq } from '../tenant-sitemap'

interface HasSlug {
  slug: string
}
interface StateLike {
  slug: string
  cities: HasSlug[]
}

export interface TowStaticPath {
  path: string
  priority: number
  changeFrequency: ChangeFreq
}

export interface TowFamilyData {
  services: readonly HasSlug[]
  states: readonly StateLike[]
  customerTypes: readonly HasSlug[]
  blogPosts: readonly HasSlug[]
}

export interface TowFamilyOptions {
  /** Sites with a /services/[slug]/tips route (nyc-tow, nycroadside...). */
  serviceTips?: boolean
}

export function buildTowFamilyUrls(
  baseUrl: string,
  statics: readonly TowStaticPath[],
  data: TowFamilyData,
  opts: TowFamilyOptions = {},
): UrlSpec[] {
  const base = baseUrl.replace(/\/+$/, '')
  const urls: UrlSpec[] = []
  const push = (path: string, priority: number, changeFrequency: ChangeFreq) => {
    urls.push({ loc: `${base}${path === '/' ? '' : path}`, priority, changeFrequency })
  }

  for (const s of statics) push(s.path, s.priority, s.changeFrequency)

  for (const svc of data.services) {
    push(`/services/${svc.slug}`, 0.8, 'weekly')
    if (opts.serviceTips) push(`/services/${svc.slug}/tips`, 0.5, 'monthly')
  }

  for (const post of data.blogPosts) push(`/blog/${post.slug}`, 0.5, 'monthly')

  for (const ct of data.customerTypes) push(`/who-we-serve/${ct.slug}`, 0.6, 'monthly')

  for (const st of data.states) {
    push(`/locations/${st.slug}`, 0.7, 'weekly')
    push(`/careers/${st.slug}`, 0.5, 'monthly')
    for (const city of st.cities) {
      push(`/locations/${st.slug}/${city.slug}`, 0.6, 'monthly')
      push(`/careers/${st.slug}/${city.slug}`, 0.4, 'monthly')
    }
  }

  return urls
}
