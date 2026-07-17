import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/finance/ar-aging counted a partially-paid booking's FULL price as
 * still-owed AR balance, ignoring partial_payment_cents (the amount the
 * client already sent in). That overstated both the individual row's balance
 * and the AR total by whatever the client had already paid.
 * Fixed to subtract partial_payment_cents from the booking's balance_cents.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  // Fully unpaid — full price is genuinely owed.
  { id: 'bk-unpaid', tenant_id: TENANT, status: 'completed', price: 10000, payment_status: 'unpaid', start_time: '2026-06-01T10:00:00Z', client_id: 'c1', route_id: null, clients: { id: 'c1', name: 'Alice' } },
  // Partially paid — only the remainder ($50 of $200) is still owed.
  { id: 'bk-partial', tenant_id: TENANT, status: 'completed', price: 20000, payment_status: 'partial', partial_payment_cents: 15000, start_time: '2026-06-02T10:00:00Z', client_id: 'c2', route_id: null, clients: { id: 'c2', name: 'Bob' } },
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
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'bookings' ? bookings : table === 'invoices' ? [] : []
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
vi.mock('@/lib/entity', () => ({
  entityIdFromUrl: () => null,
}))

import { GET } from './route'

describe('GET /api/finance/ar-aging — partial payments must not overstate the balance owed', () => {
  it('only counts the remaining balance for a partially-paid booking, not the full price', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/ar-aging'))
    const json = await res.json()
    const partialRow = json.rows.find((r: Row) => r.id === 'bk-partial')
    expect(partialRow.balance_cents).toBe(5000) // 200 - 150 already received
    expect(partialRow.total_cents).toBe(20000) // total price unchanged for reference
  })

  it('sums the AR total using remaining balances, not full prices', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/ar-aging'))
    const json = await res.json()
    expect(json.total_cents).toBe(10000 + 5000) // unpaid 100 + partial's remaining 50
  })
})
