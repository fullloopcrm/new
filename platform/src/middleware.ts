import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantBySlug, getTenantByDomain } from '@/lib/tenant-lookup'
import { verifyAdminTokenEdge } from '@/lib/admin-token-edge-verify'
import { signTenantHeader } from '@/lib/tenant-header-sig'
import { redirectLegacyMarketingUrl } from './middleware/legacy-redirects'
import { getBrandConsolidationRedirect, getCanonicalWwwRedirect } from './middleware/canonical-redirects'
import { isKilledRoute } from './middleware/killed-routes'
import { getEmdMicrositeRewrite } from './middleware/emd-microsites'
import {
  isMainHost,
  extractSubdomain,
  tenantServesSite,
  getStaticTenant,
  rewriteToSite,
} from './middleware/tenant-routing'
import { isPublicRoute } from './middleware/public-routes'
import { isAdminBypassPath } from './middleware/admin-bypass'

// This file is deliberately a thin orchestrator. Each concern below (brand
// redirects, legacy-URL redirects, killed routes, EMD microsites, tenant
// routing, the public-route allowlist, the admin bypass list) lives in its
// own module under ./middleware/ specifically so an unrelated feature commit
// touching ONE concern can't collaterally delete a DIFFERENT one — which is
// exactly what happened on 2026-08-01 (e51fe908e deleted the entire legacy
// redirect block while adding EMD microsites, 404ing the site's #1-ranked
// keyword page for a day-plus before anyone noticed). Order of the checks
// below is load-bearing — see each inline comment for why.
// Exact-IP site block (2026-08-10) — see migrations/comhub-contact-ip-tracking-and-blocking.sql.
function requestIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
}

function isIpBlocked(ip: string, blockedIps: string[] | undefined): boolean {
  return !!ip && !!blockedIps?.length && blockedIps.includes(ip)
}

// Fire-and-forget-but-awaited: latency doesn't matter for a rejected
// visitor, and awaiting guarantees the alert fires before the Edge
// function exits (an un-awaited promise can be dropped when the response
// returns). notify() itself can't run here — Edge Runtime can't load its
// Node-only deps — so this hands off to a Node-runtime route instead.
async function blockedResponse(req: NextRequest, tenantId: string): Promise<NextResponse> {
  try {
    await fetch(new URL('/api/internal/blocked-visit-alert', req.nextUrl.origin), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-tenant-sig': signTenantHeader(tenantId),
      },
      body: JSON.stringify({ ip: requestIp(req), path: req.nextUrl.pathname }),
    })
  } catch (e) {
    console.error('blocked-visit-alert failed:', e)
  }
  return new NextResponse('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } })
}

