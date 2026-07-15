import { describe, it, expect, vi } from 'vitest'

/**
 * OTP BRUTE-FORCE — POST /api/client/verify-code.
 *
 * The only throttle was `client-verify:${tenant.id}:${ip}` (5/10min per IP).
 * An attacker guessing a specific victim's 6-digit code (900,000 possible
 * values, valid for 10 minutes) could spread attempts across rotating IPs/
 * proxies and get an effectively unbounded number of tries at that one
 * victim, since the rate-limit bucket never included the identifier being
 * attacked. Sibling flow pin-reset already throttles per contact+tenant for
 * exactly this reason (see its own comment) -- verify-code was missing the
 * equivalent identifier-keyed bucket.
 *
 * Fix adds a `client-verify-id:${tenant.id}:${identifier}` bucket alongside
 * the existing IP bucket, so guessing is bounded per-victim regardless of
 * how many source IPs the attacker rotates through.
 */

const TENANT_ID = 'tenant_1'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

vi.mock('@/lib/notify', () => ({ notify: async () => {} }))

const { rateLimitDb } = vi.hoisted(() => ({
  rateLimitDb: vi.fn(async (bucketKey: string) => {
    // Every caller IP is fresh (never blocked) -- only the per-identifier
    // bucket for this specific victim has been exhausted by prior guesses.
    if (bucketKey.startsWith('client-verify-id:')) return { allowed: false, remaining: 0 }
    return { allowed: true, remaining: 5 }
  }),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

import { POST } from './route'

function req(body: unknown): Request {
  return {
    json: async () => body,
    headers: { get: () => 'unknown' },
  } as unknown as Request
}

describe('client/verify-code — per-identifier rate limit bounds distributed OTP guessing', () => {
  it('rejects with 429 when the target identifier bucket is exhausted, even from a fresh IP', async () => {
    const res = await POST(req({ email: 'victim@tenant.test', code: '000000' }))
    expect(res.status).toBe(429)
  })
})
