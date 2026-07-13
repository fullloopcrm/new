import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * pin-reset verify_and_set brute-force regression. Unlike its sibling OTP
 * flows (portal/auth verify_code, referrers/auth/verify), this route's
 * verify_and_set branch had NO rate limit at all -- a 6-digit code (10^6
 * space) delivered by SMS/email could be brute-forced with unlimited guesses
 * before it expires. It must throttle per-contact (so wrong guesses against
 * a given member's code are capped) and per-IP, matching the pattern already
 * used by portal/auth/route.ts.
 */

const rlKeys: string[] = []
const rlCounts = new Map<string, number>()
const rlOpts = new Map<string, { failClosed?: boolean }>()

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, max: number, _windowMs: number, opts: { failClosed?: boolean } = {}) => {
    rlKeys.push(bucketKey)
    rlOpts.set(bucketKey, opts)
    const n = rlCounts.get(bucketKey) ?? 0
    if (n >= max) return { allowed: false, remaining: 0 }
    rlCounts.set(bucketKey, n + 1)
    return { allowed: true, remaining: max - n - 1 }
  },
}))

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => ({ 'x-tenant-id': 'tenant-1', 'x-tenant-sig': 'sig' })[k] ?? null }),
}))

vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: () => true,
}))

vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hash:${pin}`,
  isValidAdminPin: (pin: string) => /^\d{4,8}$/.test(pin),
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      eq: () => c,
      neq: () => c,
      gt: () => c,
      order: () => c,
      limit: () => c,
      update: () => c,
      delete: () => c,
      maybeSingle: async () => {
        if (table === 'tenant_members') {
          // The attacker knows the member's phone (public-ish); the real code
          // is never guessed.
          return { data: { id: 'member-1', name: 'A', phone: '+15551230000', email: null }, error: null }
        }
        if (table === 'member_pin_reset_codes') {
          return {
            data: {
              id: 'reset-1',
              code: '000000',
              expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            },
            error: null,
          }
        }
        return { data: null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { POST } from './route'

const CONTACT = '+15551230000'

function guess(code: string) {
  return new Request('https://x/api/pin-reset', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '8.8.8.8' },
    body: JSON.stringify({ action: 'verify_and_set', contact: CONTACT, code, new_pin: '424242' }),
  })
}

beforeEach(() => {
  rlKeys.length = 0
  rlCounts.clear()
  rlOpts.clear()
})

describe('pin-reset verify_and_set brute-force', () => {
  it('locks out repeated wrong-code guesses for one contact (429 after the cap)', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const res = await POST(guess('999999')) // always wrong
      statuses.push(res.status)
    }
    // First 5 wrong guesses -> 400 code incorrect; the 6th is throttled -> 429.
    expect(statuses.slice(0, 5).every((s) => s === 400)).toBe(true)
    expect(statuses[5]).toBe(429)
  })

  it('throttles per-contact identifier (regression: verify_and_set previously had NO limit)', async () => {
    await POST(guess('999999'))
    expect(rlKeys).toContain(`pin_reset_verify:tenant-1:${CONTACT}`)
  })

  it('opts BOTH verify throttles into failClosed', async () => {
    await POST(guess('999999'))
    expect(rlOpts.get(`pin_reset_verify:tenant-1:${CONTACT}`)?.failClosed).toBe(true)
    expect(rlOpts.get('pin_reset_verify_ip:8.8.8.8')?.failClosed).toBe(true)
  })
})
