import { ALL_NEIGHBORHOODS } from '@/app/site/template/_lib/seo/locations'
import { AREAS } from '@/app/site/template/_lib/seo/data/areas'
import { SERVICES } from '@/app/site/template/_lib/seo/services'
import { BLOG_POSTS } from '@/app/site/template/_lib/seo/blog-data'
import { pickLifestylePhoto, pickTeamPhoto, pickPhotoByCategory, type PhotoCategory } from '@/app/site/template/_lib/seo/photos'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { VA_SERVICES } from '@/app/site/template/_data/va-services'
import { ALL_LOCATIONS } from '@/app/site/template/_data/us-locations'

// Reads the tenant from request headers (getSiteConfig) to emit their real
// domain, so it must render dynamically — a static route reading headers() 500s
// ("static to dynamic at runtime"). See [slug]/page.tsx for the same fix.
export const dynamic = 'force-dynamic'

const SERVICE_PHOTO_CATEGORY: Record<string, PhotoCategory> = {
  'deep-cleaning': 'kitchen',
  'regular-cleaning': 'mop',
  'weekly-cleaning': 'mop',
  'bi-weekly-cleaning': 'dust',
  'monthly-cleaning': 'mop',
  'move-in-move-out-cleaning': 'team',
  'post-renovation-cleaning': 'team',
  'same-day-cleaning': 'vacuum',
  'airbnb-cleaning': 'bed',
  'office-cleaning': 'team',
}

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

  interface ImageEntry { loc: string; title?: string; caption?: string }
  const urls: { loc: string; lastmod: string; changefreq: string; priority: string; images?: ImageEntry[] }[] = []

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
    { path: '/nyc-maid-service-services-offered-by-the-nyc-maid', freq: 'weekly', pri: '0.9' },
    { path: '/service-areas-served-by-the-nyc-maid', freq: 'weekly', pri: '0.9' },
    { path: '/about-the-nyc-maid-service-company', freq: 'monthly', pri: '0.7' },
    { path: '/contact-the-nyc-maid-service-today', freq: 'monthly', pri: '0.8' },
    { path: '/updated-nyc-maid-service-industry-pricing', freq: 'weekly', pri: '0.9' },
    { path: '/nyc-cleaning-service-frequently-asked-questions-in-2025', freq: 'monthly', pri: '0.8' },
    { path: '/reviews', freq: 'weekly', pri: '0.8' },
    { path: '/reviews/submit', freq: 'monthly', pri: '0.7' },
    { path: '/available-nyc-maid-jobs', freq: 'daily', pri: '0.8' },
    { path: '/careers/operations-coordinator', freq: 'daily', pri: '0.8' },
    { path: '/nyc-maid-service-blog', freq: 'weekly', pri: '0.7' },
    { path: '/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid', freq: 'weekly', pri: '0.7' },
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

  // Area pages
  for (const area of AREAS) {
    const photo = pickLifestylePhoto(area.slug)
    urls.push({
      loc: `${BASE_URL}/${area.urlSlug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.9',
      images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — ${area.name}`, caption: `${photo.caption} — ${area.name} cleaning` }],
    })
  }

  // Service pages
  for (const service of SERVICES) {
    const photo = pickPhotoByCategory(SERVICE_PHOTO_CATEGORY[service.slug] || 'mop', service.slug)
    urls.push({
      loc: `${BASE_URL}/services/${service.urlSlug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.8',
      images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — ${service.name}`, caption: `${photo.caption} — ${service.name}` }],
    })
  }

  // Neighborhood pages
  for (const n of ALL_NEIGHBORHOODS) {
    const photo = pickLifestylePhoto(n.slug)
    urls.push({
      loc: `${BASE_URL}/${n.urlSlug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.8',
      images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — ${n.name}`, caption: `${photo.caption} — ${n.name} cleaning service` }],
    })
  }

  // Blog posts
  for (const post of BLOG_POSTS) {
    const photo = pickLifestylePhoto(post.slug)
    urls.push({
      loc: `${BASE_URL}/nyc-maid-service-blog/${post.slug}`,
      lastmod: post.date,
      changefreq: 'monthly',
      priority: '0.7',
      images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — ${post.title}`, caption: photo.caption }],
    })
  }

  // Neighborhood job pages
  for (const n of ALL_NEIGHBORHOODS) {
    const photo = pickTeamPhoto(n.slug)
    urls.push({
      loc: `${BASE_URL}/available-nyc-maid-jobs/${n.slug}`,
      lastmod: now,
      changefreq: 'daily',
      priority: '0.8',
      images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — hiring in ${n.name}`, caption: `Now hiring in ${n.name}` }],
    })
  }

  // Neighborhood × Service cross pages
  for (const n of ALL_NEIGHBORHOODS) {
    for (const s of SERVICES) {
      const photo = pickPhotoByCategory(SERVICE_PHOTO_CATEGORY[s.slug] || 'mop', `${n.slug}-${s.slug}`)
      urls.push({
        loc: `${BASE_URL}/${n.urlSlug}/${s.slug}`,
        lastmod: now,
        changefreq: 'monthly',
        priority: '0.6',
        images: [{ loc: absoluteImageUrl(photo.src), title: `${photo.alt} — ${s.name} in ${n.name}`, caption: `${s.name} in ${n.name}` }],
      })
    }
  }

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
