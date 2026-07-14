import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

/**
 * middleware's admin_token bypass gate used to be presence-only
 * (`if (adminCookie)`) — any cookie value, garbage or expired, let a request
 * past the Clerk-redirect gate and into the dashboard API surface (the route
 * handler's own verifyAdminToken() would still 401 it, so this was never a
 * confirmed live bypass, but it was a weak edge check). This locks in that
 * middleware now verifies the HMAC + expiry itself (admin-token-edge-verify.ts)
 * before treating the cookie as authenticating, fail-closed on anything that
 * doesn't verify.
 */

const SECRET = 'mw-admin-token-test-secret'
const MAIN_HOST = 'homeservicesbusinesscrm.com'
const GATED_PATH = '/api/notifications' // in the admin_token bypass allowlist

function signToken(payload: Record<string, unknown>, secret = SECRET): string {
  const json = JSON.stringify(payload)
  const hmac = createHmac('sha256', secret).update(json).digest('hex')
  return Buffer.from(json).toString('base64') + '.' + hmac
}

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = SECRET
})

describe('middleware — admin_token verification (not presence-only)', () => {
  it('CONTROL: a real, valid super_admin token bypasses the sign-in redirect', async () => {
    const { default: middleware } = await import('./middleware')
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 })
    const req = new NextRequest(`https://${MAIN_HOST}${GATED_PATH}`, {
      headers: { host: MAIN_HOST, cookie: `admin_token=${token}` },
    })

    const res = await middleware(req)
    expect(res).toBeUndefined() // bypass = fall through, not a redirect
  })

  it('rejects a forged token (valid base64 JSON, garbage signature)', async () => {
    const { default: middleware } = await import('./middleware')
    const forged = Buffer.from(JSON.stringify({ role: 'super_admin', exp: Date.now() + 60_000 })).toString('base64') + '.' + 'deadbeef'.repeat(8)
    const req = new NextRequest(`https://${MAIN_HOST}${GATED_PATH}`, {
      headers: { host: MAIN_HOST, cookie: `admin_token=${forged}` },
    })

    const res = await middleware(req)
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/sign-in')
  })

  it('rejects an expired token', async () => {
    const { default: middleware } = await import('./middleware')
    const token = signToken({ role: 'super_admin', exp: Date.now() - 1000 })
    const req = new NextRequest(`https://${MAIN_HOST}${GATED_PATH}`, {
      headers: { host: MAIN_HOST, cookie: `admin_token=${token}` },
    })

    const res = await middleware(req)
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/sign-in')
  })

  it('rejects a token signed with the wrong secret', async () => {
    const { default: middleware } = await import('./middleware')
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 }, 'wrong-secret')
    const req = new NextRequest(`https://${MAIN_HOST}${GATED_PATH}`, {
      headers: { host: MAIN_HOST, cookie: `admin_token=${token}` },
    })

    const res = await middleware(req)
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/sign-in')
  })

  it('rejects a plain non-empty garbage cookie value (the old presence-only pass condition)', async () => {
    const { default: middleware } = await import('./middleware')
    const req = new NextRequest(`https://${MAIN_HOST}${GATED_PATH}`, {
      headers: { host: MAIN_HOST, cookie: 'admin_token=just-some-string' },
    })

    const res = await middleware(req)
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/sign-in')
  })

  it('rejects a tenant_admin-role token (not the super-admin role this gate is for)', async () => {
    const { default: middleware } = await import('./middleware')
    const token = signToken({ role: 'tenant_admin', tenantId: 't-1', memberId: 'm-1', exp: Date.now() + 60_000 })
    const req = new NextRequest(`https://${MAIN_HOST}${GATED_PATH}`, {
      headers: { host: MAIN_HOST, cookie: `admin_token=${token}` },
    })

    const res = await middleware(req)
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/sign-in')
  })

  it('with no admin_token cookie at all, still redirects to sign-in (unchanged prior behavior)', async () => {
    const { default: middleware } = await import('./middleware')
    const req = new NextRequest(`https://${MAIN_HOST}${GATED_PATH}`, {
      headers: { host: MAIN_HOST },
    })

    const res = await middleware(req)
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toContain('/sign-in')
  })
})
