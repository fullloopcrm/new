import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 independent isolation regression for team-portal/auth PIN throttle (fix d8f50ba).
 *
 * The sibling file pin-enumeration.test.ts asserts the exact fail-bucket keys
 * (`team_portal_auth_fail:slug:<slug>` + `:ip:<ip>`) and 10×401→429 per tenant.
 * This file proves the COMPLEMENTARY structural properties from the verification
 * lane — the ones that pin down *why* the re-key works:
 *
 *   1. CARDINALITY / PIN-ABSENCE: many DISTINCT PIN guesses from one IP+slug
 *      collapse to the SAME two fail-bucket keys (cardinality 2, PIN-free). Under
 *      the reverted `:<pin>` key, N distinct PINs would produce N distinct keys
 *      (each a fresh budget) — never throttled. A fixed small key-set with no PIN
 *      substring is the direct proof the PIN is NOT in the key.
 *   2. DISTRIBUTED-SWEEP DEFENSE: the per-tenant fail bucket has NO IP component,
 *      so a sweep of ONE tenant's PIN space from MANY rotating IPs still locks out
 *      after the per-tenant cap (10). This is the threat a per-IP-only key cannot
 *      stop — an IP-rotating attacker would otherwise get unlimited guesses.
 *   3. PER-SLUG ISOLATION: exhausting one tenant's per-tenant bucket does NOT
 *      lock out a DIFFERENT tenant — the slug is part of the per-tenant key.
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
      maybeSingle: async () => {
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
  it('distinct PIN guesses from one IP+slug collapse to the two PIN-free fail buckets (cardinality 2)', async () => {
    for (let i = 0; i < 8; i++) {
      await POST(req({ pin: String(200000 + i), ip: '9.9.9.9', slug: 'acme' }))
    }
    // Reverted per-PIN key → 8 distinct keys. Correct fail-bucket keys → exactly 2
    // (per-tenant + per-IP), and no key contains a guessed PIN.
    expect(new Set(rlKeys)).toEqual(
      new Set(['team_portal_auth_fail:slug:acme', 'team_portal_auth_fail:ip:9.9.9.9'])
    )
    for (const k of rlKeys) expect(k).not.toMatch(/20000\d/)
  })

  it('per-tenant fail bucket is shared across source IPs (distributed sweep of one tenant locks out)', async () => {
    // Eleven wrong guesses at tenant acme, each from a DIFFERENT IP — the
    // distributed brute-force the per-tenant bucket (no IP in key) exists to
    // defeat. The per-tenant fail bucket (cap 10) is consulted every time, so the
    // 11th locks out even though no single IP came near the per-IP cap (20).
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      const res = await POST(req({ pin: String(300000 + i), ip: `10.0.0.${i + 1}`, slug: 'acme' }))
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true)
    expect(statuses[10]).toBe(429)
  })

  it('a DIFFERENT tenant slug keeps its own budget from the same IP (slug is part of the per-tenant key)', async () => {
    // Exhaust tenant "acme"'s per-tenant fail bucket (cap 10) from one IP.
    let last = 0
    for (let i = 0; i < 11; i++) {
      const res = await POST(req({ pin: String(400000 + i), ip: '8.8.8.8', slug: 'acme' }))
      last = res.status
    }
    expect(last).toBe(429)

    // Same IP, different tenant "beta": its per-tenant bucket is separate and the
    // shared per-IP bucket (cap 20) still has budget, so the guess lands (401).
    const other = await POST(req({ pin: '999999', ip: '8.8.8.8', slug: 'beta' }))
    expect(other.status).toBe(401)
  })
})
