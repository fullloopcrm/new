import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * GET /api/referral-commissions?referrer_id=... — admin-gate regression.
 *
 * This branch used to be reachable with NO auth at all: any caller who had
 * (or found) a referrer's UUID got back that referrer's full commission
 * ledger — client_name, gross/commission amounts, status, paid_via, plus the
 * referrer's own name/email/referral_code via the join. The comment on this
 * branch claimed "the referrer portal calls this with their own ID", but the
 * live referrer portal (src/app/site/referral/page.tsx) fetches its
 * dashboard from the Bearer-token-gated GET /api/referrers/[code] instead,
 * which already scopes commissions to the verified referrer server-side —
 * nothing in-repo calls this endpoint with referrer_id. Probe: an
 * unauthenticated caller must be rejected before any commission data is
 * looked up or returned.
 */

let referrersQueried: boolean
let commissionsQueried: boolean

function referrersBuilder() {
  const chain: Record<string, unknown> = {
    select: () => { referrersQueried = true; return chain },
    eq: () => chain,
    maybeSingle: async () => ({ data: { tenant_id: 'tenant_1' }, error: null }),
  }
  return chain
}

function commissionsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => { commissionsQueried = true; return chain },
    eq: () => chain,
    order: async () => ({ data: [{ id: 'c1', client_name: 'Someone', commission_cents: 500 }], error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'referrers') return referrersBuilder()
      if (table === 'referral_commissions') return commissionsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn(async () => {}),
  postCommissionPayment: vi.fn(async () => {}),
}))

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({ requireAdmin: () => requireAdminMock() }))

import { GET } from './route'

function getReq(params: Record<string, string>): Request {
  const url = new URL('https://example.com/api/referral-commissions')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url)
}

beforeEach(() => {
  referrersQueried = false
  commissionsQueried = false
  requireAdminMock.mockReset()
})

describe('GET /api/referral-commissions?referrer_id= — admin session required', () => {
  it('rejects an unauthenticated referrer_id lookup with 401 and never touches the ledger', async () => {
    requireAdminMock.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const res = await GET(getReq({ referrer_id: 'rf-a' }))

    expect(res.status).toBe(401)
    expect(referrersQueried).toBe(false)
    expect(commissionsQueried).toBe(false)
  })

  it('serves the ledger once an admin session is present', async () => {
    requireAdminMock.mockResolvedValue(null)

    const res = await GET(getReq({ referrer_id: 'rf-a' }))

    expect(res.status).toBe(200)
    expect(commissionsQueried).toBe(true)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
