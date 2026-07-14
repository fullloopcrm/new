/**
 * GET /api/referrers?code=... / ?email=... — unauthenticated financial-data
 * leak regression.
 *
 * This lookup is public by design (no login) so a referrer -- or the legacy
 * per-tenant referral pages -- can resolve a referral code/email with no
 * session. It used to also select total_earned/total_paid/preferred_payout.
 * A referral code is handed out publicly on purpose (it's literally the
 * share link: `/book/new?ref=CODE`), so anyone who ever saw one could pull
 * the referrer's real earnings and payout method with zero auth. The actual
 * earnings dashboard (/api/referrers/[code]) is correctly gated behind an
 * email-OTP session -- this sibling lookup must never re-expose the same
 * financial fields without that gate.
 *
 * The shared in-memory Supabase fakes elsewhere in this repo deliberately
 * ignore the `.select(cols)` projection (they return whole rows regardless
 * of the requested column list), which would make this specific regression
 * untestable through them -- the property under test IS the column list.
 * This file uses a minimal local fake that actually projects columns, the
 * same way real PostgREST does.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const REFERRER_ROW = {
  id: 'referrer-1',
  tenant_id: 'tenant-1',
  name: 'Real Referrer',
  email: 'referrer@example.com',
  referral_code: 'REAL123',
  total_earned: 500000,
  total_paid: 100000,
  preferred_payout: 'zelle',
  created_at: '2026-01-01',
}

function project(row: Record<string, unknown>, cols: string): Record<string, unknown> {
  const fields = cols.split(',').map((c) => c.trim())
  return Object.fromEntries(fields.map((f) => [f, row[f]]))
}

// A real (if minimal) SQL LIKE-pattern matcher: `%` = any run of chars, `_` =
// any single char, `\` escapes the next char. This is what real Postgres
// ILIKE does — a fake that just lower-cases and string-compares (the prior
// version of this fake) can't catch a wildcard-injection regression because
// it never treats `%`/`_` as wildcards in the first place.
function ilikeMatches(pattern: string, value: string): boolean {
  let regex = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) {
      regex += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') {
      regex += '.*'
    } else if (c === '_') {
      regex += '.'
    } else {
      regex += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${regex}$`, 'i').test(value)
}

vi.mock('@/lib/supabase', () => {
  const chain = (cols: string) => {
    const state: { eqs: Record<string, unknown>; ilikes: Record<string, unknown> } = { eqs: {}, ilikes: {} }
    const builder = {
      eq(col: string, val: unknown) {
        state.eqs[col] = val
        return builder
      },
      ilike(col: string, val: unknown) {
        state.ilikes[col] = val
        return builder
      },
      single: async () => {
        const matches =
          state.eqs.tenant_id === REFERRER_ROW.tenant_id &&
          (state.eqs.referral_code === REFERRER_ROW.referral_code ||
            (typeof state.ilikes.email === 'string' && ilikeMatches(state.ilikes.email, REFERRER_ROW.email)))
        if (!matches) return { data: null, error: { message: 'not found' } }
        return { data: project(REFERRER_ROW, cols), error: null }
      },
    }
    return builder
  }
  const supabaseAdmin = {
    from: (_table: string) => ({
      select: (cols: string) => chain(cols),
    }),
  }
  return { supabaseAdmin, supabase: supabaseAdmin }
})
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))

import { GET } from './route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/referrers -- public code/email lookup never leaks financial fields', () => {
  it('code lookup omits total_earned/total_paid/preferred_payout', async () => {
    const res = await GET(new NextRequest('http://x/api/referrers?code=REAL123'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referral_code).toBe('REAL123')
    expect(json).not.toHaveProperty('total_earned')
    expect(json).not.toHaveProperty('total_paid')
    expect(json).not.toHaveProperty('preferred_payout')
  })

  it('email lookup omits total_earned/total_paid/preferred_payout', async () => {
    const res = await GET(new NextRequest('http://x/api/referrers?email=referrer@example.com'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referral_code).toBe('REAL123')
    expect(json).not.toHaveProperty('total_earned')
    expect(json).not.toHaveProperty('total_paid')
    expect(json).not.toHaveProperty('preferred_payout')
  })
})

describe('GET /api/referrers?email= -- LIKE wildcard injection', () => {
  it('a bare "%" does not match every referrer (would otherwise leak name/email/code with zero auth)', async () => {
    const res = await GET(new NextRequest(`http://x/api/referrers?email=${encodeURIComponent('%')}`))
    expect(res.status).toBe(404)
  })

  it('a partial pattern like "%@example.com" does not match the real referrer', async () => {
    const res = await GET(new NextRequest(`http://x/api/referrers?email=${encodeURIComponent('%@example.com')}`))
    expect(res.status).toBe(404)
  })

  it('the exact email (positive control) still resolves', async () => {
    const res = await GET(new NextRequest(`http://x/api/referrers?email=${encodeURIComponent('referrer@example.com')}`))
    expect(res.status).toBe(200)
  })
})
