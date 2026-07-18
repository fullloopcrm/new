import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

/**
 * isPublicRoute's old '/api/client(.*)' pattern had no path-segment boundary
 * — createRouteMatcher converts '(.*)' to a bare '.*' with nothing requiring
 * a '/' immediately before it — so it matched ANY pathname merely PREFIXED
 * by "client", not just the intended '/api/client/...' nycmaid client-portal
 * routes: '/api/clients' (the full CRM customer API) and '/api/client-reviews'
 * were both silently treated as fully public, skipping this file's entire
 * Clerk/admin-impersonation gate for them with zero drift signal (see
 * matchesAppRootPrefix in src/middleware.ts and its own boundary-bug fix for
 * the sibling class of bug in the tenant-routing gate instead of this
 * auth gate). Not a live data leak — both routes still self-gate via
 * getTenantForRequest()/requirePermission(), which requires a valid Clerk
 * session or admin_token regardless of what middleware does — but narrowing
 * the pattern to '/api/client/(.*)' means '/api/client-reviews' now needs its
 * own entry in the admin-impersonation bypass allowlist below, since it was
 * previously reaching the route handler only because isPublicRoute
 * short-circuited past that allowlist by accident. This pins both halves of
 * the fix directly against the real middleware() function, not a regex
 * reimplementation.
 */

const SECRET = 'mw-client-reviews-test-secret'
const MAIN_HOST = 'homeservicesbusinesscrm.com'

function signToken(payload: Record<string, unknown>, secret = SECRET): string {
  const json = JSON.stringify(payload)
  const hmac = createHmac('sha256', secret).update(json).digest('hex')
  return Buffer.from(json).toString('base64') + '.' + hmac
}

function req(path: string, cookie?: string): NextRequest {
  return new NextRequest(`https://${MAIN_HOST}${path}`, {
    headers: cookie ? { host: MAIN_HOST, cookie } : { host: MAIN_HOST },
  })
}

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = SECRET
})

describe('middleware — /api/client(.*) boundary fix', () => {
  it('still treats the real nycmaid client-portal path as fully public (no admin_token needed)', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(req('/api/client/bookings'))
    expect(res).toBeUndefined() // isPublicRoute matched -> falls through with no gate at all
  })

  it('no longer treats /api/clients as public — an unauthenticated request now redirects to sign-in', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(req('/api/clients'))
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/sign-in')
  })

  it('/api/clients still passes with a valid admin_token (unaffected — already in the bypass allowlist)', async () => {
    const { default: middleware } = await import('./middleware')
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 })
    const res = await middleware(req('/api/clients', `admin_token=${token}`))
    expect(res).toBeUndefined()
  })

  it('no longer treats /api/client-reviews as public — an unauthenticated request now redirects to sign-in', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(req('/api/client-reviews'))
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/sign-in')
  })

  it('/api/client-reviews passes with a valid admin_token — the new bypass-allowlist entry this fix required', async () => {
    const { default: middleware } = await import('./middleware')
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 })
    const res = await middleware(req('/api/client-reviews', `admin_token=${token}`))
    expect(res).toBeUndefined()
  })

  it('/api/client-reviews/some-id also passes with a valid admin_token (nested path, same prefix)', async () => {
    const { default: middleware } = await import('./middleware')
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 })
    const res = await middleware(req('/api/client-reviews/abc123', `admin_token=${token}`))
    expect(res).toBeUndefined()
  })

  it('/api/client-analytics is unaffected — remains public via its own separate, explicit entry', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(req('/api/client-analytics'))
    expect(res).toBeUndefined()
  })
})
