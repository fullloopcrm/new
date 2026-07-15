import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * team-portal/auth PIN-enumeration regression. The rate-limit bucket used to be
 * keyed on the PIN VALUE (`team_portal_auth:<slug>:<pin>`), so every guessed PIN
 * got its own fresh 5-attempt budget and an attacker could walk the entire PIN
 * space unthrottled. The bucket must be keyed on slug+IP so guesses against a
 * tenant share one budget and enumeration is actually throttled/locked out.
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
  it('throttles guessing across DIFFERENT PINs from one IP (shared slug+IP bucket)', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      // Six DISTINCT PIN guesses. Under the old per-PIN key these would each get
      // a fresh budget and never 429.
      const res = await POST(req(String(100000 + i)))
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true)
    expect(statuses[5]).toBe(429)
  })

  it('bucket keys are slug+IP based and never contain the PIN', async () => {
    await POST(req('424242'))
    expect(rlKeys.length).toBeGreaterThan(0)
    // Precheck bucket (slug+ip, checked before any PIN lookup) plus the two
    // post-failure buckets (per-slug, per-ip) — none embed the guessed PIN.
    expect(rlKeys).toContain('team_portal_auth:acme:9.9.9.9')
    for (const k of rlKeys) {
      expect(k).not.toContain('424242')
    }
  })
})
