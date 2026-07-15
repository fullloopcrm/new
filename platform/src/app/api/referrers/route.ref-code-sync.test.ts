import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PARITY-DIFF (W4, PORTAL lane): every tenant's own /referral portal page
 * (site/nycmaid/referral, site/template/referral, site/the-florida-maid/referral)
 * and the client/book referrer-attribution lookup read/match on `referrers.ref_code`
 * (a nycmaid-parity column, migrations/009_nycmaid_parity_columns.sql). But this
 * shared POST only wrote `referral_code` (the newer OTP-portal column) and never
 * selected `ref_code` back out on GET — so every referrer who signs up here shows
 * an `undefined` code/link in their own portal, and can never be matched by
 * ref_code at booking time. Also silently dropped `zelle_email` / `apple_cash_phone`
 * on insert (nycmaid's original route stored them; see
 * ~/Desktop/nycmaid/src/app/api/referrers/route.ts) so a referrer's payout
 * destination was never actually saved. This locks in both fixes.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const inserts: Array<{ table: string; payload: Row }> = []
let getRow: Row | null = null
let getSelectCols = ''

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let kind: 'read' | 'insert' = 'read'
    let payload: Row = {}
    const c: Record<string, unknown> = {
      select: (cols?: string) => { if (table === 'referrers' && kind !== 'insert') getSelectCols = cols || ''; return c },
      insert: (p: Row) => { kind = 'insert'; payload = p; inserts.push({ table, payload: p }); return c },
      eq: () => c,
      ilike: () => c,
      gte: () => c,
      single: async () => {
        if (kind === 'insert' && table === 'referrers') {
          return { data: { id: 'ref-1', ...payload }, error: null }
        }
        if (table === 'referrers') return { data: getRow, error: getRow ? null : { message: 'not found' } }
        return { data: null, error: null }
      },
      then: (resolve: (v: { data: null; count: number; error: null }) => unknown) =>
        resolve({ data: null, count: 0, error: null }),
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
import { GET, POST } from '@/app/api/referrers/route'

function req(url: string, body?: Row): NextRequest {
  return new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/referrers — ref_code kept in sync with referral_code', () => {
  beforeEach(() => { inserts.length = 0 })

  it('writes ref_code alongside referral_code so legacy tenant portal pages can find the new referrer', async () => {
    const res = await POST(req('https://canary.example.com/api/referrers', {
      name: 'Maria Lopez', email: 'maria@example.com', phone: '2125551234', preferred_payout: 'zelle',
    }))
    expect(res.status).toBe(201)
    const payload = inserts.find((i) => i.table === 'referrers')?.payload
    expect(payload?.ref_code).toBeTruthy()
    expect(payload?.ref_code).toBe(payload?.referral_code)
  })

  it('persists the payout destination the referrer actually submitted (zelle_email), not just tenant/email defaults', async () => {
    await POST(req('https://canary.example.com/api/referrers', {
      name: 'Maria Lopez', email: 'maria@example.com', phone: '2125551234',
      preferred_payout: 'zelle', zelle_email: 'maria.payouts@gmail.com',
    }))
    const payload = inserts.find((i) => i.table === 'referrers')?.payload
    expect(payload?.zelle_email).toBe('maria.payouts@gmail.com')
  })

  it('persists apple_cash_phone when that is the chosen payout method', async () => {
    await POST(req('https://canary.example.com/api/referrers', {
      name: 'Maria Lopez', email: 'maria@example.com', phone: '2125551234',
      preferred_payout: 'apple_cash', apple_cash_phone: '2125559876',
    }))
    const payload = inserts.find((i) => i.table === 'referrers')?.payload
    expect(payload?.apple_cash_phone).toBe('2125559876')
  })
})

describe('GET /api/referrers?code= — returns ref_code so portal pages can render it', () => {
  beforeEach(() => { getRow = null; getSelectCols = '' })

  it('includes ref_code in the selected columns (not just referral_code)', async () => {
    getRow = { id: 'ref-1', name: 'Maria Lopez', email: 'maria@example.com', referral_code: 'MARI123', ref_code: 'MARI123', total_earned: 0, total_paid: 0 }
    const res = await GET(req('https://canary.example.com/api/referrers?code=MARI123'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ref_code).toBe('MARI123')
    expect(getSelectCols).toContain('ref_code')
  })
})
