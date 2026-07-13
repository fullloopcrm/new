import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * referrers/auth/verify brute-force regression. This route's rate limit was
 * keyed on a COMPOSITE ip+email string (`referrer_otp_verify:${ip}:${email}`)
 * and not fail-closed. Rotating source IP mints a brand-new bucket key every
 * request, so an attacker who knows a referrer's email gets an unlimited
 * fresh 8-guess budget per IP against the 6-digit OTP (10^6 space). Fix
 * mirrors pin-reset/route.ts + portal/auth/route.ts: throttle per-email
 * (fail-closed) as the primary cap, independent of source IP, with a looser
 * per-IP cap as a secondary defense against one host spraying codes across
 * many emails.
 */

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

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ id: 'tenant-a' }) }))
vi.mock('@/lib/referrer-portal-auth', () => ({
  createReferrerToken: () => 'token',
  hashOtp: (code: string) => `hash:${code}`,
}))

function chain() {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    ilike: () => c,
    update: () => c,
    // Real code is never guessed; every attempt is wrong.
    maybeSingle: async () => ({ data: null, error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => chain() } }))

import type { NextRequest } from 'next/server'
import { POST } from './route'

function guess(ip: string, code = '999999') {
  return new Request('https://x/api/referrers/auth/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email: EMAIL, code }),
  }) as unknown as NextRequest
}

beforeEach(() => {
  rlCalls.length = 0
  rlCounts.clear()
})

describe('referrers/auth/verify brute-force', () => {
  it('locks out repeated wrong-code guesses for one email, even across rotating IPs', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 9; i++) {
      const res = await POST(guess(`10.0.0.${i}`)) // fresh IP every attempt
      statuses.push(res.status)
    }
    // First 8 wrong guesses -> 401 invalid/expired code; the 9th is
    // throttled -> 429, even though every request came from a different IP.
    expect(statuses.slice(0, 8).every((s) => s === 401)).toBe(true)
    expect(statuses[8]).toBe(429)
  })

  it('throttles per-email, not per composite ip+email (regression)', async () => {
    await POST(guess('10.0.0.1'))
    expect(rlCalls.some((c) => c.key === `referrer_otp_verify:${EMAIL.toLowerCase()}`)).toBe(true)
    expect(rlCalls.some((c) => c.key.includes('10.0.0.1') && c.key.includes(EMAIL))).toBe(false)
  })

  it('opts both identifier and IP throttles into failClosed', async () => {
    await POST(guess('10.0.0.1'))
    const idCall = rlCalls.find((c) => c.key === `referrer_otp_verify:${EMAIL.toLowerCase()}`)
    const ipCall = rlCalls.find((c) => c.key === 'referrer_otp_verify_ip:10.0.0.1')
    expect(idCall?.opts.failClosed).toBe(true)
    expect(ipCall?.opts.failClosed).toBe(true)
  })
})
