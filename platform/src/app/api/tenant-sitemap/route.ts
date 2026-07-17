import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { toSlug } from '@/lib/tenant-site'
import { getPrimaryTenantDomain } from '@/lib/domains'
import { TENANT_SEO, type UrlSpec } from '@/lib/seo/tenant-seo'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { VA_SERVICES } from '@/app/site/template/_data/va-services'
import { ALL_LOCATIONS } from '@/app/site/template/_data/us-locations'

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

  // Look up tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, domain, website_url, selena_config, industry')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Prefer custom domain (tenant_domains FIRST, tenants.domain fallback --
  // same precedence as tenantSiteUrl()/resolveOrigin()'s other callers),
  // then website_url, then platform subdomain. Previously read tenant.domain
  // only, so a tenant reached via a custom domain that lives only in
  // tenant_domains (the normal state -- admin/websites writes tenant_domains
  // only, never tenants.domain) had every sitemap URL emitted for the wrong
  // host, even though the request that fetched this sitemap arrived on the
  // correct custom domain via middleware's tenant_domains-based routing.
  const primaryDomain = await getPrimaryTenantDomain(tenant.id)
  const domain = primaryDomain || tenant.domain
  const baseUrl = domain
    ? `https://${domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
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
    .order('sort_order')

  // Fetch areas from selena_config
  const areas: string[] =
    (tenant.selena_config as Record<string, unknown> | null)?.service_areas as string[] || []

  const today = new Date().toISOString().split('T')[0]

  // Build URL entries
  const urls: Array<{ loc: string; priority: string; changefreq: string }> = []

  // Static pages — match actual fullloop site routes
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/services', priority: '0.9', changefreq: 'weekly' },
    { path: '/reviews', priority: '0.8', changefreq: 'weekly' },
    { path: '/reviews/submit', priority: '0.5', changefreq: 'monthly' },
    { path: '/portal/collect', priority: '0.7', changefreq: 'monthly' },
    { path: '/chat-with-selena', priority: '0.6', changefreq: 'monthly' },
  ]

  for (const page of staticPages) {
    urls.push({
      loc: `${baseUrl}${page.path === '/' ? '' : page.path}`,
      priority: page.priority,
      changefreq: page.changefreq,
    })
  }

  // Service pages — /services/[slug]
  if (services) {
    for (const service of services) {
      urls.push({
        loc: `${baseUrl}/services/${toSlug(service.name)}`,
        priority: '0.8',
        changefreq: 'weekly',
      })
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
