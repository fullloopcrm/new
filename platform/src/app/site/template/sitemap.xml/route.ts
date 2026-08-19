import { BLOG_POSTS } from '@/app/site/template/_lib/seo/blog-data'
import { pickLifestylePhoto, pickTeamPhoto } from '@/app/site/template/_lib/seo/photos'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { getTenantFromHeaders, getTenantServices } from '@/lib/tenant-site'
import { VA_SERVICES } from '@/app/site/template/_data/va-services'
import { ALL_LOCATIONS } from '@/app/site/template/_data/us-locations'
import { blogPosts } from '@/app/site/template/_lib/content/longform'
import { resolveCoverage, SITEMAP_AREA_LIMIT } from '@/lib/geo/coverage'

// Reads the tenant from request headers (getSiteConfig) to emit their real
// domain, so it must render dynamically — a static route reading headers() 500s
// ("static to dynamic at runtime"). See [slug]/page.tsx for the same fix.
export const dynamic = 'force-dynamic'

export async function GET() {
  const config = await getSiteConfig()
  const BASE_URL = config.identity.url.replace(/\/+$/, '')
  const absoluteImageUrl = (path: string): string => `${BASE_URL}${path}`
  const now = new Date().toISOString()

  // Virtual-assistant tenants get a national VA sitemap (services + geo hubs).
  // The 1,500 geo×service combos are noindex, so they are intentionally excluded.
  if (industryProfile(config.industry).isVirtualAssistant) {
    const vaUrls: { loc: string; pri: string; freq: string }[] = [
      { loc: BASE_URL, pri: '1.0', freq: 'weekly' },
      { loc: `${BASE_URL}/virtual-assistant-services`, pri: '0.9', freq: 'weekly' },
      ...VA_SERVICES.map((s) => ({ loc: `${BASE_URL}/virtual-assistant-services/${s.slug}`, pri: '0.8', freq: 'weekly' })),
      ...ALL_LOCATIONS.map((l) => ({ loc: `${BASE_URL}/virtual-assistant/${l.slug}`, pri: '0.7', freq: 'weekly' })),
    ]
    const vaXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${vaUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`
    return new Response(vaXml, {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    })
  }

  // Non-cleaning, non-VA (generic) tenants get a sitemap of the config-driven
  // long-form routes — NOT the NYC-Maid cleaning slugs / NYC geo pages below,
  // which don't exist for them. Keeps their sitemap accurate + indexable.
  if (!industryProfile(config.industry).isCleaning) {
    const genUrls: { loc: string; pri: string; freq: string }[] = [
      { loc: BASE_URL, pri: '1.0', freq: 'weekly' },
      { loc: `${BASE_URL}/about`, pri: '0.8', freq: 'monthly' },
      { loc: `${BASE_URL}/services`, pri: '0.9', freq: 'weekly' },
      { loc: `${BASE_URL}/pricing`, pri: '0.9', freq: 'weekly' },
      { loc: `${BASE_URL}/reviews`, pri: '0.8', freq: 'weekly' },
      { loc: `${BASE_URL}/faq`, pri: '0.7', freq: 'monthly' },
      { loc: `${BASE_URL}/contact`, pri: '0.8', freq: 'monthly' },
      { loc: `${BASE_URL}/careers`, pri: '0.7', freq: 'weekly' },
      { loc: `${BASE_URL}/referral-program`, pri: '0.5', freq: 'monthly' },
      { loc: `${BASE_URL}/blog`, pri: '0.7', freq: 'weekly' },
      ...blogPosts(config).map((p) => ({ loc: `${BASE_URL}/blog/${p.slug}`, pri: '0.7', freq: 'monthly' })),
      { loc: `${BASE_URL}/privacy-policy`, pri: '0.3', freq: 'yearly' },
      { loc: `${BASE_URL}/terms-conditions`, pri: '0.3', freq: 'yearly' },
      { loc: `${BASE_URL}/legal`, pri: '0.3', freq: 'yearly' },
      { loc: `${BASE_URL}/refund-policy`, pri: '0.3', freq: 'yearly' },
      { loc: `${BASE_URL}/do-not-share-policy`, pri: '0.3', freq: 'yearly' },
    ]

    // Storefront tenants (e.g. streetwear) additionally get /shop and one
    // entry per active, priced product — the generic branch above has no
    // e-commerce awareness otherwise, so these URLs were previously missing
    // from the sitemap entirely.
    if (config.storefrontEnabled) {
      genUrls.push({ loc: `${BASE_URL}/shop`, pri: '0.9', freq: 'daily' })
      const tenant = await getTenantFromHeaders()
      if (tenant) {
        const products = await getTenantServices(tenant.id)
        for (const p of products) {
          if (p.item_type === 'product' && p.active && (p.price_cents || 0) > 0) {
            genUrls.push({ loc: `${BASE_URL}/shop/${p.id}`, pri: '0.7', freq: 'weekly' })
          }
        }
      }
    }

    const genXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${genUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`
    return new Response(genXml, {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    })
  }

  interface ImageEntry { loc: string; title?: string; caption?: string }
  const urls: { loc: string; lastmod: string; changefreq: string; priority: string; images?: ImageEntry[] }[] = []

  // Tenant's real service area (resolveCoverage), not the static NYC dataset
  // below — this is what actually powers /areas/[location] + /careers/[location]
  // for every cleaning tenant on the template, including ones nowhere near NYC.
  const tenant = await getTenantFromHeaders()
  const radiusMiles = typeof tenant?.service_radius_miles === 'number' ? tenant.service_radius_miles : 25
  const coverage = tenant
    ? await resolveCoverage({
        lat: tenant.service_area_lat as number | null,
        lng: tenant.service_area_lng as number | null,
        address: tenant.address as string | null,
        radiusMiles,
      })
    : { areas: [] as { urlSlug: string; slug: string; name: string }[] }
  const indexableAreas = coverage.areas.slice(0, SITEMAP_AREA_LIMIT)

  // Homepage
  const homepagePhoto = pickLifestylePhoto('homepage')
  urls.push({
    loc: BASE_URL,
    lastmod: now,
    changefreq: 'weekly',
    priority: '1.0',
    images: [
      { loc: absoluteImageUrl(homepagePhoto.src), title: homepagePhoto.alt, caption: homepagePhoto.caption },
      { loc: `${BASE_URL}/icon-512.png`, title: 'Your Business — Logo' },
    ],
  })

  // Static pages
  const staticPages = [
    { path: '/services', freq: 'weekly', pri: '0.9' },
    { path: '/service-areas', freq: 'weekly', pri: '0.9' },
    { path: '/about', freq: 'monthly', pri: '0.7' },
    { path: '/contact', freq: 'monthly', pri: '0.8' },
    { path: '/pricing', freq: 'weekly', pri: '0.9' },
    { path: '/faq', freq: 'monthly', pri: '0.8' },
    { path: '/reviews', freq: 'weekly', pri: '0.8' },
    { path: '/reviews/submit', freq: 'monthly', pri: '0.7' },
    { path: '/careers', freq: 'daily', pri: '0.8' },
    { path: '/careers/operations-coordinator', freq: 'daily', pri: '0.8' },
    { path: '/blog', freq: 'weekly', pri: '0.7' },
    { path: '/blog', freq: 'weekly', pri: '0.7' },
    { path: '/service/nyc-emergency-cleaning-service', freq: 'monthly', pri: '0.7' },
    { path: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced', freq: 'monthly', pri: '0.5' },
    { path: '/privacy-policy', freq: 'yearly', pri: '0.3' },
    { path: '/terms-conditions', freq: 'yearly', pri: '0.3' },
    { path: '/legal', freq: 'yearly', pri: '0.3' },
    { path: '/refund-policy', freq: 'yearly', pri: '0.3' },
    { path: '/do-not-share-policy', freq: 'yearly', pri: '0.3' },
  ]
  for (const p of staticPages) {
    urls.push({ loc: `${BASE_URL}${p.path}`, lastmod: now, changefreq: p.freq, priority: p.pri })
  }

  // Area pages — this tenant's own resolveCoverage() result, nearest first,
  // capped at SITEMAP_AREA_LIMIT. Areas beyond the cap still render (see
  // /areas/[location]/page.tsx) but are marked noindex there, so they're
  // deliberately left out of the sitemap rather than submitted unfinished.
  for (const area of indexableAreas) {
    const photo = pickLifestylePhoto(area.urlSlug)
    urls.push({
      loc: `${BASE_URL}/areas/${area.urlSlug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.9',
      images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — ${area.name}`, caption: `${photo.caption} — ${area.name} cleaning` }],
    })
  }

  // Service pages — this tenant's actual configured services, not the static
  // nycmaid-era SERVICES list (which may not match what they offer/charge).
  for (const service of config.services) {
    const serviceSlug = service.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const photo = pickLifestylePhoto(serviceSlug)
    urls.push({
      loc: `${BASE_URL}/services/${serviceSlug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.8',
      images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — ${service.label}`, caption: `${photo.caption} — ${service.label}` }],
    })
  }

  // Blog posts
  for (const post of BLOG_POSTS) {
    const photo = pickLifestylePhoto(post.slug)
    urls.push({
      loc: `${BASE_URL}/blog/${post.slug}`,
      lastmod: post.date,
      changefreq: 'monthly',
      priority: '0.7',
      images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — ${post.title}`, caption: photo.caption }],
    })
  }

  // Area job pages — same coverage + cap as the area pages above.
  for (const area of indexableAreas) {
    const photo = pickTeamPhoto(area.urlSlug)
    urls.push({
      loc: `${BASE_URL}/careers/${area.urlSlug}`,
      lastmod: now,
      changefreq: 'daily',
      priority: '0.8',
      images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — hiring in ${area.name}`, caption: `Now hiring in ${area.name}` }],
    })
  }

  // Area x service combo pages are intentionally NOT in the sitemap — they
  // have no content-generation path yet (see areas/[location]/[service]/page.tsx)
  // and are marked noindex there. Same containment as the VA tenant combos.

  const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.images ? u.images.map(img => `
    <image:image>
      <image:loc>${xmlEscape(img.loc)}</image:loc>${img.title ? `
      <image:title>${xmlEscape(img.title)}</image:title>` : ''}${img.caption ? `
      <image:caption>${xmlEscape(img.caption)}</image:caption>` : ''}
    </image:image>`).join('') : ''}
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
