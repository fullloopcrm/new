import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/finance/tax-export's REVENUE section reported a partially-paid
 * booking's FULL price as collected revenue, ignoring partial_payment_cents
 * (the amount the client actually sent in) — the same blind spot already
 * fixed in dashboard/cash-flow/ar-aging/summary, but missed here. Since this
 * CSV is handed straight to the accountant for tax filing, it overstated
 * taxable revenue by the unpaid remainder of every partial-payment booking.
 * Fixed to report partial_payment_cents (not price) when payment_status is
 * 'partial'.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  // Fully paid — full price was genuinely collected.
  { id: 'bk-paid', tenant_id: TENANT, price: 10000, team_member_pay: 3000, payment_status: 'paid', payment_method: 'stripe', payment_date: '2026-03-02T00:00:00Z', start_time: '2026-03-01T10:00:00Z', clients: { name: 'Alice' } },
  // Partially paid — only $50 of the $200 price was actually received.
  { id: 'bk-partial', tenant_id: TENANT, price: 20000, partial_payment_cents: 5000, team_member_pay: 4000, payment_status: 'partial', payment_method: 'stripe', payment_date: '2026-03-05T00:00:00Z', start_time: '2026-03-04T10:00:00Z', clients: { name: 'Bob' } },
]

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      gt: (col: string, val: unknown) => { filters.push({ col, op: 'gt', val }); return c },
      order: () => c,
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'bookings' ? bookings : table === 'expenses' ? [] : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'gte') return rowVal !== undefined && String(rowVal) >= String(f.val)
            if (f.op === 'lte') return rowVal !== undefined && String(rowVal) <= String(f.val)
            if (f.op === 'gt') return Number(rowVal || 0) > Number(f.val)
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

describe('GET /api/finance/tax-export — partial payments must not overstate revenue', () => {
  it('reports only the amount actually received for a partially-paid booking, not its full price', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/tax-export?year=2026'))
    const csv = await res.text()
    const revenueLines = csv.split('\n# EXPENSES')[0]
    expect(revenueLines).toContain('bk-paid,Alice,100.00')
    expect(revenueLines).toContain('bk-partial,Bob,50.00')
    expect(revenueLines).not.toContain('200.00')
  })
})
