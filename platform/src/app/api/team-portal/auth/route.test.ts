import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTeamPin } from '@/lib/team-pin'

/**
 * Regression for the HIGH team-portal PIN brute-force finding.
 *
 * Before: the rate-limit bucket key was `team_portal_auth:${slug}:${pin}`, so a
 * sweep pin=1000..9999 made one attempt per bucket and NEVER tripped the limit.
 * After: failed attempts are counted per TENANT (`team_portal_auth_fail:${slug}`)
 * and the PIN space is 6 digits. A wrong-PIN sweep now locks out after N tries.
 */

// Hoisted so the vi.mock factory can reach it (vi.mock is hoisted above imports).
const h = vi.hoisted(() => ({ calls: [] as string[], counts: new Map<string, number>() }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (key: string, max: number) => {
    h.calls.push(key)
    const c = h.counts.get(key) ?? 0
    if (c >= max) return { allowed: false, remaining: 0 }
    h.counts.set(key, c + 1)
    return { allowed: true, remaining: max - c - 1 }
  },
}))

// Chainable Supabase stub: tenant exists; team_members lookup always misses
// (every PIN in the sweep is wrong).
vi.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const result =
      table === 'tenants'
        ? { data: { id: 't1', name: 'Test Co', phone: '+10000000000' }, error: null }
        : { data: null, error: null }
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'order', 'ilike', 'neq', 'gte', 'insert', 'update']) {
      b[m] = () => b
    }
    b.single = async () => result
    b.maybeSingle = async () => result
    return b
  }
  return { supabaseAdmin: { from: (t: string) => build(t) } }
})

vi.mock('./token', () => ({ createToken: () => 'tok_test' }))

import { POST } from './route'

async function attemptFrom(slug: string, pin: string, ip: string): Promise<number> {
  const req = new Request('http://localhost/api/team-portal/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ tenant_slug: slug, pin }),
  })
  const res = await POST(req)
  return res.status
}

// Default: one tenant, one attacker IP.
const attempt = (pin: string) => attemptFrom('testco', pin, '9.9.9.9')

describe('team-portal auth — PIN brute-force throttle', () => {
  beforeEach(() => {
    h.calls.length = 0
    h.counts.clear()
  })

  it('a wrong-PIN sweep on one tenant trips the per-tenant lockout (was unlimited)', async () => {
    const statuses: number[] = []
    for (let pin = 100000; pin <= 100011; pin++) statuses.push(await attempt(String(pin)))

    // First 10 wrong PINs return 401, then the tenant is locked out with 429.
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401))
    expect(statuses.slice(10)).toEqual([429, 429])
  })

  it('one IP fanning out across many tenants is capped by the per-IP bucket', async () => {
    // Each attempt hits a DIFFERENT tenant (fresh per-tenant bucket) from the
    // same IP. Without per-IP keying this would be unlimited; now the IP bucket
    // (20) trips regardless of how the attacker spreads across tenants.
    const statuses: number[] = []
    for (let i = 0; i < 22; i++) statuses.push(await attemptFrom(`tenant-${i}`, '100000', '7.7.7.7'))

    expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true)
    expect(statuses.slice(20)).toEqual([429, 429])
  })

  it('buckets key on tenant slug + IP only — never on the guessed PIN', async () => {
    await attempt('123456')
    await attempt('654321')
    expect(h.calls.length).toBeGreaterThan(0)
    expect(new Set(h.calls)).toEqual(
      new Set(['team_portal_auth_fail:slug:testco', 'team_portal_auth_fail:ip:9.9.9.9'])
    )
    for (const key of h.calls) {
      expect(key).not.toContain('123456')
      expect(key).not.toContain('654321')
    }
  })
})

describe('team PIN width', () => {
  it('generates 6-digit PINs (widened from 4)', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateTeamPin()).toMatch(/^\d{6}$/)
    }
  })
})
