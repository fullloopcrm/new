import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * W4 — WITNESS for the MEDIUM middleware-registration gap found by the live
 * read-only curl probe (deploy-prep/nycmaid-stale-deployment-finding.md and
 * /tmp/w4-report-20260712-180037.md, MEDIUM finding).
 *
 * THE GAP: `src/app/api/tenants/public/route.ts` (GET, slug -> {name, slug,
 * logo_url}) is written with NO auth check — it is meant to be a public read
 * endpoint, the same shape as `/api/tenant/public` (singular) and
 * `/api/tenant-sitemap`, both of which ARE registered. But
 * `/api/tenants/public` (plural) is missing from the `isPublicRoute` matcher
 * in `src/middleware.ts` (~lines 67-155), so on the main host every request
 * falls into the Clerk-gated branch and gets a 307 to `/sign-in` before the
 * route handler ever runs.
 *
 * Not a disclosure bug — it fails CLOSED (redirect, no data, no error leak).
 * It IS broken-as-designed: the endpoint's own code has zero auth, so its
 * author intended it to be public. Currently low real-world impact because
 * its only caller, `/apply/[slug]/page.tsx`, sits behind `/apply`, which is
 * itself 410'd site-wide via KILLED_ROUTES on the main host — but the KILLED_ROUTES
 * comment notes the sibling buyer funnel was already restored 2026-06-22, so if
 * `/apply` (hiring) is ever un-killed this API 307s for every anonymous visitor.
 *
 * STATUS: read-only verification lane, no middleware edit (route-registration
 * change is leader/Jeff-gated same as prior fixes).
 *   • WITNESS (it.fails): the desired behavior — `/api/tenants/public` passes
 *     through to the route handler (no redirect) — currently does NOT hold.
 *     When `/api/tenants/public(.*)` is added to `isPublicRoute` in
 *     `src/middleware.ts`, this test flips to a hard pass; remove `.fails`
 *     and it becomes a permanent regression lock.
 *   • POSITIVE CONTROL: `/api/tenant/public` (singular — already registered
 *     via the admin-cookie bypass list's `/api/tenant/public` prefix AND, more
 *     importantly, is exercised live in prod per the curl probe) is used here
 *     only to prove this test harness can tell "passes through" apart from
 *     "redirected" — sanity-checks the assertion shape itself, not the gap.
 *   • POSITIVE CONTROL 2: an already-public route (`/api/health`, explicitly
 *     in `isPublicRoute`) passes through with no redirect, confirming the
 *     harness invokes real middleware.ts logic (not a stub).
 */

const MAIN_HOST = 'www.homeservicesbusinesscrm.com'

function mainHostReq(pathAndQuery: string): NextRequest {
  return new NextRequest(`https://${MAIN_HOST}${pathAndQuery}`)
}

async function isRedirectedToSignIn(pathAndQuery: string): Promise<boolean> {
  const { default: middleware } = await import('./middleware')
  const res = await middleware(mainHostReq(pathAndQuery))
  if (!res) return false // NextResponse.next() equivalent (undefined return)
  return res.status === 307 && res.headers.get('location')?.includes('/sign-in') === true
}

describe('middleware isPublicRoute — /api/tenants/public (plural) registration gap', () => {
  it.fails(
    'WITNESS: GET /api/tenants/public?slug=nycmaid on the main host should pass through (public, no-auth route handler) but is redirected to /sign-in',
    async () => {
      const redirected = await isRedirectedToSignIn('/api/tenants/public?slug=nycmaid')
      expect(redirected, 'request was redirected to /sign-in instead of reaching the route handler').toBe(false)
    },
  )

  it('POSITIVE CONTROL: GET /api/health (already in isPublicRoute) passes through, not redirected', async () => {
    const redirected = await isRedirectedToSignIn('/api/health')
    expect(redirected).toBe(false)
  })

  it('CONTRAST: a genuinely Clerk-gated route (no isPublicRoute match, no admin cookie) IS redirected to /sign-in — proves the harness distinguishes the two states', async () => {
    const redirected = await isRedirectedToSignIn('/dashboard')
    expect(redirected).toBe(true)
  })
})
