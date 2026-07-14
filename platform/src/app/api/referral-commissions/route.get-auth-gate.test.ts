/**
 * GET /api/referral-commissions?referrer_id=... auth-gate regression.
 *
 * Previously this branch trusted a bare referrer_id with no session check at
 * all -- and referrer_id is a plain row id, not a secret: it was (and, for
 * the legacy no-auth referral pages, still is) obtainable with zero auth via
 * GET /api/referrers?code=..., which any public referral link exposes (the
 * whole point of a referral link is that it gets shared). So anyone who ever
 * saw a referral link could pull the referrer's FULL commission history --
 * including client_name and booking price/date for every person they
 * referred, third-party PII the referrer never consented to exposing.
 *
 * Fix requires the same referrer session token the earnings dashboard
 * (/api/referrers/[code]) already gates on, and checks it actually owns the
 * requested referrer_id (not just any valid referrer session).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: () => Promise.reject(new Error('not used by this test')),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn(() => Promise.resolve({ posted: true })),
  postCommissionPayment: vi.fn(() => Promise.resolve({ posted: true })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'
import { createReferrerToken } from '@/lib/referrer-portal-auth'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const REFERRER_A = 'referrer-A'
const REFERRER_B = 'referrer-B'

function getReq(referrerId: string, token?: string): Request {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  return new Request(`http://x/api/referral-commissions?referrer_id=${referrerId}`, { headers })
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'referral-commissions-test-secret'
  fake._store.clear()
  fake._seed('referrers', [
    { id: REFERRER_A, tenant_id: TENANT_A, name: 'Ref A', email: 'a@x.com', referral_code: 'AAAA1' },
    { id: REFERRER_B, tenant_id: TENANT_B, name: 'Ref B', email: 'b@x.com', referral_code: 'BBBB1' },
  ])
  fake._seed('referral_commissions', [
    {
      id: 'comm-A1', tenant_id: TENANT_A, referrer_id: REFERRER_A,
      client_name: 'Victim Client', commission_cents: 1000, status: 'paid', created_at: '2026-01-01',
    },
  ])
})

describe('GET /api/referral-commissions?referrer_id= auth gate', () => {
  it('rejects an unauthenticated request (no bearer token) -- the pre-fix vulnerable path', async () => {
    const res = await GET(getReq(REFERRER_A))
    expect(res.status).toBe(401)
  })

  it("rejects a valid referrer session token that belongs to a DIFFERENT referrer", async () => {
    // Referrer B is authenticated, but tries to read referrer A's commissions
    // (e.g. by discovering A's id from the public /api/referrers?code= lookup).
    const tokenForB = createReferrerToken(REFERRER_B, TENANT_B)
    const res = await GET(getReq(REFERRER_A, tokenForB))
    expect(res.status).toBe(401)
  })

  it('allows a referrer to read their OWN commission history with a valid session token', async () => {
    const tokenForA = createReferrerToken(REFERRER_A, TENANT_A)
    const res = await GET(getReq(REFERRER_A, tokenForA))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toHaveLength(1)
    expect(json[0].id).toBe('comm-A1')
  })
})
