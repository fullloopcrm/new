import { describe, it, expect, vi } from 'vitest'

/**
 * admin-auth is the highest-privilege login in the platform: it mints the
 * super-admin (god-mode, ANY tenant) token as well as tenant-admin tokens.
 * Its rate limiter was called with no failClosed option, so a DB outage on
 * the rate_limit_events count/insert made the limiter fail OPEN -- the one
 * guard between the internet and unlimited PIN guessing against the whole
 * platform would silently drop during exactly the kind of DB blip an
 * attacker can't cause but can wait for. Every other auth-critical endpoint
 * in this codebase (pin-reset, portal/auth, client/verify-code, referrer
 * verify) opts into failClosed; this one must too.
 */

const rlCalls: Array<{ key: string; opts: { failClosed?: boolean } }> = []

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, _max: number, _windowMs: number, opts: { failClosed?: boolean } = {}) => {
    rlCalls.push({ key: bucketKey, opts })
    // Deny immediately so the test never has to touch SECRET/tenant/DB lookups.
    return { allowed: false, remaining: 0 }
  },
}))

import { POST } from './route'

function login() {
  return new Request('https://x/api/admin-auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
    body: JSON.stringify({ pin: '0000' }),
  })
}

describe('admin-auth rate limit', () => {
  it('opts the super-admin/tenant-admin PIN gate into failClosed', async () => {
    await POST(login())
    const call = rlCalls.find((c) => c.key === 'admin_auth:10.0.0.1')
    expect(call?.opts.failClosed).toBe(true)
  })

  it('denies (429) once the limiter says not allowed', async () => {
    const res = await POST(login())
    expect(res.status).toBe(429)
  })
})
