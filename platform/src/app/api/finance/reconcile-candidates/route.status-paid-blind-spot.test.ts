import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/finance/reconcile-candidates only queried bookings.status=
 * 'completed' for its client-owes-money candidate list. Same independent-
 * fields bug already fixed on ar-aging/pending/pnl/summary/cleaner-income
 * this session: bulk payroll flips a booking's `status` to 'paid' with no
 * regard for whether the client ever paid, so a real, still-unpaid booking
 * dropped out of reconciliation candidates entirely the moment payroll ran
 * on it. Fixed to also include status='paid' bookings, still gated by the
 * existing payment_status != paid/refunded check.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  { id: 'bk-team-paid-client-owes', tenant_id: TENANT, status: 'paid', price: 20000, payment_status: 'unpaid', start_time: '2026-06-01T10:00:00Z', route_id: null, clients: { name: 'Alice' } },
  { id: 'bk-completed-unpaid', tenant_id: TENANT, status: 'completed', price: 10000, payment_status: 'unpaid', start_time: '2026-06-02T10:00:00Z', route_id: null, clients: { name: 'Bob' } },
  { id: 'bk-team-paid-client-paid', tenant_id: TENANT, status: 'paid', price: 15000, payment_status: 'paid', start_time: '2026-06-03T10:00:00Z', route_id: null, clients: { name: 'Cara' } },
]

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      not: (col: string, op: string, val: unknown) => { filters.push({ col, op: `not-${op}`, val }); return c },
      is: (col: string, val: unknown) => { filters.push({ col, op: 'is', val }); return c },
      order: () => c,
      limit: () => c,
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'bookings' ? bookings : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'is') return rowVal === f.val
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

import { GET } from './route'

describe('GET /api/finance/reconcile-candidates — status/payment_status are independent', () => {
  it('still surfaces a booking whose team pay is settled but the client still owes money', async () => {
    const res = await GET()
    const json = await res.json()
    const ids = json.bookings.map((b: Row) => b.id)
    expect(ids).toContain('bk-team-paid-client-owes')
    expect(ids).toContain('bk-completed-unpaid')
    expect(ids).not.toContain('bk-team-paid-client-paid')
  })
})
