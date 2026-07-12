import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * team-portal/auth PIN-enumeration regression. The rate-limit bucket used to be
 * keyed on the PIN VALUE (`team_portal_auth:<slug>:<pin>`), so every guessed PIN
 * got its own fresh budget and an attacker could walk the entire PIN space
 * unthrottled. The fix counts FAILED attempts on two PIN-free fail buckets —
 * per tenant (`team_portal_auth_fail:slug:<slug>`, cap 10) and per IP
 * (`team_portal_auth_fail:ip:<ip>`, cap 20) — so distinct PIN guesses against a
 * tenant share one budget and enumeration is throttled/locked out. The PIN is
 * never part of a bucket key.
 */

// Records every bucket key the route computes and enforces a real per-key cap.
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
        if (table === 'tenants') return { data: { id: 'tenant-1', name: 'T', phone: '+15550000000' }, error: null }
        // team_members: every PIN guess is invalid -> 401 (never a real login).
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        if (table === 'tenants') return { data: { id: 'tenant-1', name: 'T', phone: '+15550000000' }, error: null }
        // team_members: every PIN guess is invalid -> 401 (never a real login).
        return { data: null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { POST } from './route'

function req(pin: string) {
  return new Request('https://x/api/team-portal/auth', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '9.9.9.9',
      'x-tenant-slug': 'acme',
    },
    body: JSON.stringify({ pin }),
  })
}

beforeEach(() => {
  rlKeys.length = 0
  rlCounts.clear()
})

describe('team-portal/auth PIN enumeration', () => {
  it('throttles guessing across DIFFERENT PINs from one IP (shared per-tenant fail bucket)', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      // Eleven DISTINCT PIN guesses. Under the old per-PIN key each would get a
      // fresh budget and never 429; the per-tenant fail bucket (cap 10) shares one
      // budget across all guesses, so the 11th is locked out.
      const res = await POST(req(String(100000 + i)))
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true)
    expect(statuses[10]).toBe(429)
  })

  it('bucket keys are slug/IP only and never contain the PIN', async () => {
    await POST(req('424242'))
    expect(rlKeys.length).toBeGreaterThan(0)
    expect(new Set(rlKeys)).toEqual(
      new Set(['team_portal_auth_fail:slug:acme', 'team_portal_auth_fail:ip:9.9.9.9'])
    )
    for (const k of rlKeys) expect(k).not.toContain('424242')
  })
})
