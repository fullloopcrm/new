import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Regression guard for two real bugs found and fixed in the custom-domain
// routing branch of src/middleware.ts (W3 reconcile lane): a getTenantByDomain
// call site bug and a stale admin-impersonation bypass list, same H-01 class
// as the "these owner APIs were missing" fix (commit 66fdc031).
//
// PURE SOURCE-READING (no bundler, no runtime eval, no Edge Runtime), matching
// the sibling seo-*.test.ts source-invariant guards — middleware.ts imports
// next/server APIs that don't run under plain vitest.

const MIDDLEWARE_PATH = join(process.cwd(), 'src', 'middleware.ts')

function middlewareSource(): string {
  return readFileSync(MIDDLEWARE_PATH, 'utf8')
}

describe('middleware.ts custom-domain routing — cleanHost vs raw hostname', () => {
  it('calls getTenantByDomain with cleanHost (port-stripped, lowercased), not the raw hostname', () => {
    const src = middlewareSource()
    // The bug: getTenantByDomain(hostname) — the raw, un-normalized Host
    // header — silently fails to resolve any domain carrying a port suffix
    // or non-lowercase casing, because getTenantByDomain only ever strips a
    // leading "www." (see tenant-lookup.ts), nothing else. cleanHost is
    // already computed two lines above this call for the STATIC_TENANT_MAP
    // lookup; the fix is to reuse it here too.
    expect(
      src.includes('getTenantByDomain(cleanHost)'),
      'middleware.ts custom-domain branch no longer calls getTenantByDomain(cleanHost) — ' +
        'if it reverted to getTenantByDomain(hostname), a port-suffixed or mixed-case Host ' +
        'header would silently fail tenant resolution and fall through to the main site.',
    ).toBe(true)
    expect(src.includes('getTenantByDomain(hostname)')).toBe(false)
  })
})

describe('middleware.ts admin-impersonation bypass list — dashboard-fetched routes stay covered', () => {
  it('covers /api/booking-notes, /api/projects, /api/permissions, /api/ai (H-01 class)', () => {
    const src = middlewareSource()
    // Each of these is fetched directly from a dashboard component
    // (BookingNotes.tsx, ProjectsView.tsx, dashboard-shell.tsx on EVERY
    // /dashboard page load, ai-assistant.tsx / campaigns/page.tsx) and
    // resolves tenant context via getTenantForRequest()/requirePermission().
    // Missing from this bypass list means an admin-impersonated request to
    // any of them 307s to /sign-in instead of running the route.
    for (const prefix of ['/api/booking-notes', '/api/projects', '/api/permissions', '/api/ai']) {
      expect(
        src.includes(`p.startsWith('${prefix}')`),
        `middleware.ts admin-impersonation bypass list no longer covers '${prefix}' — ` +
          'admin-impersonated requests to it will fall through to the /sign-in redirect.',
      ).toBe(true)
    }
  })

  it('covers /api/push (H-01 class — the AdminSidebar/DashboardHeader push-notification toggle)', () => {
    const src = middlewareSource()
    // POST /api/push/subscribe's role:'admin' branch (the default) calls
    // getTenantForRequest() same as every route above. Its only live
    // dashboard caller is <PushPrompt role="admin" /> in AdminSidebar.tsx /
    // DashboardHeader.tsx on nyc-mobile-salon, wash-and-fold-nyc, and
    // wash-and-fold-hoboken.
    expect(
      src.includes(`p.startsWith('/api/push')`),
      "middleware.ts admin-impersonation bypass list no longer covers '/api/push' — " +
        'admin-impersonated requests to the push-notification toggle will fall through to the /sign-in redirect.',
    ).toBe(true)
  })
})

describe('middleware.ts public-route list — /api/uploads stays covered (H-01 class)', () => {
  it('covers /api/uploads (team-portal photo upload, self-gated via getPortalAuth/getTenantForRequest)', () => {
    const src = middlewareSource()
    // app/team/page.tsx's handlePhotoUpload (POST /api/uploads' only real
    // caller) sends a portal bearer token, not an admin_token cookie — the
    // route itself checks getPortalAuth() before falling back to
    // getTenantForRequest(), same as every other team-portal route. Without
    // /api/uploads in isPublicRoute, a team member hitting it on the main
    // host (no admin_token cookie) falls through to the /sign-in redirect
    // before the route's own auth check ever runs.
    expect(
      src.includes(`'/api/uploads'`),
      "middleware.ts isPublicRoute list no longer covers '/api/uploads' — " +
        'team-portal photo upload requests on the main host will fall through to the /sign-in redirect.',
    ).toBe(true)
  })

  it('covers /api/push/subscribe (team_member/client push registration, self-gated via getPortalAuth/protectClientAPI)', () => {
    const src = middlewareSource()
    // app/team/page.tsx and app/portal/page.tsx both render the global
    // <PushPrompt> on the main host (they're isPublicRoute pages, not tenant
    // subdomains) with role team_member/client. Those roles authenticate via
    // getPortalAuth()/protectClientAPI() inside the route, not the
    // admin_token cookie the admin-impersonation bypass list below checks —
    // that bypass list already covers role:'admin', but team_member/client
    // callers have no admin_token cookie at all. Without this entry in
    // isPublicRoute, those requests 307 to /sign-in before the route's own
    // in-route auth check ever runs, same H-01 shape as /api/uploads above.
    expect(
      src.includes(`'/api/push/subscribe'`),
      "middleware.ts isPublicRoute list no longer covers '/api/push/subscribe' — " +
        'team_member/client push-registration requests on the main host will fall through to the /sign-in redirect.',
    ).toBe(true)
  })
})
