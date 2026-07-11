import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Local path matcher — replaces Clerk's createRouteMatcher. Patterns use the
// same '(.*)' glob syntax; each is anchored and tested against the pathname.
function createRouteMatcher(patterns: string[]) {
  const res = patterns.map((p) => new RegExp('^' + p.replace(/\(\.\*\)/g, '.*') + '$'))
  return (req: NextRequest) => res.some((re) => re.test(req.nextUrl.pathname))
}
import { getTenantBySlug, getTenantByDomain } from '@/lib/tenant-lookup'
import { signTenantHeader } from '@/lib/tenant-header-sig'

// Hosts that are the marketing site / main app (not tenant sites)
const MAIN_HOSTS = new Set([
  'homeservicesbusinesscrm.com',
  'www.homeservicesbusinesscrm.com',
  'fullloopcrm.com',
  'www.fullloopcrm.com',
  'localhost',
  '127.0.0.1',
  'platform-ten-psi.vercel.app',
])

// A tenant's public site (carrying domain or custom domain) serves in every
// state EXCEPT the ones where it should be dark. New tenants are 'setup'/
// 'pending' and must still show their live site immediately (booking + collect
// work before full activation) — gating on status==='active' hid every new
// tenant behind the Full Loop marketing page until the onboarding gate passed.
const NON_SERVING_STATUSES = new Set(['suspended', 'cancelled', 'deleted'])
function tenantServesSite(status: string | null | undefined): boolean {
  return !NON_SERVING_STATUSES.has(status ?? '')
}

function isMainHost(hostname: string): boolean {
  // Strip port for comparison
  const host = hostname.split(':')[0]
  return MAIN_HOSTS.has(host)
}

// Routes killed during the 2026-05-03 teaser pivot. Strategy shifted away
// from licensing the platform to operators; these pages all assumed a
// buyer/applicant funnel that no longer exists. Returning 410 (not 404)
// tells Google to drop them from the index quickly.
const KILLED_ROUTES = [
  // /apply is tenant-scoped hiring, not part of the Full Loop buyer funnel —
  // kept 410 on the main host only. The buyer funnel was restored 2026-06-22.
  '/apply',
]

function isKilledRoute(pathname: string): boolean {
  return KILLED_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0]
  // Match *.homeservicesbusinesscrm.com or *.fullloopcrm.com (carrying/holding
  // domain — tenants are served at <slug>.fullloopcrm.com until their real
  // custom domain is pointed at the platform).
  const match = host.match(/^([a-z0-9-]+)\.(?:homeservicesbusinesscrm|fullloopcrm)\.com$/)
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
  '/full-loop-crm-service-features',
  '/partner-with-full-loop-crm',
  '/full-loop-crm-pricing',
  '/full-loop-crm-frequently-asked-questions',
  '/agreement',
  '/waitlist',
  '/onboarding(.*)',
  '/businesses',
  '/full-loop-crm-service-business-industries',
  '/industry(.*)',
  '/feature(.*)',           // Per-feature SEO landing pages
  '/(.*)-business-crm',
  '/crm-for-(.*)',
  '/locations(.*)',
  '/home-service-crm-locations',
  '/services(.*)',
  '/about-full-loop-crm',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/accessibility',
  '/full-loop-crm-101-educational-tips',
  '/why-you-should-choose-full-loop-crm-for-your-business',
  '/case-study(.*)',
  '/home-service-business-blog(.*)',
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
  '/fullloop',                // Per-tenant operator PIN login page
  '/reset-pin',               // Self-service tenant PIN reset page
  '/api/pin-reset(.*)',       // Self-service PIN reset (tenant via signed header)
  '/api/admin-auth(.*)',       // Admin PIN auth endpoint
  '/api/admin(.*)',            // Admin API routes use PIN auth, not Clerk
  '/proposal(.*)',            // Post-payment redirect pages (thank-you / cancelled)
  '/api/requests',            // Partnership form submissions
  '/api/territories/options', // Public territory/category options for the lead form (no PII)
  '/geo(.*)',                 // Static map assets (US county polygons) for the territory map
  '/api/inquiry',             // Marketing-site contact form (homeservicesbusinesscrm.com/contact)
  '/api/feedback',            // Feedback form submissions
  '/api/contact',             // Tenant-aware contact form lead capture (tenant resolved from host)
  '/api/public-upload',       // Public tenant-aware media upload for marketing-site forms (size/type limited)
  '/api/ingest(.*)',          // Cross-site application ingest (INGEST_SECRET-gated, tenant via slug)
  '/api/chat',                // Public web chat for tenant sites
  '/api/yinez(.*)',           // Public Yinez agent chat endpoint
  '/api/admin-chat(.*)',      // Admin chat (Yinez owner-side) uses admin PIN auth
  '/api/auth(.*)',            // Ported nycmaid cookie/bcrypt auth endpoints
  '/api/client-analytics(.*)', // Client analytics admin endpoint (admin PIN gated in route)
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
  '/api/territories/options',  // Public territory + service-category options for lead forms
  '/api/client(.*)',           // Ported nycmaid client-portal routes — tenant
                               // resolved via signed x-tenant-id header, not Clerk
  '/api/cleaner-applications', // Alias → /api/team-applications
  '/api/errors',               // Client-side error reporting — runs from any page
  '/api/track',                // Visit tracking pixel
  '/api/unsubscribe',          // Email unsubscribe (signed token verified in route)
])

