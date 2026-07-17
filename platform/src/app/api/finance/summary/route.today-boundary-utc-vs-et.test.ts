import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * This route mixes three column types against the same month boundary:
 * bookings.start_time (naive-ET TIMESTAMP), referral_commissions/payments/
 * team_member_payouts.created_at (TIMESTAMPTZ), and journal_entries.entry_date
 * (via ledgerProfitAndLoss, a plain DATE). The old
 * `new Date().getFullYear()/getMonth()/getDate()/getDay()` read the SERVER's
 * local calendar (UTC on Vercel), a full day ahead of ET for ~4-5h every
 * evening. During that window (the evening of the last day of the ET
 * month), the server's UTC clock has already rolled to the NEXT month,
 * pushing every "this month" boundary a full month ahead of the true ET
 * month -- silently excluding every booking/commission/payment from earlier
 * in the real (ET) current month.
 *
 * Real time in this test: 2026-02-01T02:30:00Z = 9:30pm EST Jan 31 -- ET's
 * current month is still January. A booking, referral commission, and
 * payment all dated Jan 15 (clearly this ET month) must still count.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
    lt: (col: string, val: unknown) => { filters.push((r) => String(r[col]) < String(val)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) <= String(val)); return c },
    or: () => c,
    not: () => c,
    order: () => c,
    limit: () => c,
    range: () => c,
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { GET } from './route'

describe('GET /api/finance/summary — "this month" boundaries must use ET, not server-local', () => {
  beforeEach(() => {
    DB.bookings = [
      {
        id: 'bk-jan15',
        tenant_id: TENANT,
        status: 'completed',
        start_time: '2026-01-15T12:00:00', // naive ET
        price: 10000,
        team_member_pay: 5000,
        team_member_paid: true,
        payment_status: 'paid',
        partial_payment_cents: 0,
      },
    ]
    DB.referral_commissions = [
      { id: 'rc-1', tenant_id: TENANT, commission_cents: 500, created_at: '2026-01-15T12:00:00.000Z' },
    ]
    DB.payments = [
      { id: 'p-1', tenant_id: TENANT, amount_cents: 1000, tip_cents: 200, method: 'stripe', created_at: '2026-01-15T12:00:00.000Z' },
    ]
    DB.team_member_payouts = []
    DB.journal_lines = []
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T02:30:00.000Z')) // 9:30pm EST Jan 31
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still counts a booking/commission/payment dated earlier in the ET-current month', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.monthJobs).toBe(1)
    expect(body.monthReferralCommissions).toBe(500)
    expect(body.monthTips).toBe(200)
  })
})
