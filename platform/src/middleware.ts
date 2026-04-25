import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantBySlug, getTenantByDomain } from '@/lib/tenant-lookup'
import { signTenantHeader } from '@/lib/tenant-header-sig'

// Hosts that are the marketing site / main app (not tenant sites)
const MAIN_HOSTS = new Set([
  'homeservicesbusinesscrm.com',
  'www.homeservicesbusinesscrm.com',
  'localhost',
  '127.0.0.1',
  'platform-ten-psi.vercel.app',
])

function isMainHost(hostname: string): boolean {
  // Strip port for comparison
  const host = hostname.split(':')[0]
  return MAIN_HOSTS.has(host)
}

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0]
  // Match *.homeservicesbusinesscrm.com
  const match = host.match(/^([a-z0-9-]+)\.homeservicesbusinesscrm\.com$/)
  if (match && match[1] !== 'www') {
    return match[1]
  }
  return null
}

// Public routes that don't require auth
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/full-loop-crm-pricing',
  '/full-loop-crm-service-features',
  '/businesses',
  '/full-loop-crm-service-business-industries',
  '/industry(.*)',
  '/(.*)-business-crm',
  '/crm-for-(.*)',
  '/locations(.*)',
  '/services(.*)',
  '/about-full-loop-crm',
  '/full-loop-crm-frequently-asked-questions',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/accessibility',
  '/full-loop-crm-101-educational-tips',
  '/why-you-should-choose-full-loop-crm-for-your-business',
  '/partner-with-full-loop-crm',
  '/crm-partnership-request-form',
  '/feedback',
  '/location(.*)',
  '/api/webhooks(.*)',
  '/api/cron(.*)',
  '/team(.*)',              // Team portal uses PIN auth, not Clerk
  '/portal(.*)',            // Client portal uses phone/email auth, not Clerk
  '/join(.*)',              // Invite acceptance page
  '/referral(.*)',          // Public referral pages
  '/api/portal(.*)',        // Portal API routes
  '/api/team-portal(.*)',   // Team portal API routes
  '/api/leads',             // Lead capture from onboarding
  '/api/leads/visits(.*)',  // Visit tracking pixel
  '/api/referrals/track(.*)', // Referral click tracking
  '/api/health',              // Health check endpoint
  '/admin(.*)',               // Admin uses PIN auth, not Clerk
  '/admin-login',             // Admin PIN login page
  '/api/admin-auth(.*)',       // Admin PIN auth endpoint
  '/api/admin(.*)',            // Admin API routes use PIN auth, not Clerk
  '/api/requests',            // Partnership form submissions
  '/api/feedback',            // Feedback form submissions
  '/api/chat',                // Public web chat for tenant sites
  '/api/selena(.*)',          // Selena API routes
  '/api/tenant-sitemap',       // Tenant sitemap endpoint
  '/sitemap.xml',             // Sitemap
  '/robots.txt',              // Robots
  '/(.*)-crm-(.*)',           // Combo pages (industry x location)
  '/site(.*)',                // Tenant sites are public
  '/quote/(.*)',              // Public quote view + accept flow (token-auth)
  '/api/quotes/public(.*)',   // Public quote API (token-auth)
  '/invoice/(.*)',            // Public invoice view + pay flow (token-auth)
  '/api/invoices/public(.*)', // Public invoice API (token-auth)
  '/sign/(.*)',               // Public document signer view (token-auth)
  '/api/documents/public(.*)', // Public document signer API (token-auth)
  '/api/cpa/(.*)',             // CPA read-only access (token-auth)
  '/qualify',                  // Public prospect application form
  '/qualify(.*)',              // e.g. /qualify?cancelled=1
  '/welcome',                  // Post-Stripe-payment landing page
  '/api/prospects',            // Public prospect intake
  '/api/client(.*)',           // Ported nycmaid client-portal routes — tenant
                               // resolved via signed x-tenant-id header, not Clerk
  '/api/cleaner-applications', // Alias → /api/team-applications
  '/api/errors',               // Client-side error reporting — runs from any page
  '/api/track',                // Visit tracking pixel
  '/api/unsubscribe',          // Email unsubscribe (signed token verified in route)
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const hostname = req.headers.get('host') || req.headers.get('x-forwarded-host') || 'localhost'

  // --- Tenant subdomain routing (runs before Clerk auth) ---
  const subdomain = extractSubdomain(hostname)
  if (subdomain) {
    try {
      const tenant = await getTenantBySlug(subdomain)
      if (tenant && tenant.status === 'active') {
        return rewriteToSite(req, tenant.id, tenant.slug)
      }
    } catch (e) {
      console.error('Tenant subdomain lookup error:', e)
    }
    return NextResponse.next()
  }

  // --- Custom domain routing (runs before Clerk auth) ---
  if (!isMainHost(hostname)) {
    try {
      const tenant = await getTenantByDomain(hostname)
      if (tenant && tenant.status === 'active') {
        return rewriteToSite(req, tenant.id, tenant.slug)
      }
    } catch (e) {
      console.error('Tenant domain lookup error:', e)
    }
    // If domain lookup fails, fall through to main site
    return NextResponse.next()
  }

  // --- Main site / dashboard (existing behavior) ---
  if (!isPublicRoute(req)) {
    // Allow admin impersonation to bypass Clerk on dashboard + its API routes
    const impersonateCookie = req.cookies.get('fl_impersonate')?.value
    const adminCookie = req.cookies.get('admin_token')?.value
    if (impersonateCookie && adminCookie) {
      const p = req.nextUrl.pathname
      if (p.startsWith('/dashboard') || p.startsWith('/api/bookings') || p.startsWith('/api/clients') ||
          p.startsWith('/api/team') || p.startsWith('/api/finance') || p.startsWith('/api/campaigns') ||
          p.startsWith('/api/referrals') || p.startsWith('/api/settings') || p.startsWith('/api/google') ||
          p.startsWith('/api/social') || p.startsWith('/api/changelog') || p.startsWith('/api/feedback') ||
          p.startsWith('/api/security') || p.startsWith('/api/availability') || p.startsWith('/api/setup-checklist') ||
          p.startsWith('/api/notifications') || p.startsWith('/api/cleaners') || p.startsWith('/api/domain-notes') ||
          p.startsWith('/api/docs') || p.startsWith('/api/test-emails') || p.startsWith('/api/test/') ||
          p.startsWith('/api/migrate-') || p.startsWith('/api/reviews') || p.startsWith('/api/deals') ||
          p.startsWith('/api/attribution') || p.startsWith('/api/leads') || p.startsWith('/api/service-types') ||
          p.startsWith('/api/waitlist') || p.startsWith('/api/referrers') || p.startsWith('/api/dashboard') ||
          p.startsWith('/api/indexnow') || p.startsWith('/api/management-applications') ||
          p.startsWith('/api/import-clients') || p.startsWith('/api/sms') || p.startsWith('/api/schedules') ||
          p.startsWith('/api/send-booking-emails') || p.startsWith('/api/selena') ||
          p.startsWith('/api/referral-commissions')) {
        return
      }
    }
    await auth.protect()
  }
})

