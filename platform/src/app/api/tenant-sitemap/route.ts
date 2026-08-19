import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { toSlug } from '@/lib/tenant-site'
import { TENANT_SEO, type UrlSpec } from '@/lib/seo/tenant-seo'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { slugifyService } from '@/app/site/template/_lib/seo/photography-services'
import { VA_SERVICES } from '@/app/site/template/_data/va-services'
import { ALL_LOCATIONS } from '@/app/site/template/_data/us-locations'
import { tenantServesSite } from '@/middleware/tenant-routing'

/**
 * Dynamic XML sitemap for a tenant site.
 *
 * Called via /api/tenant-sitemap?slug=the-nyc-maid
 * The middleware can also rewrite /sitemap.xml to this route.
 */
export async function GET(req: NextRequest) {
  // Slug comes from ?slug= query (direct API call) OR x-tenant-slug header
  // (custom-domain middleware rewrite).
  const slug =
    req.nextUrl.searchParams.get('slug') || req.headers.get('x-tenant-slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 })
  }

  // Look up tenant. Gating on status==='active' here hid the sitemap for
  // every tenant still in 'setup' (which already serves live pages — see
  // tenantServesSite) — same bug the site-serving path fixed previously.
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, domain, website_url, selena_config, industry, status')
    .eq('slug', slug)
    .single()

  if (!tenant || !tenantServesSite(tenant.status)) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Prefer custom domain, then website_url, then platform subdomain.
  const baseUrl = tenant.domain
    ? `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    : tenant.website_url || `https://${tenant.slug}.homeservicesbusinesscrm.com`

  // If this tenant is registered in the shared SEO engine, its descriptor owns
  // the full code-defined URL set (statics + areas + neighborhoods + services +
  // careers + job pages). This is the generalized path — it replaces the
  // hand-maintained DB-derived list below for onboarded tenants.
  const descriptor = TENANT_SEO[slug]
  if (descriptor) {
    const specs: UrlSpec[] = descriptor.buildUrls()
    return new NextResponse(specsToXml(specs), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  }

  // Virtual-assistant tenants: emit the national VA SEO set — home + services
  // index + 10 service pages + 150 city/state hubs. The 1,500 geo×service
  // combos are noindex, so they are intentionally excluded from the sitemap.
  if (industryProfile((tenant as { industry?: string | null }).industry).isVirtualAssistant) {
    const vaSpecs: Array<{ loc: string; priority: string; changefreq: string }> = [
      { loc: baseUrl, priority: '1.0', changefreq: 'weekly' },
      { loc: `${baseUrl}/virtual-assistant-services`, priority: '0.9', changefreq: 'weekly' },
      ...VA_SERVICES.map((s) => ({ loc: `${baseUrl}/virtual-assistant-services/${s.slug}`, priority: '0.8', changefreq: 'weekly' })),
      ...ALL_LOCATIONS.map((l) => ({ loc: `${baseUrl}/virtual-assistant/${l.slug}`, priority: '0.7', changefreq: 'weekly' })),
    ]
    const today = new Date().toISOString().split('T')[0]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${vaSpecs
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  }

  // Fetch services
  const { data: services } = await supabaseAdmin
    .from('service_types')
    .select('name')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .eq('item_type', 'service')
    .order('sort_order')

  // Fetch shop products — same eligibility rule the storefront itself uses
  // (item_type='product', active, priced). Never included here before, so
  // e-commerce tenants had zero /shop or product URLs in their sitemap.
  const { data: products } = await supabaseAdmin
    .from('service_types')
    .select('id, name, category')
    .eq('tenant_id', tenant.id)
    .eq('item_type', 'product')
    .eq('active', true)
    .gt('price_cents', 0)

  // Fetch areas from selena_config
  const areas: string[] =
    (tenant.selena_config as Record<string, unknown> | null)?.service_areas as string[] || []

  const today = new Date().toISOString().split('T')[0]

  // Build URL entries
  const urls: Array<{ loc: string; priority: string; changefreq: string }> = []
  const isPhotographyTenant = industryProfile((tenant as { industry?: string | null }).industry).isPhotography

  // Static pages — match actual fullloop site routes. This list previously
  // covered only home/services/reviews — every tenant on this fallback
  // (anyone without a TENANT_SEO descriptor) had About, Pricing, FAQ,
  // Contact, Careers, Referral Program, and the entire Blog missing from
  // their sitemap despite those being real, substantial, indexable pages.
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/about', priority: '0.8', changefreq: 'monthly' },
    { path: '/services', priority: '0.9', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
    { path: '/reviews', priority: '0.8', changefreq: 'weekly' },
    { path: '/reviews/submit', priority: '0.5', changefreq: 'monthly' },
    { path: '/faq', priority: '0.7', changefreq: 'monthly' },
    { path: '/contact', priority: '0.8', changefreq: 'monthly' },
    { path: '/careers', priority: '0.6', changefreq: 'monthly' },
    { path: '/referral-program', priority: '0.5', changefreq: 'monthly' },
    { path: '/blog', priority: '0.7', changefreq: 'weekly' },
    { path: '/portal/collect', priority: '0.7', changefreq: 'monthly' },
    // The shared /site/template route group's AI-chat route is named
    // chat-with-yinez, not chat-with-selena (that name only exists under the
    // separate, non-template /site/chat-with-selena folder) — every tenant
    // rendered through /site/template got a guaranteed-404 sitemap entry here.
    { path: '/chat-with-yinez', priority: '0.6', changefreq: 'monthly' },
  ]
  // Photography blog posts have static, known slugs (see photographyBlogPosts
  // in longform.ts) — listed directly here since constructing a full
  // SiteConfig just to call blogPosts() isn't worth it for a fixed slug list.
  const PHOTOGRAPHY_BLOG_SLUGS = [
    'film-vs-digital-vs-ai-photography',
    'how-to-prepare-for-a-black-and-white-portrait-session',
    'best-places-to-shoot-film-photography-in-san-francisco',
    'why-we-will-never-use-ai-photography',
    'how-to-care-for-and-preserve-darkroom-prints',
    'analog-vs-digital-what-a-negative-actually-gives-you',
  ]

  for (const page of staticPages) {
    urls.push({
      loc: `${baseUrl}${page.path === '/' ? '' : page.path}`,
      priority: page.priority,
      changefreq: page.changefreq,
    })
  }

  if (isPhotographyTenant) {
    for (const slug of PHOTOGRAPHY_BLOG_SLUGS) {
      urls.push({ loc: `${baseUrl}/blog/${slug}`, priority: '0.6', changefreq: 'monthly' })
    }
  }

  // Service pages — /services/[slug]. Photography tenants resolve their
  // service pages via slugifyService (converts "&" -> "and"), not the
  // generic toSlug (which drops "&" entirely) — using toSlug here produced
  // sitemap URLs like /services/couples-engagement-session that 404 against
  // the real route /services/couples-and-engagement-session.
  if (services) {
    for (const service of services) {
      const slug = isPhotographyTenant ? slugifyService(service.name) : toSlug(service.name)
      urls.push({
        loc: `${baseUrl}/services/${slug}`,
        priority: '0.8',
        changefreq: 'weekly',
      })
    }
  }

  // Shop pages — /shop, /shop/c/[category], /shop/[id]
  if (products && products.length > 0) {
    urls.push({ loc: `${baseUrl}/shop`, priority: '0.9', changefreq: 'daily' })
    const categories = new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))
    for (const category of categories) {
      urls.push({ loc: `${baseUrl}/shop/c/${toSlug(category)}`, priority: '0.7', changefreq: 'weekly' })
    }
    for (const product of products) {
      urls.push({ loc: `${baseUrl}/shop/${product.id}`, priority: '0.6', changefreq: 'weekly' })
    }
  }

  // Area pages (/[area-slug]) + Area × Service combo pages (/[area-slug]/[service-slug])
  for (const area of areas) {
    const areaSlug = toSlug(area)
    urls.push({
      loc: `${baseUrl}/${areaSlug}`,
      priority: '0.8',
      changefreq: 'weekly',
    })

    if (services) {
      for (const service of services) {
        urls.push({
          loc: `${baseUrl}/${areaSlug}/${toSlug(service.name)}`,
          priority: '0.7',
          changefreq: 'weekly',
        })
      }
    }
  }

  // Build XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

function specsToXml(specs: UrlSpec[]): string {
  const today = new Date().toISOString().split('T')[0]
  const body = specs
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changeFrequency}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
