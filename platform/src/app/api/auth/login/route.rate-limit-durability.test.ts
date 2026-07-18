/**
 * POST /api/auth/login — brute-force lockout must survive across instances.
 *
 * This route gates the shared legacy nycmaid PIN login (ADMIN_PASSWORD, one
 * secret protecting 4 tenant sites' admin panels: nyc-mobile-salon,
 * wash-and-fold-hoboken, the-florida-maid, wash-and-fold-nyc — see
 * SiteAdminLoginClient.tsx). It previously gated itself with a hand-rolled,
 * module-level `loginAttempts` Map (local to this route file, never migrated
 * when the rest of the app's auth-critical routes moved onto rate-limit-db.ts
 * — admin-auth, client/login, team-portal/auth, portal/auth, referrers/auth
 * all use it with failClosed:true). That Map lives per-instance — it does not
 * survive a serverless cold start, and two concurrent invocations on two
 * different warm instances each get their OWN independent counter, so an
 * attacker guessing the shared PIN sees a real 5-attempt lockout in a single
 * warm process but effectively unlimited guesses against horizontally-scaled
 * production traffic. Fixed by switching to rateLimitDb (backed by the shared
 * `rate_limit_events` table, failClosed since this is auth-critical). This
 * suite proves the call-site wiring: correct bucket key (per-IP, not shared
 * with other endpoints) and the 5-attempt/5-minute threshold.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: async () => ({ set: () => {} }),
}))
vi.mock('@/lib/nycmaid/auth', () => ({
  createSessionCookie: () => 'session-token',
  hashPassword: (p: string) => `hashed:${p}`,
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  },
}))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))

// Deterministic in-memory counter standing in for the DB-backed limiter --
// exercises the real call-site wiring (bucket key, maxRequests) without
// depending on rate_limit_events' Postgres-only `happened_at` default, same
// idiom as referrers/route.rate-limit-durability.test.ts.
const rlCounts = new Map<string, number>()
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async (bucketKey: string, maxRequests: number) => {
    const count = (rlCounts.get(bucketKey) ?? 0) + 1
    rlCounts.set(bucketKey, count)
    return count <= maxRequests ? { allowed: true, remaining: maxRequests - count } : { allowed: false, remaining: 0 }
  }),
}))

import { POST } from './route'

function loginReq(password: string, ip: string): Request {
  return new Request('http://x/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
    headers: { 'x-forwarded-for': ip },
  })
}

beforeEach(() => {
  rlCounts.clear()
  vi.stubEnv('ADMIN_PASSWORD', 'correct-pin')
})

describe('POST /api/auth/login -- brute-force lockout', () => {
  it('allows 5 wrong-PIN attempts from one IP, then 429s the 6th', async () => {
    const results: number[] = []
    for (let i = 0; i < 6; i++) {
      const res = await POST(loginReq('wrong-pin', '8.8.8.8'))
      results.push(res.status)
    }
    expect(results.slice(0, 5)).toEqual(Array(5).fill(401))
    expect(results[5]).toBe(429)
  })

  it('locks out further attempts even after 5 failures if the 6th would have been correct', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(loginReq('wrong-pin', '3.3.3.3'))
    }
    // The would-be-correct attempt is the 6th request against an exhausted
    // budget -- the gate rejects it before credentials are even checked.
    const res = await POST(loginReq('correct-pin', '3.3.3.3'))
    expect(res.status).toBe(429)
  })

  it('tracks a different IP independently under its own bucket key', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(loginReq('wrong-pin', '1.1.1.1'))
    }
    expect((await POST(loginReq('wrong-pin', '1.1.1.1'))).status).toBe(429)

    // A fresh IP is unaffected by the first IP's exhausted budget.
    const fresh = await POST(loginReq('correct-pin', '2.2.2.2'))
    expect(fresh.status).toBe(200)
  })

  it('does not share a budget with a differently-named rate-limit bucket', async () => {
    const res = await POST(loginReq('correct-pin', '5.5.5.5'))
    expect(res.status).toBe(200)
    expect([...rlCounts.keys()]).toEqual(['nycmaid_login:5.5.5.5'])
  })
})
