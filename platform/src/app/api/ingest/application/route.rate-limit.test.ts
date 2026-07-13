import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * ingest/application POST — rate-limit hardening.
 *
 * GAP (fixed this pass): this route is gated by one `INGEST_SECRET` shared
 * across every standalone tenant site, with no per-caller identity distinct
 * from the secret itself. Nothing bounded how many guesses an attacker could
 * make against that secret, or how many rows they could insert once right —
 * no rate limiter existed on this route at all. FIX: added `rateLimitDb`
 * keyed by IP, `{failClosed: true}` (same class as auth_login/admin_auth —
 * a DB outage must deny, not open unlimited brute force), checked *before*
 * the secret compare so guessing attempts still count.
 */

let rateLimitCalls: Array<{ key: string; max: number; windowMs: number; opts?: { failClosed?: boolean } }>
let rateLimitAllowed: boolean

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (
    key: string,
    max: number,
    windowMs: number,
    opts?: { failClosed?: boolean }
  ) => {
    rateLimitCalls.push({ key, max, windowMs, opts })
    return rateLimitAllowed
      ? { allowed: true, remaining: max - 1 }
      : { allowed: false, remaining: 0 }
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      throw new Error('should not reach the DB when rate-limited or unauthorized')
    },
  },
}))

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: async () => {
    throw new Error('should not resolve tenant when rate-limited or unauthorized')
  },
}))

vi.mock('@/lib/notify', () => ({
  notify: async () => {},
}))

import { POST } from './route'

function req(opts: { secret?: string; ip?: string; body?: unknown }): Request {
  const headers = new Map<string, string>()
  if (opts.secret !== undefined) headers.set('x-ingest-secret', opts.secret)
  if (opts.ip !== undefined) headers.set('x-forwarded-for', opts.ip)
  return {
    headers: { get: (k: string) => headers.get(k) ?? null },
    json: async () => opts.body ?? {},
  } as unknown as Request
}

beforeEach(() => {
  rateLimitCalls = []
  rateLimitAllowed = true
  process.env.INGEST_SECRET = 'shared-secret'
})

describe('POST /api/ingest/application — rate limit is fail-closed and checked before auth', () => {
  it('calls the persistent rate limiter with failClosed:true, keyed by IP', async () => {
    await POST(req({ secret: 'wrong', ip: '198.51.100.7' }))

    expect(rateLimitCalls).toHaveLength(1)
    expect(rateLimitCalls[0].key).toBe('ingest-application:198.51.100.7')
    expect(rateLimitCalls[0].opts).toEqual({ failClosed: true })
  })

  it('429s before ever checking the secret when the limiter denies', async () => {
    rateLimitAllowed = false
    const res = await POST(req({ secret: 'shared-secret', ip: '198.51.100.7' }))
    expect(res.status).toBe(429)
  })

  it('still 401s a wrong secret when the limiter allows (auth unchanged)', async () => {
    const res = await POST(req({ secret: 'wrong', ip: '198.51.100.7' }))
    expect(res.status).toBe(401)
  })
})
