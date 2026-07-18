/**
 * GET/POST /api/referrers — rate limiting must survive across instances.
 *
 * Both handlers previously gated themselves with a hand-rolled, module-level
 * `attempts` Map (local to this route file, never migrated when the rest of
 * the app moved onto rate-limit-db.ts). That Map lives per-instance -- it
 * does not survive a serverless cold start, and two concurrent invocations
 * on two different warm instances each get their OWN independent counter, so
 * an attacker enumerating referral codes (GET ?code=) or spamming signups
 * (POST) sees a real limit in a single warm process but effectively no limit
 * at all against horizontally-scaled production traffic. Fixed by switching
 * to rateLimitDb (backed by the shared `rate_limit_events` table) instead of
 * local memory. This suite proves the call-site wiring: correct bucket keys
 * (so different endpoints/IPs don't share a budget) and correct thresholds.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createFakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null,
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))

// Deterministic in-memory counter standing in for the DB-backed limiter --
// exercises the real call-site wiring (bucket key, maxRequests) without
// depending on rate_limit_events' Postgres-only `happened_at` default, same
// idiom as pin-reset/route.test.ts's own rateLimitDb mock.
const rlCounts = new Map<string, number>()
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async (bucketKey: string, maxRequests: number) => {
    const count = (rlCounts.get(bucketKey) ?? 0) + 1
    rlCounts.set(bucketKey, count)
    return count <= maxRequests ? { allowed: true, remaining: maxRequests - count } : { allowed: false, remaining: 0 }
  }),
}))

import { GET, POST } from './route'

function reqWithIp(url: string, ip = '9.9.9.9'): NextRequest {
  return new NextRequest(url, { headers: { 'x-forwarded-for': ip } })
}

beforeEach(() => {
  rlCounts.clear()
  h.fake = createFakeSupabase({ referrers: [] })
})

describe('GET /api/referrers -- lookup rate limit', () => {
  it('allows the first 10 lookups from one IP, then 429s the 11th', async () => {
    const results: number[] = []
    for (let i = 0; i < 11; i++) {
      const res = await GET(reqWithIp('http://x/api/referrers?code=NOPE'))
      results.push(res.status)
    }
    // First 10 pass the rate-limit gate (then 404 -- no matching referrer);
    // the 11th is rejected by the gate itself before any lookup.
    expect(results.slice(0, 10)).toEqual(Array(10).fill(404))
    expect(results[10]).toBe(429)
  })

  it('tracks a different IP independently under its own bucket key', async () => {
    for (let i = 0; i < 10; i++) {
      await GET(reqWithIp('http://x/api/referrers?code=NOPE', '1.1.1.1'))
    }
    const blocked = await GET(reqWithIp('http://x/api/referrers?code=NOPE', '1.1.1.1'))
    expect(blocked.status).toBe(429)

    // A fresh IP is unaffected by the first IP's exhausted budget.
    const freshIp = await GET(reqWithIp('http://x/api/referrers?code=NOPE', '2.2.2.2'))
    expect(freshIp.status).toBe(404) // passed the gate, just no matching referrer
  })
})

describe('POST /api/referrers -- signup rate limit uses its own, stricter bucket', () => {
  function signupReq(ip: string): NextRequest {
    return new NextRequest('http://x/api/referrers', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Real Person', email: `p${Math.random()}@example.com` }),
    })
  }

  it('allows the first 5 signups from one IP, then 429s the 6th', async () => {
    const results: number[] = []
    for (let i = 0; i < 6; i++) {
      const res = await POST(signupReq('5.5.5.5'))
      results.push(res.status)
    }
    expect(results[5]).toBe(429)
  })

  it('does not share a budget with the GET lookup bucket for the same IP', async () => {
    for (let i = 0; i < 10; i++) {
      await GET(reqWithIp('http://x/api/referrers?code=NOPE', '7.7.7.7'))
    }
    expect((await GET(reqWithIp('http://x/api/referrers?code=NOPE', '7.7.7.7'))).status).toBe(429)

    // POST from the same IP still has its own fresh 5-request budget.
    expect((await POST(signupReq('7.7.7.7'))).status).not.toBe(429)
  })
})
