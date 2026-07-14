import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 — regression lock for ecfb6c6 ("client/login add per-tenant lockout
 * for distributed PIN spray"), confirmed present on this branch (p1-w4).
 *
 * Before ecfb6c6, client/login only throttled per (tenant, IP) at 5/10min.
 * An attacker guessing 6-digit PINs from rotating IPs (one or two guesses
 * per IP) never tripped any single IP's bucket, so the distributed spray
 * ran unthrottled. ecfb6c6 added a second, tenant-wide bucket
 * (`client-login-tenant:<tenant.id>` at 100/10min) that catches this
 * regardless of which IP each guess comes from.
 *
 * This file exercises the route's actual bucket-key logic (mocking
 * rateLimitDb's storage, not its call sites) so a regression that drops the
 * tenant-wide check — or narrows its key back to per-IP — fails loudly.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  buckets: new Map<string, number>(),
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: h.tenantId }),
}))

// Real bucket-key accounting, same semantics as rate-limit-db.ts: Nth call
// for a given key is allowed iff N <= max.
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, max: number) => {
    const next = (h.buckets.get(bucketKey) ?? 0) + 1
    h.buckets.set(bucketKey, next)
    return { allowed: next <= max, remaining: Math.max(0, max - next) }
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    }),
  },
}))

vi.mock('@/lib/client-auth', () => ({
  createClientSession: () => 'token',
  clientSessionCookieOptions: () => ({ name: 'client_session', httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 3600 }),
}))

vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))

import { POST } from './route'

function loginReq(ip: string, pin = '000000'): Request {
  return new Request('http://x/api/client/login', {
    method: 'POST',
    headers: new Headers({ 'x-forwarded-for': ip }),
    body: JSON.stringify({ pin }),
  })
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.buckets = new Map()
})

describe('client/login — per-tenant lockout catches distributed PIN spray (ecfb6c6)', () => {
  it('blocks the 101st guess for a tenant even when every guess comes from a DIFFERENT IP (each IP used once, so the per-IP 5/10min bucket never trips)', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 101; i++) {
      const res = await POST(loginReq(`10.0.0.${i}`))
      statuses.push(res.status)
    }
    // First 100 distinct-IP guesses pass rate limiting (wrong PIN -> 401).
    expect(statuses.slice(0, 100).every(s => s === 401)).toBe(true)
    // The 101st, from yet another fresh IP, trips the tenant-wide cap.
    expect(statuses[100]).toBe(429)
  })

  it('does NOT false-positive under normal load: 50 distinct-IP logins for one tenant all clear rate limiting', async () => {
    for (let i = 0; i < 50; i++) {
      const res = await POST(loginReq(`10.1.0.${i}`))
      expect(res.status).toBe(401) // wrong PIN, but not rate-limited
    }
  })

  it('the per-IP bucket (5/10min) still independently blocks a SINGLE IP hammering the same tenant', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const res = await POST(loginReq('10.9.9.9'))
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 5).every(s => s === 401)).toBe(true)
    expect(statuses[5]).toBe(429)
  })

  it('the tenant-wide cap is scoped per tenant — a spray against tenant-A does not lock out tenant-B', async () => {
    h.tenantId = 'tenant-A'
    for (let i = 0; i < 100; i++) {
      await POST(loginReq(`10.2.0.${i}`))
    }
    // Tenant-A is now locked out.
    h.tenantId = 'tenant-A'
    const lockedOut = await POST(loginReq('10.2.0.200'))
    expect(lockedOut.status).toBe(429)

    // Tenant-B, a fresh tenant bucket, is unaffected.
    h.tenantId = 'tenant-B'
    const otherTenant = await POST(loginReq('10.2.0.201'))
    expect(otherTenant.status).toBe(401)
  })
})
