import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/verify-code brute-force regression. This route's rate limit was
 * keyed ONLY on tenant+IP (`client-verify:${tenant.id}:${ip}`) — there was no
 * per-identifier (email/phone) cap at all. An attacker who knows a client's
 * email/phone (both routinely public/guessable) could rotate source IPs and
 * get a fresh 5-guess budget on each one, brute-forcing the 6-digit code
 * (10^6 space) within its window and minting a session for that client.
 * Fix mirrors portal/auth/route.ts and pin-reset/route.ts: throttle per
 * identifier (fail-closed) as the primary cap, with a looser per-IP cap as a
 * secondary defense against one host spraying codes across identifiers.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-00000000000a'
const EMAIL = 'victim@example.com'

const rlCalls: Array<{ key: string; max: number; opts: { failClosed?: boolean } }> = []
const rlCounts = new Map<string, number>()

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, max: number, _windowMs: number, opts: { failClosed?: boolean } = {}) => {
    rlCalls.push({ key: bucketKey, max, opts })
    const n = rlCounts.get(bucketKey) ?? 0
    if (n >= max) return { allowed: false, remaining: 0 }
    rlCounts.set(bucketKey, n + 1)
    return { allowed: true, remaining: max - n - 1 }
  },
}))

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ id: TENANT }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/client-auth', () => ({
  createClientSession: () => 'session-token',
  clientSessionCookieOptions: () => ({ name: 'client_session', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 100, path: '/' }),
}))

function chain() {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    ilike: () => c,
    order: () => c,
    limit: () => c,
    update: () => c,
    delete: () => c,
    // Real code is never guessed; every attempt is wrong.
    maybeSingle: async () => ({ data: null, error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => chain() } }))
vi.mock('@/lib/tenant-db', () => ({ tenantDb: () => ({ from: () => chain() }) }))

import { POST } from './route'

function guess(ip: string, code = '999999') {
  return new Request('https://x/api/client/verify-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email: EMAIL, code }),
  })
}

beforeEach(() => {
  rlCalls.length = 0
  rlCounts.clear()
})

describe('client/verify-code brute-force', () => {
  it('locks out repeated wrong-code guesses for one identifier, even across rotating IPs', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const res = await POST(guess(`10.0.0.${i}`)) // fresh IP every attempt
      statuses.push(res.status)
    }
    // First 5 wrong guesses -> 401 invalid code; the 6th is throttled -> 429,
    // even though every request came from a different IP.
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true)
    expect(statuses[5]).toBe(429)
  })

  it('throttles per-identifier (regression: previously keyed by tenant+IP only)', async () => {
    await POST(guess('10.0.0.1'))
    expect(rlCalls.some((c) => c.key === `client-verify:${TENANT}:${EMAIL.toLowerCase()}`)).toBe(true)
  })

  it('opts both identifier and IP throttles into failClosed', async () => {
    await POST(guess('10.0.0.1'))
    const idCall = rlCalls.find((c) => c.key === `client-verify:${TENANT}:${EMAIL.toLowerCase()}`)
    const ipCall = rlCalls.find((c) => c.key === `client-verify-ip:${TENANT}:10.0.0.1`)
    expect(idCall?.opts.failClosed).toBe(true)
    expect(ipCall?.opts.failClosed).toBe(true)
  })
})
