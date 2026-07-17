/**
 * GET /api/finance/summary — week/month/year boundaries were built from
 * `new Date()` read via server-local getFullYear()/getMonth()/getDate(), the
 * SERVER's local calendar (UTC on Vercel), not ET. Late at night ET but
 * already past midnight UTC, the boundary silently rolled to the next
 * month/year while it's still "today" in ET -- excluding an entire month's
 * worth of genuinely-this-month bookings.start_time (naive-ET, see
 * lib/recurring.ts's nowNaiveET header) AND genuinely-UTC created_at rows
 * (referral_commissions/payments/team_member_payouts) from the report, the
 * same day-boundary bug class fixed across this session.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique used throughout this
 * session's day-boundary tests) to simulate Vercel's actual runtime -- this
 * sandbox's own local TZ (America/New_York) would otherwise make the OLD
 * code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

// Minimal local fake (not the shared tenant-db-fake, which has no `.or()`
// support and this route's pendingBookings/cleanerPayroll queries use `.or()`)
// -- filters only on eq/gte/lt, the operators this test actually exercises.
function makeLocalFake() {
  return {
    from: (table: string) => {
      const filters: { eq: Array<[string, unknown]>; gte: Array<[string, string]>; lt: Array<[string, string]> } = { eq: [], gte: [], lt: [] }
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: unknown) => { filters.eq.push([col, val]); return chain },
        neq: () => chain,
        in: () => chain,
        is: () => chain,
        not: () => chain,
        or: () => chain,
        gte: (col: string, val: string) => { filters.gte.push([col, val]); return chain },
        lt: (col: string, val: string) => { filters.lt.push([col, val]); return chain },
        lte: (col: string, val: string) => { filters.lt.push([col, val]); return chain },
        order: () => chain,
        limit: () => chain,
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
          const rows = (h.store[table] || []).filter((r) =>
            filters.eq.every(([c, v]) => r[c] === v) &&
            filters.gte.every(([c, v]) => String(r[c]) >= v) &&
            filters.lt.every(([c, v]) => String(r[c]) < v),
          )
          return Promise.resolve(resolve({ data: rows, error: null })).catch(reject)
        },
      }
      return chain
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLocalFake(), supabase: makeLocalFake() }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }),
}))
vi.mock('@/lib/finance/ledger-reports', () => ({
  ledgerProfitAndLoss: async () => ({ revenue_cents: 0, cogs_cents: 0, opex_cents: 0, byCategory: [] }),
}))

import { GET } from './route'

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  h.store = { bookings: [], referral_commissions: [], payments: [], team_member_payouts: [] }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/finance/summary — ET month-boundary fix', () => {
  it('counts a completed booking from earlier in the ET month at 11:50pm EDT July 31', async () => {
    // 11:50pm EDT July 31 == 3:50am UTC Aug 1 -- still "this month" (July) in
    // ET, already next month on the server's UTC clock.
    vi.setSystemTime(new Date('2026-08-01T03:50:00.000Z'))
    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', status: 'completed',
      start_time: '2026-07-31T22:00:00', price: 20000,
      team_member_pay: 5000, team_member_paid: true,
    }]

    const res = await GET()
    const json = await res.json()

    expect(json.monthJobs).toBe(1)
    expect(json.monthLabor).toBe(5000)
  })

  it('counts a genuinely-UTC referral commission created mid-month in the same ET-month window', async () => {
    vi.setSystemTime(new Date('2026-08-01T03:50:00.000Z'))
    h.store.referral_commissions = [{
      tenant_id: 'tenant-A', commission_cents: 1000, created_at: '2026-07-15T12:00:00.000Z',
    }]

    const res = await GET()
    const json = await res.json()

    expect(json.monthReferralCommissions).toBe(1000)
  })
})