export default async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || req.headers.get('x-forwarded-host') || 'localhost'

  // --- fullloopcrm.com brand consolidation (308) ---
  // Checked before anything else (MAIN_HOSTS, tenant lookup, canonical-www
  // below) so it can't be shadowed or looped by that logic.
  const brandRedirect = getBrandConsolidationRedirect(hostname, req)
  if (brandRedirect) return brandRedirect

  // --- Canonical www redirect (301) ---
  const canonicalRedirect = getCanonicalWwwRedirect(hostname, req)
  if (canonicalRedirect) return canonicalRedirect

  // --- Killed routes: return 410 Gone for the marketing-site buyer-funnel
  // pages we shut down in the 2026-05-03 teaser pivot. Only applies on the
  // main host so tenant subdomains/custom domains are unaffected.
  if (isMainHost(hostname) && isKilledRoute(req.nextUrl.pathname)) {
    return new NextResponse('Gone', {
      status: 410,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  // --- Legacy marketing-slug redirects (2026-07-28 redesign) ---
  // Old industry/location/combo URLs 301 to the new short-tail/nested slugs.
  // Main host only — never touches tenant subdomains/custom domains.
  if (isMainHost(hostname)) {
    const newPath = redirectLegacyMarketingUrl(req.nextUrl.pathname)
    if (newPath) {
      const url = req.nextUrl.clone()
      url.pathname = newPath
      return NextResponse.redirect(url, 301)
    }
  }

  // --- Tenant subdomain routing (runs before the auth gate) ---
  const subdomain = extractSubdomain(hostname)
  if (subdomain) {
    try {
      const tenant = await getTenantBySlug(subdomain)
      if (tenant && tenantServesSite(tenant.status)) {
        if (isIpBlocked(requestIp(req), tenant.blockedIps)) return await blockedResponse(req, tenant.id)
        return rewriteToSite(req, tenant.id, tenant.slug)
      }
    } catch (e) {
      console.error('Tenant subdomain lookup error:', e)
    }
    return NextResponse.next()
  }

  // --- Custom domain routing (runs before the auth gate) ---
  if (!isMainHost(hostname)) {
    const cleanHost = hostname.split(':')[0].toLowerCase()

    const emdRewrite = getEmdMicrositeRewrite(cleanHost, req)
    if (emdRewrite) return emdRewrite

    const staticTenant = getStaticTenant(cleanHost)
    if (staticTenant) {
      return rewriteToSite(req, staticTenant.id, staticTenant.slug)
    }
    try {
      // Use cleanHost (port-stripped, lowercased) — NOT the raw hostname. A
      // custom domain hit with a non-standard port on the Host header (local
      // testing, some proxies) or mixed-case casing would otherwise never
      // match a DB row (tenant-lookup only strips the www. prefix), silently
      // falling through to the main site instead of the tenant's own.
      const tenant = await getTenantByDomain(cleanHost)
      if (tenant && tenantServesSite(tenant.status)) {
        if (isIpBlocked(requestIp(req), tenant.blockedIps)) return await blockedResponse(req, tenant.id)
        return rewriteToSite(req, tenant.id, tenant.slug)
      }
    } catch (e) {
      console.error('Tenant domain lookup error:', e)
    }
    // If domain lookup fails, fall through to main site
    return NextResponse.next()
  }

  // --- Full Loop's own ComHub-connected chat surfaces on the main host ---
  // homeservicesbusinesscrm.com is a MAIN_HOST (never gets a tenant via the
  // custom-domain branch above), but its own site and the SEO satellite
  // sites' widget iframe both need a real tenant so ComHub has somewhere to
  // store threads. Narrow allowlist — only these 3 paths get a header;
  // every other MAIN_HOST path (dashboard, sign-in, everything else) is
  // completely untouched by this block. Resolves to the pre-existing
  // "⚙️ System (SEO + Sales Agreements — not a real tenant)" tenant, already
  // used the same way elsewhere (see FULL_LOOP_TENANT in
  // api/admin/requests/[id]/agreement/route.ts and the full-loop-crm slug
  // exclusion in lib/seo/digest.ts).
  const HUB_CHAT_TENANT_ID = '117968d2-24a1-42b5-96bd-7022e4e838ee'
  const HUB_CHAT_TENANT_SLUG = 'full-loop-crm'
  const HUB_CHAT_PATHS = ['/widget', '/api/public/webchat', '/api/tenant/public']
  if (HUB_CHAT_PATHS.some(p => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(p + '/'))) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.delete('x-tenant-sig')
    requestHeaders.set('x-tenant-id', HUB_CHAT_TENANT_ID)
    requestHeaders.set('x-tenant-slug', HUB_CHAT_TENANT_SLUG)
    requestHeaders.set('x-tenant-sig', signTenantHeader(HUB_CHAT_TENANT_ID))
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // --- Dev-only tenant preview override (never runs outside development) ---
  // localhost has no subdomain/custom-domain to route by, so a tenant site
  // is otherwise unreachable without editing /etc/hosts. ?preview_tenant=<slug>
  // rewrites to that tenant's site the same way a real subdomain would.
  // A cookie (set on the first rewrite) carries the tenant across same-origin
  // fetch() calls that don't repeat the query param — e.g. the Shop page's
  // own client-side POST to /api/shop/checkout — so the whole page, not just
  // the initial navigation, resolves to the previewed tenant.
  if (process.env.NODE_ENV === 'development' && isMainHost(hostname)) {
    const previewSlug = req.nextUrl.searchParams.get('preview_tenant') || req.cookies.get('dev_preview_tenant')?.value
    if (previewSlug) {
      try {
        const tenant = await getTenantBySlug(previewSlug)
        if (tenant && tenantServesSite(tenant.status)) {
          const res = rewriteToSite(req, tenant.id, tenant.slug)
          res.cookies.set('dev_preview_tenant', previewSlug, { path: '/' })
          return res
        }
      } catch (e) {
        console.error('preview_tenant lookup error:', e)
      }
    }
  }

  // --- Main site / dashboard (existing behavior) ---
  if (!isPublicRoute(req)) {
    // Allow admin (PIN-auth) to bypass the sign-in redirect on dashboard +
    // its API routes. A verified admin_token is enough — an admin hitting
    // /dashboard directly (no active impersonation) must not fall through
    // to the sign-in redirect. Verified (not just present) — see
    // admin-token-edge-verify.ts; a presence-only check let any cookie
    // value reach the route handler (which does verify), so this was a
    // weak edge-layer check, not a live bypass.
    const adminCookie = req.cookies.get('admin_token')?.value
    if (adminCookie && verifyAdminTokenEdge(adminCookie, process.env.ADMIN_TOKEN_SECRET)) {
      if (isAdminBypassPath(req.nextUrl.pathname)) {
        return
      }
    }
    // Owner login is dormant. Protected owner routes that aren't
    // admin-impersonated redirect to sign-in until the session-based owner
    // login is wired (P5).
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mov)).*)',
    '/(api|trpc)(.*)',
  ],
}
