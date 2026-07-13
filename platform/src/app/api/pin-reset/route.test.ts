/**
 * PIN-RESET VERIFY THROTTLE — verify_and_set had no rate limit of its own.
 *
 * send_code throttles how often a code can be REQUESTED, but verify_and_set
 * (the step that checks the 6-digit code against member_pin_reset_codes) had
 * no limiter at all — an attacker who knows a member's phone/email could
 * brute-force the 10^6 code space over its 10-minute TTL and take over that
 * member's login PIN. This suite proves repeated wrong-code guesses now trip
 * a 429 well before the code space is exhausted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('next/headers', () => ({
  headers: async () => new Map([
    ['x-tenant-id', TENANT_ID],
    ['x-tenant-sig', 'sig'],
  ]),
}))

vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: () => true,
}))

vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hash:${pin}`,
  isValidAdminPin: (pin: string) => /^\d{4,8}$/.test(pin),
}))

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

const TENANT_ID = 'tenant-1'
const MEMBER_ID = 'member-1'
const CONTACT = 'member@example.com'
const REAL_CODE = '111111'

function seed(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('tenant_members', [
    { id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Test Member', phone: null, email: CONTACT, pin_hash: null },
  ])
  fake._seed('member_pin_reset_codes', [
    {
      id: 'code-1',
      tenant_id: TENANT_ID,
      member_id: MEMBER_ID,
      code: REAL_CODE,
      used: false,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      ...overrides,
    },
  ])
}

function verifyReq(code: string, newPin = '4321') {
  return new Request('http://x/api/pin-reset', {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.5' },
    body: JSON.stringify({ action: 'verify_and_set', contact: CONTACT, code, new_pin: newPin }),
  })
}

beforeEach(() => {
  rlCounts.clear()
  vi.mocked(rateLimitDb).mockClear()
  seed()
})

describe('POST /api/pin-reset — verify_and_set brute-force throttle', () => {
  it('locks out after repeated wrong-code guesses instead of allowing unlimited attempts', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 8; i++) {
      const res = await POST(verifyReq('000000'))
      statuses.push(res.status)
    }
    // All wrong guesses land as 400 (incorrect code) until the limiter trips — then 429.
    expect(statuses).toContain(429)
    const firstThrottled = statuses.indexOf(429)
    expect(firstThrottled).toBeLessThan(8)
    expect(statuses.slice(firstThrottled)).toEqual(statuses.slice(firstThrottled).map(() => 429))
  })

  it('calls the limiter fail-closed, keyed by tenant+contact', async () => {
    await POST(verifyReq('000000'))
    expect(rateLimitDb).toHaveBeenCalledWith(
      `pin_reset_verify:${TENANT_ID}:${CONTACT}`,
      expect.any(Number),
      expect.any(Number),
      { failClosed: true },
    )
  })

  it('a correct code still succeeds when under the attempt limit', async () => {
    const res = await POST(verifyReq(REAL_CODE))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })
})
