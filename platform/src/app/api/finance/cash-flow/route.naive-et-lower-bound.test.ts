import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed
 * in. The forecast's lower bound was built via `now.toISOString()` -- a
 * real-UTC clock reading -- string-compared against the naive-ET column.
 * During the evening ET window (UTC already on the next calendar day, ET
 * hasn't), that lower bound sits hours in the future relative to real ET
 * "now", silently excluding a still-upcoming booking later tonight from the
 * cash-flow forecast's inflow total. Same bug class already fixed on
 * schedule/calendar, crew/schedule, dashboard, and admin+cron system-check
 * this session.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * Booking starts 2026-01-05T21:00:00 (naive ET, 9pm -- 1.5h away, genuinely
 * still upcoming) and must still count as a projected inflow.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  { id: 'bk-tonight', tenant_id: TENANT, price: 20000, payment_status: 'unpaid', partial_payment_cents: 0, start_time: '2026-01-05T21:00:00' },
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

describe('GET /api/finance/cash-flow — lower bound must use ET, not true-UTC', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still projects a booking starting later tonight ET as an inflow', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/cash-flow'))
    const json = await res.json()
    expect(json.totals.inflows_cents).toBe(20000)
  })
})
