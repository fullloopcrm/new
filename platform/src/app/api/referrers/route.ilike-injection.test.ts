import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/referrers is unauthenticated by design (self-serve
 * code/email lookup for tenant-site referral portals). Its `email` param
 * went straight into `.ilike('email', email)` with no wildcard escaping —
 * a caller who supplies raw '%'/'_' controls the ILIKE pattern, so
 * `?email=%25` (a bare '%') matches ANY row instead of confirming a single
 * known address, letting an attacker with zero prior knowledge enumerate
 * every referrer's email/earnings/payout data for a tenant. Mirrors the
 * escapeLike() pattern already used in lib/inbound-email-tenant.ts.
 *
 * The existing route.ref-code-sync.test.ts mocks `.ilike()` as a no-op
 * passthrough, so it can't catch this — this suite mocks it with real
 * SQL-LIKE pattern semantics instead.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>

const referrerRows: Row[] = [
  { id: 'ref-1', tenant_id: TENANT, name: 'Alice Adams', email: 'alice@example.com', referral_code: 'ALIC123', ref_code: 'ALIC123', total_earned: 500, total_paid: 200, preferred_payout: 'zelle' },
  { id: 'ref-2', tenant_id: TENANT, name: 'Bob Brown', email: 'bob@example.com', referral_code: 'BOBB456', ref_code: 'BOBB456', total_earned: 900, total_paid: 100, preferred_payout: 'apple_cash' },
]

function likeToRegExp(pattern: string): RegExp {
  // Real Postgres LIKE semantics: '%' = .*, '_' = ., '\' escapes the next char.
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) {
      out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') {
      out += '.*'
    } else if (c === '_') {
      out += '.'
    } else {
      out += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${out}$`, 'i')
}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let rows: Row[] = table === 'referrers' ? [...referrerRows] : []
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => {
        if (table === 'rate_limit_events') return Promise.resolve({ error: null })
        rows = [{ id: 'new-ref', ...p }]
        return c
      },
      eq: (col: string, val: unknown) => { rows = rows.filter((r) => r[col] === val); return c },
      gte: () => c,
      ilike: (col: string, pattern: string) => {
        const re = likeToRegExp(pattern)
        rows = rows.filter((r) => re.test(String(r[col] ?? '')))
        return c
      },
      single: async () => (rows.length > 0 ? { data: rows[0], error: null } : { data: null, error: { message: 'not found' } }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT, name: 'Canary', slug: 'canary' }),
}))
vi.mock('@/lib/notify', () => ({ notify: async () => ({ success: true }) }))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/referrers/route'

function req(url: string): NextRequest {
  return new NextRequest(url, { headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` } })
}

describe('GET /api/referrers?email= — ILIKE wildcard is neutralized', () => {
  beforeEach(() => {})

  it('does NOT match every referrer when the caller sends a bare "%" wildcard', async () => {
    const res = await req('https://canary.example.com/api/referrers?email=' + encodeURIComponent('%'))
    const result = await GET(res)
    expect(result.status).toBe(404)
  })

  it('does NOT allow prefix-based enumeration via a trailing "%"', async () => {
    const res = await req('https://canary.example.com/api/referrers?email=' + encodeURIComponent('a%'))
    const result = await GET(res)
    expect(result.status).toBe(404)
  })

  it('still matches the real address exactly (case-insensitive), so legitimate self-serve lookup keeps working', async () => {
    const res = await req('https://canary.example.com/api/referrers?email=' + encodeURIComponent('ALICE@EXAMPLE.COM'))
    const result = await GET(res)
    expect(result.status).toBe(200)
    const data = await result.json()
    expect(data.id).toBe('ref-1')
  })
})
