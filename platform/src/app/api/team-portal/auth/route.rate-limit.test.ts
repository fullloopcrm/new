import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PIN BRUTE-FORCE — POST /api/team-portal/auth.
 *
 * The rate-limit bucket was keyed as `team_portal_auth:${tenant_slug}:${pin}`
 * -- including the guessed PIN itself. That gives every DISTINCT wrong guess
 * its own fresh bucket, so a brute-forcer who never repeats a guess (the
 * whole point of brute-forcing) is never throttled: it only limits retrying
 * the SAME wrong PIN 5+ times, which no attacker does. Every sibling
 * credential-guessing route (admin-auth `admin_auth:ip`, auth/login
 * `auth_login:ip`, client/login `client-login:tenant:ip`) keys by caller
 * identity instead of the guessed value -- team-portal/auth was the outlier.
 *
 * Fix: key by tenant_slug+ip (matching client/login's pattern) so distinct
 * guesses from the same caller share one budget.
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
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ single: async () => ({ data: null, error: null }) }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

function req(opts: { pin?: string; tenant_slug?: string; ip?: string }): Request {
  const headers = new Map<string, string>()
  if (opts.ip !== undefined) headers.set('x-forwarded-for', opts.ip)
  return {
    headers: { get: (k: string) => headers.get(k) ?? null },
    json: async () => ({ pin: opts.pin, tenant_slug: opts.tenant_slug }),
  } as unknown as Request
}

beforeEach(() => {
  rateLimitCalls = []
  rateLimitAllowed = true
})

describe('POST /api/team-portal/auth — rate-limit bucket excludes the guessed pin', () => {
  it('keys the bucket by tenant_slug+ip, never by the pin value itself', async () => {
    await POST(req({ pin: '1234', tenant_slug: 'acme', ip: '198.51.100.9' }))

    expect(rateLimitCalls).toHaveLength(1)
    expect(rateLimitCalls[0].key).toBe('team_portal_auth:acme:198.51.100.9')
    expect(rateLimitCalls[0].key).not.toContain('1234')
    expect(rateLimitCalls[0].opts).toEqual({ failClosed: true })
  })

  it('throttles a caller trying many DISTINCT pins from the same IP (real brute-force shape)', async () => {
    // Simulate the limiter having already denied this ip+tenant bucket after
    // 5 prior distinct-pin guesses within the window.
    rateLimitAllowed = false
    const res = await POST(req({ pin: '9999', tenant_slug: 'acme', ip: '198.51.100.9' }))
    expect(res.status).toBe(429)
  })
})
