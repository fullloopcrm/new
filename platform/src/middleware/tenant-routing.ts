import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'
import { EU_REGION_COOKIE, isEuJurisdiction } from './eu-jurisdiction'

// Hosts that are the marketing site / main app (not tenant sites)
export const MAIN_HOSTS = new Set([
  'homeservicesbusinesscrm.com',
  'www.homeservicesbusinesscrm.com',
  'fullloopcrm.com',
  'www.fullloopcrm.com',
  'localhost',
  '127.0.0.1',
  'platform-ten-psi.vercel.app',
])

export function isMainHost(hostname: string): boolean {
  // Strip port AND lowercase for comparison — MAIN_HOSTS entries are all
  // lowercase, so a mixed-case Host header (e.g. curl sending
  // "WWW.FULLLOOPCRM.COM") would otherwise miss this Set, fall through to the
  // custom-domain branch below, fail the domain lookup, and return
  // NextResponse.next() — skipping the auth gate entirely for the main
  // dashboard.
  const host = hostname.split(':')[0].toLowerCase()
  return MAIN_HOSTS.has(host)
}

// A tenant's public site (carrying domain or custom domain) serves in every
// state EXCEPT the ones where it should be dark. New tenants are 'setup'/
// 'pending' and must still show their live site immediately (booking + collect
// work before full activation) — gating on status==='active' hid every new
// tenant behind the Full Loop marketing page until the onboarding gate passed.
const NON_SERVING_STATUSES = new Set(['suspended', 'cancelled', 'deleted'])
export function tenantServesSite(status: string | null | undefined): boolean {
  return !NON_SERVING_STATUSES.has(status ?? '')
}

export function extractSubdomain(hostname: string): string | null {
  // Lowercase for the same reason as isMainHost — a mixed-case tenant
  // subdomain Host header must still match the regex below.
  const host = hostname.split(':')[0].toLowerCase()
  // Match *.homeservicesbusinesscrm.com or *.fullloopcrm.com (carrying/holding
  // domain — tenants are served at <slug>.fullloopcrm.com until their real
  // custom domain is pointed at the platform).
  const match = host.match(/^([a-z0-9-]+)\.(?:homeservicesbusinesscrm|fullloopcrm)\.com$/)
  if (match && match[1] !== 'www') {
    return match[1]
  }
  return null
}

// Static fallback map — used when DB lookup at the edge is unreliable. The
// tenant id here is informational only; rewriteToSite signs the slug.
const STATIC_TENANT_MAP: Record<string, { id: string; slug: string }> = {
  'thefloridamaid.com': { id: '56490a6b-820c-49e6-8c14-cb4e54ffcb06', slug: 'the-florida-maid' },
  'www.thefloridamaid.com': { id: '56490a6b-820c-49e6-8c14-cb4e54ffcb06', slug: 'the-florida-maid' },
}
export function getStaticTenant(cleanHost: string): { id: string; slug: string } | null {
  return STATIC_TENANT_MAP[cleanHost] ?? null
}

/**
 * Rewrite the request to the /site route group, passing tenant context via headers.
 * External URL stays clean (e.g. the-nyc-maid.homeservicesbusinesscrm.com/services)
 * but internally Next.js renders /site/services.
 */
