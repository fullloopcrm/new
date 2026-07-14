import { describe, it, expect, vi } from 'vitest'

/**
 * team-portal/auth logs a cleaner in with a bare PIN (no separate identifier
 * to key on, by design -- see the route's own comment). Its rate limiter was
 * called with no failClosed option, so a DB outage on the rate_limit_events
 * count/insert made the limiter fail OPEN, allowing unlimited PIN guessing
 * against a tenant's team members for the duration of the outage. Same fix
 * class as admin-auth and pin-reset: opt in to failClosed.
 */

const rlCalls: Array<{ key: string; opts: { failClosed?: boolean } }> = []

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, _max: number, _windowMs: number, opts: { failClosed?: boolean } = {}) => {
    rlCalls.push({ key: bucketKey, opts })
    // Deny immediately so the test never has to touch the tenant/member lookups.
    return { allowed: false, remaining: 0 }
  },
}))

import { POST } from './route'

function login() {
  return new Request('https://x/api/team-portal/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
    body: JSON.stringify({ pin: '1234', tenant_slug: 'acme' }),
  })
}

describe('team-portal/auth rate limit', () => {
  it('opts the PIN gate into failClosed', async () => {
    await POST(login())
    const call = rlCalls.find((c) => c.key === 'team_portal_auth:acme:10.0.0.1')
    expect(call?.opts.failClosed).toBe(true)
  })

  it('denies (429) once the limiter says not allowed', async () => {
    const res = await POST(login())
    expect(res.status).toBe(429)
  })
})