export default async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || req.headers.get('x-forwarded-host') || 'localhost'

  // --- Canonical www redirect (301) ---
  // Every apex domain redirects to its www. equivalent so www is canonical
  // everywhere. Excludes: hosts already on www, localhost, raw IPs,
  // *.vercel.app preview hosts, and the *.fullloopcrm.com /
  // *.homeservicesbusinesscrm.com carrying SUBDOMAINS (a subdomain has no www).
  // The bare apex fullloopcrm.com / homeservicesbusinesscrm.com are NOT excluded
  // — they don't end with the leading-dot suffix — so they flip to www too.
  // NOTE: the old www.homeservicesbusinesscrm.com -> apex redirect in
  // next.config.ts was removed alongside this; keeping it would infinite-loop.
  const canonicalHost = hostname.split(':')[0].toLowerCase()
  // Apex-canonical tenants: their site is served at the bare apex, NOT www.
  // These are ex-standalone builds migrated to FL whose www subdomain isn't
  // cleanly served on FL (Vercel treats the apex as primary and 307s www->apex,
  // which fights the apex->www redirect below and infinite-loops). Serving them
  // at the apex — their original canonical — breaks the loop with no DNS work.
  const APEX_CANONICAL_DOMAINS = new Set<string>([
    'consortiumnyc.com',
    'thenycmarketingcompany.com',
    'thenycinteriordesigner.com',
  ])
  if (
    // Never canonical-redirect API routes. A 301 on a POST is downgraded to GET
    // with the body dropped, so an apex-host admin POST (e.g. Activate) gets
    // bounced to another host as a bodiless GET and 405s. Canonicalization is
    // for pages/SEO, not APIs.
    !req.nextUrl.pathname.startsWith('/api/') &&
    !canonicalHost.startsWith('www.') &&
    !APEX_CANONICAL_DOMAINS.has(canonicalHost) &&
    canonicalHost !== 'localhost' &&
    canonicalHost.includes('.') &&
    !canonicalHost.endsWith('.vercel.app') &&
    !canonicalHost.endsWith('.fullloopcrm.com') &&
    !canonicalHost.endsWith('.homeservicesbusinesscrm.com') &&
    !/^\d+\.\d+\.\d+\.\d+$/.test(canonicalHost)
  ) {
    const url = req.nextUrl.clone()
    url.protocol = 'https'
    url.hostname = `www.${canonicalHost}`
    url.port = ''
    return NextResponse.redirect(url, 301)
  }

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

  // --- Tenant subdomain routing (runs before Clerk auth) ---
  const subdomain = extractSubdomain(hostname)
  if (subdomain) {
    try {
      const tenant = await getTenantBySlug(subdomain)
      if (tenant && tenantServesSite(tenant.status)) {
        return rewriteToSite(req, tenant.id, tenant.slug)
      }
    } catch (e) {
      console.error('Tenant subdomain lookup error:', e)
    }
    return NextResponse.next()
  }

  // --- Custom domain routing (runs before Clerk auth) ---
  if (!isMainHost(hostname)) {
    // Static fallback map — used when DB lookup at the edge is unreliable.
    // The tenant id here is informational only; rewriteToSite signs the slug.
    const STATIC_TENANT_MAP: Record<string, { id: string; slug: string }> = {
      'thefloridamaid.com': { id: '56490a6b-820c-49e6-8c14-cb4e54ffcb06', slug: 'the-florida-maid' },
      'www.thefloridamaid.com': { id: '56490a6b-820c-49e6-8c14-cb4e54ffcb06', slug: 'the-florida-maid' },
    }
    const cleanHost = hostname.split(':')[0].toLowerCase()
    const staticTenant = STATIC_TENANT_MAP[cleanHost]
    if (staticTenant) {
      return rewriteToSite(req, staticTenant.id, staticTenant.slug)
    }
    try {
      const tenant = await getTenantByDomain(hostname)
      if (tenant && tenantServesSite(tenant.status)) {
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
    // Allow admin (PIN-auth) to bypass Clerk on dashboard + its API routes.
    // admin_token alone is enough — an admin hitting /dashboard directly (no
    // active impersonation) must not fall through to Clerk's handshake.
    const adminCookie = req.cookies.get('admin_token')?.value
    if (adminCookie) {
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
          p.startsWith('/api/quotes') || p.startsWith('/api/quote-templates') ||
          p.startsWith('/api/jobs') || p.startsWith('/api/catalog') || p.startsWith('/api/crews') ||
          p.startsWith('/api/referral-commissions') ||
          // H-01: these owner APIs were missing, so super-admin impersonation
          // fell through to Clerk → 404 (Sales Pipeline, sidebar badges, invoices,
          // payments, schedule, routes, etc.). Tenant scope is still enforced in-route.
          p.startsWith('/api/pipeline') || p.startsWith('/api/sidebar-counts') ||
          p.startsWith('/api/invoices') || p.startsWith('/api/documents') ||
          p.startsWith('/api/payments') || p.startsWith('/api/recurring-expenses') ||
          p.startsWith('/api/routes') || p.startsWith('/api/schedule') ||
          p.startsWith('/api/service-area') || p.startsWith('/api/sales-applications') ||
          p.startsWith('/api/audit') || p.startsWith('/api/connect') ||
          p.startsWith('/api/tenant/public')) {
        return
      }
    }
    // Owner login is dormant (moved off Clerk). Protected owner routes that
    // aren't admin-impersonated redirect to sign-in until the session-based
    // owner login is wired (P5).
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
}

/**
 * Rewrite the request to the /site route group, passing tenant context via headers.
 * External URL stays clean (e.g. the-nyc-maid.homeservicesbusinesscrm.com/services)
 * but internally Next.js renders /site/services.
 */
function rewriteToSite(req: NextRequest, tenantId: string, tenantSlug: string): NextResponse {
  const pathname = req.nextUrl.pathname // e.g. "/" or "/services" or "/about"

  const tenantSig = signTenantHeader(tenantId)

  // Rewrite /sitemap.xml. Tenants in TENANTS_WITH_RICH_SITEMAP own a
  // sitemap.ts at /site/<slug>/sitemap.xml that enumerates their full
  // route tree. All other tenants fall back to the generic 7-URL
  // /api/tenant-sitemap until they ship their own rich sitemap.
  const TENANTS_WITH_RICH_SITEMAP = new Set(['the-nyc-exterminator', 'the-florida-maid', 'nycmaid', 'nyc-mobile-salon', 'the-nyc-seo', 'consortium-nyc', 'the-nyc-marketing-company', 'nyc-tow', 'theroadsidehelper', 'toll-trucks-near-me', 'we-pay-you-junk', 'the-home-services-company', 'nycroadsideemergencyassistance', 'fla-dumpster-rentals', 'landscaping-in-nyc', 'the-nyc-interior-designer', 'debt-service-ratio-loan', 'stretch-ny', 'stretch-service'])
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

  // API routes + tenant-scoped app routes that live at the root are NOT
  // rewritten under /site — they run at their own path with tenant headers
  // injected so getTenantFromHeaders() can resolve them.
  const APP_ROOT_PREFIXES = [
    '/api/', '/portal', '/team', '/reviews/submit', '/unsubscribe',
    '/stripe-onboard', '/dashboard', '/admin', '/fullloop', '/reset-pin',
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
    'wash-and-fold-hoboken',
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
  const siteBase = ROOT_SITE_TENANTS.has(tenantSlug)
    ? '/site'
    : BESPOKE_SITE_TENANTS.has(tenantSlug)
      ? `/site/${tenantSlug}`
      : '/site/template'
  const sitePathname = pathname === '/' ? siteBase : `${siteBase}${pathname}`

  const url = req.nextUrl.clone()
  url.pathname = sitePathname

  const response = NextResponse.rewrite(url)
  response.headers.set('x-tenant-id', tenantId)
  response.headers.set('x-tenant-slug', tenantSlug)
  response.headers.set('x-tenant-sig', tenantSig)

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
