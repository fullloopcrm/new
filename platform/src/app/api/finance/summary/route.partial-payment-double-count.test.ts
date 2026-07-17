import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * GET /api/finance/summary's pendingClientPayments summed a booking's FULL
 * price for any payment_status !== 'paid', including 'partial' -- ignoring
 * partial_payment_cents (the amount the client already sent in, set by
 * payment-processor/Stripe/bank-match). That double-counted money that had
 * already landed into the dashboard's headline "pending client payments"
 * figure, same class of bug as ar-aging/cash-flow this session.
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
      gte: () => c,
      lt: () => c,
      lte: () => c,
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
            return true
          }),
        )
        if (orClause === 'payment_status.neq.paid,team_member_paid.neq.true') {
          rows = rows.filter(r => r.payment_status !== 'paid' || r.team_member_paid !== true)
        } else if (orClause === 'team_member_paid.is.null,team_member_paid.eq.false') {
          rows = rows.filter(r => r.team_member_paid == null || r.team_member_paid === false)
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

describe('GET /api/finance/summary — partial payments must not double-count received cash', () => {
  beforeEach(() => {
    const now = new Date()
    bookingsByQuery = [
      // Fully unpaid — whole price is genuinely pending.
      { id: 'bk-unpaid', tenant_id: TENANT, status: 'completed', price: 10000, team_member_pay: 0, team_member_paid: false, payment_status: 'unpaid', start_time: now.toISOString() },
      // Partially paid — only the remainder ($50 of $200) is still pending.
      { id: 'bk-partial', tenant_id: TENANT, status: 'completed', price: 20000, partial_payment_cents: 15000, team_member_pay: 0, team_member_paid: false, payment_status: 'partial', start_time: now.toISOString() },
      // Refunded — money already went back to the client, must NOT count
      // toward pendingClientPayments (was previously only excluded via
      // 'paid', not 'refunded').
      { id: 'bk-refunded', tenant_id: TENANT, status: 'completed', price: 30000, team_member_pay: 0, team_member_paid: false, payment_status: 'refunded', start_time: now.toISOString() },
    ]
  })

  it('only counts the remaining balance for a partially-paid booking toward pendingClientPayments', async () => {
    const res = await GET()
    const json = await res.json()
    // unpaid: 100 (full) + partial: 50 (200 - 150 already received) = 150. Refunded booking excluded.
    expect(json.pendingClientPayments).toBe(10000 + 5000)
  })
})
