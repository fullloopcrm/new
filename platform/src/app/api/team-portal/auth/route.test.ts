/**
 * TEAM-PORTAL AUTH BRUTE-FORCE THROTTLE — the rate limiter was keyed by the
 * GUESSED PIN itself (`team_portal_auth:${tenant_slug}:${pin}`), not by the
 * caller's identity. Every distinct PIN guess got its own fresh 5-attempt
 * budget, so an attacker could enumerate the whole PIN space (e.g. all 10,000
 * 4-digit PINs) against a known tenant slug with no aggregate throttling --
 * full team-member account takeover (pay_rate, schedule, earnings, messaging).
 * This suite proves the limiter is now keyed by tenant+IP so repeated guesses
 * from one caller trip a 429 well before the PIN space is exhausted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const rlCounts = new Map<string, number>()
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async (bucketKey: string, maxRequests: number) => {
    const count = (rlCounts.get(bucketKey) ?? 0) + 1
    rlCounts.set(bucketKey, count)
    return count <= maxRequests ? { allowed: true, remaining: maxRequests - count } : { allowed: false, remaining: 0 }
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_SLUG = 'acme-cleaning'
const TENANT_ID = 'tenant-1'
const REAL_PIN = '4242'
const IP = '203.0.113.7'

function seed() {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT_ID, slug: TENANT_SLUG, status: 'active', name: 'Acme', phone: '+15551234567' }])
  fake._seed('team_members', [
    { id: 'member-1', tenant_id: TENANT_ID, pin: REAL_PIN, status: 'active', name: 'Jane', preferred_language: 'en', pay_rate: 20, avatar_url: null, role: 'worker' },
  ])
}

function loginReq(pin: string) {
  return new Request('http://x/api/team-portal/auth', {
    method: 'POST',
    headers: { 'x-forwarded-for': IP },
    body: JSON.stringify({ tenant_slug: TENANT_SLUG, pin }),
  })
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'team-portal-test-secret'
  rlCounts.clear()
  vi.mocked(rateLimitDb).mockClear()
  seed()
})

describe('POST /api/team-portal/auth — PIN brute-force throttle', () => {
  it('locks out after repeated wrong-PIN guesses from one caller instead of giving each guess its own budget', async () => {
    const statuses: number[] = []
    // Distinct wrong PINs each attempt -- the old bug keyed by the guessed
    // PIN, so varying the guess would have reset the limiter every time.
    for (let i = 0; i < 8; i++) {
      const res = await POST(loginReq(String(1000 + i)))
      statuses.push(res.status)
    }
    expect(statuses).toContain(429)
    const firstThrottled = statuses.indexOf(429)
    expect(firstThrottled).toBeLessThan(8)
    expect(statuses.slice(firstThrottled)).toEqual(statuses.slice(firstThrottled).map(() => 429))
  })

  it('calls the limiter fail-closed, keyed by tenant+IP -- never by the guessed PIN', async () => {
    await POST(loginReq('9999'))
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining(`${TENANT_SLUG}:${IP}`),
      expect.any(Number),
      expect.any(Number),
      { failClosed: true },
    )
    const [bucketKey] = vi.mocked(rateLimitDb).mock.calls[0]
    expect(bucketKey).not.toContain(':9999')
  })

  it('a correct PIN still succeeds when under the attempt limit', async () => {
    const res = await POST(loginReq(REAL_PIN))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.token).toBeTruthy()
    expect(body.member.id).toBe('member-1')
  })
})
