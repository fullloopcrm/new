import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * referrers GET/POST rate-limit hardening.
 *
 * BUG (fixed this pass): GET (lookup by referral code or email — returns
 * name/email/earnings, a 404-vs-200 oracle exactly like client/check) and
 * POST (signup) used a bare in-memory `Map`, not the persistent DB-backed
 * `rateLimitDb`. That limiter resets on every serverless cold start / is
 * per-instance under concurrency, so it never bounded a real distributed
 * attack in production. FIX: both now go through `rateLimitDb`; GET (the PII
 * oracle) passes `{failClosed: true}` — same rationale as client/check — so a
 * rate-limiter DB outage denies instead of opening unlimited enumeration.
 * POST stays fail-open (public signup form, spam defense only, matching
 * contact/lead/apply siblings) but is now persisted.
 */

let rateLimitCalls: Array<{ key: string; max: number; windowMs: number; opts?: { failClosed?: boolean } }>
let rateLimitAllowed: boolean

const REFERRER = {
  id: 'ref_1',
  name: 'Pat',
  email: 'pat@example.com',
  referral_code: 'PATT123',
  total_earned: 50,
  total_paid: 0,
  preferred_payout: 'zelle',
  created_at: '2026-01-01',
}

function referrersBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    ilike: () => chain,
    single: async () => ({ data: REFERRER, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'referrers') return referrersBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: 'tenant_1' }),
}))

// GET's code/email lookup is admin-gated (route.auth.test.ts covers the gate
// itself); mock it authorized here so these tests can focus on rate limiting.
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (
    key: string,
    max: number,
    windowMs: number,
    opts?: { failClosed?: boolean }
  ) => {
    rateLimitCalls.push({ key, max, windowMs, opts })
    return rateLimitAllowed
      ? { allowed: true, remaining: max - 1 }
      : { allowed: false, remaining: 0 }
  },
}))

import { GET, POST } from './route'

function getReq(params: Record<string, string>): NextRequest {
  const url = new URL('https://example.com/api/referrers')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return {
    nextUrl: url,
    headers: { get: () => '203.0.113.5' },
  } as unknown as NextRequest
}

function postReq(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: { get: () => '203.0.113.5' },
  } as unknown as NextRequest
}

beforeEach(() => {
  rateLimitCalls = []
  rateLimitAllowed = true
})

describe('GET /api/referrers — rate limit is persistent + fail-closed', () => {
  it('calls the persistent rate limiter with failClosed:true (PII oracle)', async () => {
    await GET(getReq({ code: 'PATT123' }))

    expect(rateLimitCalls).toHaveLength(1)
    expect(rateLimitCalls[0].key).toBe('referrer-lookup:203.0.113.5')
    expect(rateLimitCalls[0].opts).toEqual({ failClosed: true })
  })

  it('serves the lookup when the limiter allows', async () => {
    const res = await GET(getReq({ code: 'PATT123' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.email).toBe('pat@example.com')
  })

  it('fails closed (429) when the limiter denies — including a DB-outage denial', async () => {
    rateLimitAllowed = false
    const res = await GET(getReq({ code: 'PATT123' }))
    expect(res.status).toBe(429)
  })
})

describe('POST /api/referrers — rate limit is persistent, stays fail-open by design', () => {
  it('calls the persistent rate limiter without failClosed (public signup form)', async () => {
    await POST(postReq({ name: 'Patricia', email: 'patricia@example.com' }))

    expect(rateLimitCalls).toHaveLength(1)
    expect(rateLimitCalls[0].key).toBe('referrer-signup:203.0.113.5')
    expect(rateLimitCalls[0].opts).toBeUndefined()
  })

  it('rejects with 429 when the limiter denies', async () => {
    rateLimitAllowed = false
    const res = await POST(postReq({ name: 'Patricia', email: 'patricia@example.com' }))
    expect(res.status).toBe(429)
  })
})
