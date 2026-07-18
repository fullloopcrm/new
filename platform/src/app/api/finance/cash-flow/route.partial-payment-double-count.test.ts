import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * GET /api/finance/cash-flow projected the FULL booking price as a future
 * inflow for a booking whose payment_status is 'partial', ignoring
 * partial_payment_cents (the amount the client already sent in, set by
 * payment-processor/Stripe/bank-match). That double-counted money that
 * already landed: it's not a future cash event, only the remainder is.
 * Fixed to subtract partial_payment_cents from price before bucketing.
 *
 * Test never pinned the system clock, so the `.gte('start_time', now)`
 * lower-bound filter increasingly excluded these hardcoded fixture bookings
 * as real wall-clock time passed them -- a flaky failure that reproduced on
 * every later run, not a production regression. Pinned to match the sibling
 * `route.naive-et-lower-bound.test.ts` convention.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const now = new Date('2026-07-17T12:00:00Z')

const bookings: Row[] = [
  // Fully unpaid — whole price is a real future inflow.
  { id: 'bk-unpaid', tenant_id: TENANT, price: 20000, payment_status: 'unpaid', start_time: '2026-07-18T10:00:00Z' },
  // Partially paid — only the remainder ($50 of $200) should still count.
  { id: 'bk-partial', tenant_id: TENANT, price: 20000, payment_status: 'partial', partial_payment_cents: 15000, start_time: '2026-07-19T10:00:00Z' },
  // Fully paid — excluded entirely (existing behavior).
  { id: 'bk-paid', tenant_id: TENANT, price: 10000, payment_status: 'paid', start_time: '2026-07-20T10:00:00Z' },
  // Refunded — money already went back to the client, must NOT project as a
  // future inflow (was previously only excluded via 'paid', not 'refunded').
  { id: 'bk-refunded', tenant_id: TENANT, price: 30000, payment_status: 'refunded', start_time: '2026-07-21T10:00:00Z' },
]

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      not: (col: string, op: string, val: unknown) => { filters.push({ col, op: `not-${op}`, val }); return c },
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'bookings' ? bookings : table === 'invoices' ? [] : table === 'recurring_expenses' ? [] : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'gte') return String(rowVal ?? '') >= String(f.val)
            if (f.op === 'lte') return String(rowVal ?? '') <= String(f.val)
            if (f.op === 'not-in') {
              const excluded = String(f.val).replace(/[()]/g, '').split(',')
              return !excluded.includes(String(rowVal))
            }
            return true
          }),
        )
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
vi.mock('@/lib/entity', () => ({
  entityIdFromUrl: () => null,
}))

import { GET } from './route'

describe('GET /api/finance/cash-flow — partial payments must not double-count received cash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('only projects the remaining balance for a partially-paid booking, not the full price', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/cash-flow'))
    const json = await res.json()
    // unpaid: 200 (full) + partial: 50 (200 - 150 already received) = 250. Paid + refunded excluded.
    expect(json.totals.inflows_cents).toBe(20000 + 5000)
  })

  it('excludes a refunded booking from the inflow forecast entirely', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/cash-flow'))
    const json = await res.json()
    // If the refunded $300 booking leaked in as a projected inflow, this
    // would be 250 + 300 = 550 instead of 250.
    expect(json.totals.inflows_cents).toBe(20000 + 5000)
  })
})
