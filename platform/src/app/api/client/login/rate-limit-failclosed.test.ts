import { describe, it, expect, vi } from 'vitest'

/**
 * client/login is a 6-digit client PIN gate. Both its rate-limit buckets
 * (per-IP and per-tenant) were called with no failClosed option, so a DB
 * outage on the rate_limit_events count/insert made the limiter fail OPEN,
 * allowing unlimited PIN guessing against a tenant's client roster for the
 * duration of the outage. Same fix class as admin-auth and team-portal/auth:
 * opt both buckets into failClosed.
 */

const TENANT = 'tenant-a'
const rlCalls: Array<{ key: string; opts: { failClosed?: boolean } }> = []

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, _max: number, _windowMs: number, opts: { failClosed?: boolean } = {}) => {
    rlCalls.push({ key: bucketKey, opts })
    // Deny immediately so the test never has to touch the client/tenantDb lookup.
    return { allowed: false, remaining: 0 }
  },
}))

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ id: TENANT }) }))

import { POST } from './route'

function login() {
  return new Request('https://x/api/client/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
    body: JSON.stringify({ pin: '123456' }),
  })
}

describe('client/login rate limit', () => {
  it('opts both the per-IP and per-tenant PIN gates into failClosed', async () => {
    await POST(login())
    const ipCall = rlCalls.find((c) => c.key === `client-login:${TENANT}:10.0.0.1`)
    const tenantCall = rlCalls.find((c) => c.key === `client-login-tenant:${TENANT}`)
    expect(ipCall?.opts.failClosed).toBe(true)
    expect(tenantCall?.opts.failClosed).toBe(true)
  })

  it('denies (429) once either limiter says not allowed', async () => {
    const res = await POST(login())
    expect(res.status).toBe(429)
  })
})
