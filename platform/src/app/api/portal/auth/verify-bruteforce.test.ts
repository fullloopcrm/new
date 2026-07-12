import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * portal/auth verify_code brute-force regression. The verify_code branch used to
 * have NO rate limit at all, so a 6-digit code (10^6 space) could be brute-forced
 * with unlimited guesses. It must throttle per-phone so wrong guesses against a
 * given phone's code are capped and further attempts are locked out.
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

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      eq: () => c,
      gt: () => c,
      order: () => c,
      limit: () => c,
      update: () => c,
      delete: () => c,
      single: async () => {
        if (table === 'portal_auth_codes') {
          // A real, unexpired code exists — but the attacker never guesses it.
          return {
            data: {
              code: '000000',
              tenant_id: 'tenant-1',
              client_id: 'client-1',
              expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            },
            error: null,
          }
        }
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        if (table === 'portal_auth_codes') {
          // A real, unexpired code exists — but the attacker never guesses it.
          return {
            data: {
              code: '000000',
              tenant_id: 'tenant-1',
              client_id: 'client-1',
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

const PHONE = '+15551230000'

function guess(code: string) {
  return new Request('https://x/api/portal/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '8.8.8.8' },
    body: JSON.stringify({ action: 'verify_code', phone: PHONE, code }),
  })
}

beforeEach(() => {
  rlKeys.length = 0
  rlCounts.clear()
  rlOpts.clear()
})

describe('portal/auth verify_code brute-force', () => {
  it('locks out repeated wrong-code guesses for one phone (429 after the cap)', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const res = await POST(guess('999999')) // always wrong
      statuses.push(res.status)
    }
    // First 5 wrong guesses -> 401 invalid code; the 6th is throttled -> 429.
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true)
    expect(statuses[5]).toBe(429)
  })

  it('throttles per-phone identifier (regression: verify_code previously had NO limit)', async () => {
    await POST(guess('999999'))
    expect(rlKeys).toContain(`portal_verify:${PHONE}`)
  })

  it('opts BOTH verify throttles into failClosed (regression: merge-miss failed OPEN on DB error)', async () => {
    await POST(guess('999999'))
    expect(rlOpts.get(`portal_verify:${PHONE}`)?.failClosed).toBe(true)
    expect(rlOpts.get('portal_verify_ip:8.8.8.8')?.failClosed).toBe(true)
  })
})
