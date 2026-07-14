import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 independent isolation regression for team-portal/auth PIN throttle (fix d8f50ba).
 *
 * The sibling file pin-enumeration.test.ts asserts the exact bucket string
 * (`team_portal_auth:acme:9.9.9.9`) and 5×401→429 from one IP. This file proves
 * the COMPLEMENTARY structural properties from the verification lane — the ones
 * that pin down *why* the re-key works and that it doesn't over-block:
 *
 *   1. CARDINALITY: many DISTINCT PIN guesses from one IP+slug collapse to a
 *      SINGLE bucket key. Under the reverted `:<pin>` key, N distinct PINs would
 *      produce N distinct keys (each with a fresh budget) — cardinality N, never
 *      throttled. Cardinality-1 is the direct proof the PIN is NOT in the key.
 *   2. PER-IP ISOLATION: an attacker exhausting the budget from their IP does
 *      NOT lock out a legitimate cleaner on a DIFFERENT IP — the second IP still
 *      has its full budget. The bucket is per-IP, not global.
 *   3. PER-SLUG ISOLATION: exhausting one tenant's budget from an IP does NOT
 *      lock out a DIFFERENT tenant from the same IP — the slug is part of the key.
 */

const rlKeys: string[] = []
const rlCounts = new Map<string, number>()

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, max: number) => {
    rlKeys.push(bucketKey)
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
      single: async () => {
        // Every tenant slug resolves; every PIN is invalid → 401 (never a login).
        if (table === 'tenants') return { data: { id: 'tenant-1', name: 'T', phone: '+15550000000' }, error: null }
        return { data: null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { POST } from './route'

function req(opts: { pin: string; ip: string; slug: string }) {
  return new Request('https://x/api/team-portal/auth', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': opts.ip,
      'x-tenant-slug': opts.slug,
    },
    body: JSON.stringify({ pin: opts.pin }),
  })
}

beforeEach(() => {
  rlKeys.length = 0
  rlCounts.clear()
})

describe('team-portal/auth — PIN-enumeration throttle structure', () => {
  it('distinct PIN guesses from one IP+slug collapse to a SINGLE bucket key (cardinality 1, PIN absent)', async () => {
    for (let i = 0; i < 8; i++) {
      await POST(req({ pin: String(200000 + i), ip: '9.9.9.9', slug: 'acme' }))
    }
    // Reverted per-PIN key → 8 distinct keys. Correct key → exactly 1.
    expect(new Set(rlKeys).size).toBe(1)
    for (const k of rlKeys) expect(k).not.toMatch(/20000\d/)
  })

  it('a DIFFERENT IP keeps its full budget after the attacker IP is locked out (no collateral lockout)', async () => {
    // Attacker exhausts their own IP's budget for tenant acme.
    const attacker: number[] = []
    for (let i = 0; i < 6; i++) {
      const res = await POST(req({ pin: String(300000 + i), ip: '6.6.6.6', slug: 'acme' }))
      attacker.push(res.status)
    }
    expect(attacker[5]).toBe(429)

    // A legitimate cleaner on a different IP, same tenant, still gets a real
    // attempt (401 wrong-PIN here, NOT a 429 lockout inherited from the attacker).
    const victim = await POST(req({ pin: '111111', ip: '7.7.7.7', slug: 'acme' }))
    expect(victim.status).toBe(401)
  })

  it('a DIFFERENT tenant slug keeps its full budget from the same IP (slug is part of the key)', async () => {
    // Exhaust tenant "acme" from one IP.
    let last = 0
    for (let i = 0; i < 6; i++) {
      const res = await POST(req({ pin: String(400000 + i), ip: '8.8.8.8', slug: 'acme' }))
      last = res.status
    }
    expect(last).toBe(429)

    // Same IP, different tenant "beta" is unaffected — separate bucket.
    const other = await POST(req({ pin: '999999', ip: '8.8.8.8', slug: 'beta' }))
    expect(other.status).toBe(401)
  })
})
