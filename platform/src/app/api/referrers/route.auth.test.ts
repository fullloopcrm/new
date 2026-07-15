import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * GET /api/referrers?code=|email= — admin-gate regression.
 *
 * This lookup used to be reachable with NO auth at all: any caller who knew
 * or guessed a referral code (small keyspace: name-prefix + 3 digits) or a
 * referrer's email got back name/email/referral_code/total_earned/
 * total_paid/preferred_payout — financial data, not just an existence check.
 * The referrer-facing UI was migrated off this to a Bearer-token-gated
 * GET /api/referrers/[code] a while back (see src/app/site/referral/
 * page.test.tsx), but the old unauthenticated route was only ever
 * rate-limited, never actually closed. Probe: an unauthenticated caller must
 * be rejected before any referrer data is looked up or returned.
 */

const REFERRER = {
  id: 'ref_1',
  name: 'Pat',
  email: 'pat@example.com',
  referral_code: 'PATT123',
  total_earned: 5000,
  total_paid: 2000,
  preferred_payout: 'zelle',
  created_at: '2026-01-01',
}

let referrersSelectCalled: boolean

function referrersBuilder() {
  const chain: Record<string, unknown> = {
    select: () => { referrersSelectCalled = true; return chain },
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

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 9 }),
}))

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({ requireAdmin: () => requireAdminMock() }))

import { GET } from './route'

function getReq(params: Record<string, string>): NextRequest {
  const url = new URL('https://example.com/api/referrers')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return {
    nextUrl: url,
    headers: { get: () => '203.0.113.5' },
  } as unknown as NextRequest
}

beforeEach(() => {
  referrersSelectCalled = false
  requireAdminMock.mockReset()
})

describe('GET /api/referrers?code=|email= — admin session required', () => {
  it('rejects an unauthenticated code lookup with 401 and never touches referrer data', async () => {
    requireAdminMock.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const res = await GET(getReq({ code: 'PATT123' }))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).not.toHaveProperty('total_earned')
    expect(body).not.toHaveProperty('email')
    expect(referrersSelectCalled).toBe(false)
  })

  it('rejects an unauthenticated email lookup with 401 and never touches referrer data', async () => {
    requireAdminMock.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const res = await GET(getReq({ email: 'pat@example.com' }))

    expect(res.status).toBe(401)
    expect(referrersSelectCalled).toBe(false)
  })

  it('serves the lookup once an admin session is present', async () => {
    requireAdminMock.mockResolvedValue(null)

    const res = await GET(getReq({ code: 'PATT123' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('pat@example.com')
    expect(referrersSelectCalled).toBe(true)
  })
})