/**
 * Rewrite the request to the /site route group, passing tenant context via headers.
 * External URL stays clean (e.g. the-nyc-maid.homeservicesbusinesscrm.com/services)
 * but internally Next.js renders /site/services.
 */
function rewriteToSite(req: NextRequest, tenantId: string, tenantSlug: string): NextResponse {
  const pathname = req.nextUrl.pathname // e.g. "/" or "/services" or "/about"

  const tenantSig = signTenantHeader(tenantId)

  // Rewrite /sitemap.xml to the tenant sitemap API — pass slug via both
  // searchParam and header for robustness across Next.js rewrite behaviors.
  if (pathname === '/sitemap.xml') {
    const url = req.nextUrl.clone()
    url.pathname = '/api/tenant-sitemap'
    url.searchParams.set('slug', tenantSlug)
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

  // API routes + tenant-scoped app routes that live at the root are NOT
  // rewritten under /site — they run at their own path with tenant headers
  // injected so getTenantFromHeaders() can resolve them.
  const APP_ROOT_PREFIXES = [
    '/api/', '/portal', '/team', '/reviews/submit', '/unsubscribe',
    '/stripe-onboard', '/dashboard', '/admin',
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
  // at /site/<slug>/ — the onboarding script writes there. Older tenants without
  // a subtree fall back to the legacy shared /site/* tree.
  const sitePathname = pathname === '/'
    ? `/site/${tenantSlug}`
    : `/site/${tenantSlug}${pathname}`

  const url = req.nextUrl.clone()
  url.pathname = sitePathname

  const response = NextResponse.rewrite(url)
  response.headers.set('x-tenant-id', tenantId)
  response.headers.set('x-tenant-slug', tenantSlug)
  response.headers.set('x-tenant-sig', tenantSig)

  // Also set request headers so server components / route handlers can read them
  const requestHeaders = new Headers(req.headers)
  requestHeaders.delete('x-tenant-sig')
  requestHeaders.set('x-tenant-id', tenantId)
  requestHeaders.set('x-tenant-slug', tenantSlug)
  requestHeaders.set('x-tenant-sig', tenantSig)

  // NextResponse.rewrite with modified headers
  const rewriteUrl = req.nextUrl.clone()
  rewriteUrl.pathname = sitePathname
  return NextResponse.rewrite(rewriteUrl, {
    headers: response.headers,
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
