/**
 * PORTAL-AUTH VERIFY THROTTLE — verify_code had no rate limit of its own.
 *
 * send_code throttles how often a code can be REQUESTED, but verify_code (the
 * client-portal login step that checks the 6-digit code) had no limiter at
 * all — an attacker who knows a client's phone number could brute-force the
 * 10^6 code space over its 10-minute TTL and take over that client's portal
 * login. This suite proves repeated wrong-code guesses now trip a 429 well
 * before the code space is exhausted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

// Deterministic in-memory counter standing in for the DB-backed limiter —
// exercises the real call-site wiring (bucket key, maxRequests, failClosed)
// without depending on rate_limit_events' Postgres-only `happened_at` default.
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

const PHONE = '+15551234567'
const REAL_CODE = '111111'
const TENANT_ID = 'tenant-1'
const CLIENT_ID = 'client-1'

function seed(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('portal_auth_codes', [
    {
      phone: PHONE,
      code: REAL_CODE,
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      used: false,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      ...overrides,
    },
  ])
  fake._seed('clients', [{ id: CLIENT_ID, name: 'Test Client' }])
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Tenant', primary_color: null, logo_url: null }])
}

function verifyReq(code: string) {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'verify_code', phone: PHONE, code }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'portal-test-secret'
  rlCounts.clear()
  vi.mocked(rateLimitDb).mockClear()
  seed()
})

describe('POST /api/portal/auth — verify_code brute-force throttle', () => {
  it('locks out after repeated wrong-code guesses instead of allowing unlimited attempts', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 8; i++) {
      const res = await POST(verifyReq('000000'))
      statuses.push(res.status)
    }
    expect(statuses).toContain(429)
    const firstThrottled = statuses.indexOf(429)
    expect(firstThrottled).toBeLessThan(8)
    expect(statuses.slice(firstThrottled)).toEqual(statuses.slice(firstThrottled).map(() => 429))
  })

  it('calls the limiter fail-closed, keyed by ip+phone', async () => {
    await POST(verifyReq('000000'))
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining(`:${PHONE}`),
      expect.any(Number),
      expect.any(Number),
      { failClosed: true },
    )
  })

  it('a correct code still succeeds when under the attempt limit', async () => {
    const res = await POST(verifyReq(REAL_CODE))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.token).toBeTruthy()
  })
})
