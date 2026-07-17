import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * GET /api/finance/summary's week/month/year labor + job-count queries, and
 * its pending-cleaner-payments figure, filtered bookings.status='completed'
 * only. But `status` and `team_member_paid` are independent: POST /api/
 * finance/payroll (bulk payroll) flips a booking's `status` straight to
 * 'paid' once claimed, but never sets `team_member_paid`. Before this fix:
 * a bulk-paid booking vanished from labor cost + job counts entirely
 * (undercounting). A naive fix that just widens the status filter without
 * also treating status='paid' as "settled" in the paid/owed split would
 * have traded that bug for a worse one: bulk-paid labor showing up as
 * still-OWED (since team_member_paid stays false on those rows). This test
 * proves both halves: the booking counts toward gross labor + job count,
 * AND does not show as still-owed.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

let bookingsByQuery: Row[] = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    let orClause: string | null = null
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lt: (col: string, val: unknown) => { filters.push({ col, op: 'lt', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      not: () => c,
      or: (clause: string) => { orClause = clause; return c },
      order: () => c,
      limit: () => c,
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'bookings' ? bookingsByQuery
          : table === 'referral_commissions' ? []
          : table === 'payments' ? []
          : table === 'team_member_payouts' ? []
          : []
        let rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'gte' || f.op === 'lt' || f.op === 'lte') return true // date bounds not exercised here
            return true
          }),
        )
        if (orClause) {
          // Only the two OR clauses this route actually uses.
          if (orClause === 'payment_status.neq.paid,team_member_paid.neq.true') {
            rows = rows.filter(r => r.payment_status !== 'paid' || r.team_member_paid !== true)
          } else if (orClause === 'team_member_paid.is.null,team_member_paid.eq.false') {
            rows = rows.filter(r => r.team_member_paid == null || r.team_member_paid === false)
          }
        }
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/finance/ledger-reports', () => ({
  ledgerProfitAndLoss: async () => ({ revenue_cents: 0 }),
}))

import { GET } from './route'

describe('GET /api/finance/summary — status=paid (bulk payroll) vs team_member_paid', () => {
  beforeEach(() => {
    const now = new Date()
    bookingsByQuery = [
      // Bulk-paid via payroll: status='paid', team_member_paid never set.
      { id: 'bk-bulk-paid', tenant_id: TENANT, status: 'paid', price: 20000, team_member_pay: 8000, team_member_paid: false, payment_status: 'unpaid', start_time: now.toISOString() },
      // Manually paid via cleaner-payout: status stays 'completed', team_member_paid=true.
      { id: 'bk-manual-paid', tenant_id: TENANT, status: 'completed', price: 15000, team_member_pay: 6000, team_member_paid: true, payment_status: 'paid', start_time: now.toISOString() },
      // Still genuinely pending.
      { id: 'bk-pending', tenant_id: TENANT, status: 'completed', price: 10000, team_member_pay: 4000, team_member_paid: false, payment_status: 'unpaid', start_time: now.toISOString() },
    ]
  })

  it('counts the bulk-paid booking toward gross labor and job count', async () => {
    const res = await GET()
    const json = await res.json()
    // 8000 + 6000 + 4000 = 18000
    expect(json.weekLabor).toBe(18000)
    expect(json.weekJobs).toBe(3)
  })

  it('treats the bulk-paid booking as PAID labor, not owed', async () => {
    const res = await GET()
    const json = await res.json()
    // paid = bulk-paid (8000) + manual-paid (6000) = 14000; owed = pending (4000) only
    expect(json.weekLaborPaid).toBe(14000)
    expect(json.weekLaborOwed).toBe(4000)
  })

  it('does not show the bulk-paid booking as pending cleaner payment', async () => {
    const res = await GET()
    const json = await res.json()
    // Only bk-pending's 4000 is genuinely owed to a cleaner.
    expect(json.pendingCleanerPayments).toBe(4000)
  })

  it('still surfaces the bulk-paid booking as pending CLIENT payment (client never paid)', async () => {
    const res = await GET()
    const json = await res.json()
    // bk-bulk-paid (20000, unpaid) + bk-pending (10000, unpaid) = 30000
    expect(json.pendingClientPayments).toBe(30000)
  })
})