export function rewriteToSite(req: NextRequest, tenantId: string, tenantSlug: string): NextResponse {
  const pathname = req.nextUrl.pathname // e.g. "/" or "/services" or "/about"

  const tenantSig = signTenantHeader(tenantId)

  // Rewrite /sitemap.xml. Tenants in TENANTS_WITH_RICH_SITEMAP own a
  // sitemap.ts at /site/<slug>/sitemap.xml that enumerates their full
  // route tree. All other tenants fall back to the generic 7-URL
  // /api/tenant-sitemap until they ship their own rich sitemap.
  const TENANTS_WITH_RICH_SITEMAP = new Set(['the-nyc-exterminator', 'the-florida-maid', 'nycmaid', 'nyc-mobile-salon', 'the-nyc-seo', 'consortium-nyc', 'the-nyc-marketing-company', 'nyc-tow', 'theroadsidehelper', 'toll-trucks-near-me', 'we-pay-you-junk', 'the-home-services-company', 'nycroadsideemergencyassistance', 'fla-dumpster-rentals', 'landscaping-in-nyc', 'the-nyc-interior-designer', 'debt-service-ratio-loan', 'stretch-ny', 'stretch-service', 'sunnyside-clean-nyc', 'wash-and-fold-nyc'])
  if (pathname === '/sitemap.xml') {
    const url = req.nextUrl.clone()
    if (TENANTS_WITH_RICH_SITEMAP.has(tenantSlug)) {
      url.pathname = `/site/${tenantSlug}/sitemap.xml`
    } else {
      url.pathname = '/api/tenant-sitemap'
      url.searchParams.set('slug', tenantSlug)
    }
    const requestHeaders = new Headers(req.headers)
    requestHeaders.delete('x-tenant-sig') // strip any caller-supplied
    requestHeaders.set('x-tenant-id', tenantId)
    requestHeaders.set('x-tenant-slug', tenantSlug)
    requestHeaders.set('x-tenant-sig', tenantSig)
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  // /robots.txt runs at its own path with tenant headers injected so the
  // generator in src/app/robots.ts emits the tenant's own sitemap URL.
  if (pathname === '/robots.txt') {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.delete('x-tenant-sig')
    requestHeaders.set('x-tenant-id', tenantId)
    requestHeaders.set('x-tenant-slug', tenantSlug)
    requestHeaders.set('x-tenant-sig', tenantSig)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // On a tenant domain, /admin IS that tenant's own Loop dashboard (mirrors
  // the standalone nycmaid, which serves its Loop at /admin). The platform
  // super-admin /admin only exists on the main host. We rewrite the page
  // route /admin(/*) -> /dashboard(/*) so the tenant gets the Loop layout,
  // scoped to itself via the injected signed x-tenant-id header. Note this
  // does NOT match /api/admin/* (those start with /api/, not /admin/), which
  // remain the platform admin APIs.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const url = req.nextUrl.clone()
    url.pathname = pathname === '/admin'
      ? '/dashboard'
      : `/dashboard${pathname.slice('/admin'.length)}`
    const requestHeaders = new Headers(req.headers)
    requestHeaders.delete('x-tenant-sig')
    requestHeaders.set('x-tenant-id', tenantId)
    requestHeaders.set('x-tenant-slug', tenantSlug)
    requestHeaders.set('x-tenant-sig', tenantSig)
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  // Referral portal carve-out: the global /referral tree (login + [code]
  // dashboard, see src/app/referral/*) is fully tenant-generic -- it resolves
  // branding/domain per-request via tenant headers, exactly like /team and
  // /portal below. It's also the ONLY secure implementation: the several
  // site/<tenant>/referral forks that predate it call APIs
  // (/api/referral-commissions, /api/referrers?email=) that were
  // independently hardened elsewhere to require a referrer session token, so
  // those forks silently show $0/empty rather than actually working (found
  // 2026-08-02 auditing a report that they looked visually broken). nycmaid
  // keeps its own /site/nycmaid/referral fork -- rebuilt the same day onto
  // the identical secure email->code->token flow, so it isn't broken, just
  // intentionally still separate (same carve-out shape as its /sales fork
  // below).
  const BESPOKE_TENANTS_WITH_OWN_REFERRAL_PORTAL = new Set<string>(['nycmaid'])
  if (
    (pathname === '/referral' || pathname.startsWith('/referral/')) &&
    !BESPOKE_TENANTS_WITH_OWN_REFERRAL_PORTAL.has(tenantSlug)
  ) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.delete('x-tenant-sig')
    requestHeaders.set('x-tenant-id', tenantId)
    requestHeaders.set('x-tenant-slug', tenantSlug)
    requestHeaders.set('x-tenant-sig', tenantSig)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // API routes + tenant-scoped app routes that live at the root are NOT
  // rewritten under /site — they run at their own path with tenant headers
  // injected so getTenantFromHeaders() can resolve them.
  const APP_ROOT_PREFIXES = [
    '/api/', '/portal', '/team', '/reviews/submit', '/unsubscribe',
    '/stripe-onboard', '/dashboard', '/admin', '/fullloop', '/reset-pin',
    // Public token-doc links (quote/invoice/sign/photos) — regression fix:
    // these were dropped from this list, which silently rewrote them under
    // /site/template, breaking every public quote/invoice/signature/photo
    // link sent to real clients. See src/middleware.public-doc-links.test.ts.
    '/quote', '/invoice', '/sign', '/photos',
  ]
  if (APP_ROOT_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p))) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.delete('x-tenant-sig')
    requestHeaders.set('x-tenant-id', tenantId)
    requestHeaders.set('x-tenant-slug', tenantSlug)
    requestHeaders.set('x-tenant-sig', tenantSig)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Tenants opt into the per-tenant subtree pattern by having their site files
  // at /site/<slug>/ — the onboarding script writes there. Tenants without a
  // subtree fall back to the legacy shared /site/* tree (FullLoop was built from
  // nycmaid's site, which lives at the /site root and has no /site/nycmaid dir).
  const ROOT_SITE_TENANTS = new Set<string>([])
  // Tenants with their own hand-built /site/<slug> subtree. Every other tenant —
  // including all newly-created ones — is served by the shared de-branded
  // template at /site/template, which renders from the tenant's own config
  // (see src/app/site/template/_config/load.ts). No per-tenant file copy or
  // redeploy is needed: a new tenant resolves to the template automatically.
  // Cleaning tenants (the-florida-maid, sunnyside-clean-nyc) are routed to the
  // shared /site/template — a config-driven copy of nycmaid's full
  // smart-scheduling site — so they get the same booking flow as nycmaid without
  // a per-tenant file copy. They are intentionally NOT listed here.
  // The remaining tenants are non-cleaning verticals (tow, exterminator, salon,
  // SEO, etc.); the template is cleaning-specific, so they keep their bespoke
  // /site/<slug> subtree. nycmaid keeps its own bespoke site (the live primary).
  // CUTOVER: most non-nycmaid tenants are REAL tenants served by the shared,
  // config-driven global template (/site/template) — no forked per-tenant code.
  // The tenants listed below are LIVE businesses whose bespoke site the template
  // cannot represent, so they keep their own /site/<slug> subtree. This set is
  // the single source of truth for that routing; dropping a live tenant from it
  // (or deleting its folder) silently replaces their site with the template, so
  // every entry here is locked by scripts/verify-protected-tenants.mjs, which
  // runs at build time (npm prebuild) and fails the deploy if one goes missing.
  const BESPOKE_SITE_TENANTS = new Set<string>([
    'nycmaid',
    'we-pay-you-junk',
    'nyc-mobile-salon',
    'the-florida-maid',
    'the-nyc-exterminator',
    'nyc-tow',
    'nycroadsideemergencyassistance',
    'theroadsidehelper',
    'toll-trucks-near-me',
    'sunnyside-clean-nyc',
    'wash-and-fold-nyc',
    'landscaping-in-nyc',
    'debt-service-ratio-loan',
    'fla-dumpster-rentals',
    'stretch-ny',
    'stretch-service',
    'the-home-services-company',
    'the-nyc-interior-designer',
    'the-nyc-marketing-company',
    'the-nyc-seo',
    'consortium-nyc',
  ])
  // Sales-partner portal carve-out: /site/template/sales is tenant-agnostic
  // (no config coupling, resolves everything through tenant-scoped APIs), so
  // any BESPOKE_SITE_TENANTS tenant WITHOUT its own hand-built /sales subtree
  // falls through to it instead of 404ing. nycmaid is excluded -- it has its
  // own bespoke /site/nycmaid/sales and must keep routing there unchanged.
  const BESPOKE_TENANTS_WITH_OWN_SALES_PORTAL = new Set<string>(['nycmaid'])
  const wantsSharedSalesPortal =
    (pathname === '/sales' || pathname.startsWith('/sales/')) &&
    !BESPOKE_TENANTS_WITH_OWN_SALES_PORTAL.has(tenantSlug)

  const siteBase = ROOT_SITE_TENANTS.has(tenantSlug)
    ? '/site'
    : BESPOKE_SITE_TENANTS.has(tenantSlug)
      ? (wantsSharedSalesPortal ? '/site/template' : `/site/${tenantSlug}`)
      : '/site/template'
  const sitePathname = pathname === '/' ? siteBase : `${siteBase}${pathname}`

  const url = req.nextUrl.clone()
  url.pathname = sitePathname

  // x-tenant-sig is intentionally NOT set on response.headers below — it must
  // stay on the internal request only (see requestHeaders further down).
  // signTenantHeader(tenantId) is a static HMAC with no nonce/expiry, so
  // echoing it back to the client would let any visitor to a tenant's site
  // harvest a permanently-valid (tenantId, sig) pair and replay it on direct
  // API calls, defeating the "only middleware can mint this" guarantee every
  // downstream consumer (dashboard/layout, admin-auth, chat, yinez, tenant.ts,
  // etc.) relies on.
  const response = NextResponse.rewrite(url)
  response.headers.set('x-tenant-id', tenantId)
  response.headers.set('x-tenant-slug', tenantSlug)
  // NB: never echo x-tenant-sig on the RESPONSE. The sig is a static
  // HMAC(secret, tenantId) with no nonce/expiry; returning it to the client
  // hands out a permanent forge-token that defeats the "only middleware can
  // mint the sig" guarantee. Downstream code reads the sig from the REQUEST
  // headers (set below), which never reach the client.

  // The national VA SEO pages (1,500+) are force-dynamic because they read
  // tenant headers, but their content is identical for every visitor on this
  // host — so cache them at the edge instead of rendering each on every request.
  // Big reduction in function/ISR cost. Marketing content, so an hour of
  // staleness with background revalidation is fine.
  if (req.method === 'GET' && pathname.startsWith('/virtual-assistant')) {
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  }

  // Also set request headers so server components / route handlers can read them
  const requestHeaders = new Headers(req.headers)
  requestHeaders.delete('x-tenant-sig')
  requestHeaders.set('x-tenant-id', tenantId)
  requestHeaders.set('x-tenant-slug', tenantSlug)
  requestHeaders.set('x-tenant-sig', tenantSig)

  // NextResponse.rewrite with modified headers
  const rewriteUrl = req.nextUrl.clone()
  rewriteUrl.pathname = sitePathname
  const siteResponse = NextResponse.rewrite(rewriteUrl, {
    headers: response.headers,
    request: {
      headers: requestHeaders,
    },
  })

  // Geo-detect EU/EEA/UK/Switzerland so the client-side consent banner can
  // switch to GDPR opt-in without every marketing page becoming dynamic.
  // Only set on actual site-page responses — not sitemap/robots/admin/API
  // branches above, which return earlier and never reach here.
  siteResponse.cookies.set(EU_REGION_COOKIE, isEuJurisdiction(req) ? '1' : '0', {
    path: '/',
    maxAge: 60 * 60 * 24, // re-checked daily in case a visitor's IP/geo changes
    sameSite: 'lax',
  })

  return siteResponse
}
