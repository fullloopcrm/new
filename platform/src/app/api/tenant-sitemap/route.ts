import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { toSlug } from '@/lib/tenant-site'

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
    .select('id, slug, domain, website_url, selena_config')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Prefer custom domain, then website_url, then platform subdomain.
  const baseUrl = tenant.domain
    ? `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    : tenant.website_url || `https://${tenant.slug}.homeservicesbusinesscrm.com`

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
    { path: '/available-nyc-maid-jobs', priority: '0.7', changefreq: 'weekly' },
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
