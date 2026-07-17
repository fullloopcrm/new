import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/finance/ar-aging only queried bookings.status='completed', but
 * `status` and `payment_status` are independent fields: POST
 * /api/finance/payroll (bulk payroll) flips a booking's own `status`
 * straight to 'paid' once the TEAM MEMBER is paid, with no regard for
 * whether the CLIENT ever paid (payment_status). So the moment payroll ran
 * on a booking, it silently disappeared from Accounts Receivable entirely
 * -- real client debt (payment_status still 'unpaid') going completely
 * dark, with no collections visibility, just because the crew got paid.
 * Fixed to also include status='paid' bookings, still gated by the
 * existing payment_status != paid/refunded check.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  // Team member paid via bulk payroll (status flipped to 'paid'), but the
  // client never paid -- real AR that must not disappear.
  { id: 'bk-team-paid-client-owes', tenant_id: TENANT, status: 'paid', price: 20000, payment_status: 'unpaid', start_time: '2026-06-01T10:00:00Z', client_id: 'c1', route_id: null, clients: { id: 'c1', name: 'Alice' } },
  // Still fully pending, never touched by payroll.
  { id: 'bk-completed-unpaid', tenant_id: TENANT, status: 'completed', price: 10000, payment_status: 'unpaid', start_time: '2026-06-02T10:00:00Z', client_id: 'c2', route_id: null, clients: { id: 'c2', name: 'Bob' } },
  // Team paid AND client paid -- correctly excluded (payment_status filter).
  { id: 'bk-team-paid-client-paid', tenant_id: TENANT, status: 'paid', price: 15000, payment_status: 'paid', start_time: '2026-06-03T10:00:00Z', client_id: 'c3', route_id: null, clients: { id: 'c3', name: 'Cara' } },
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
              // val is a Postgres literal like '(paid,refunded)'
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

describe('GET /api/finance/ar-aging — status/payment_status are independent', () => {
  it('still surfaces a booking whose team pay is settled but the client still owes money', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/ar-aging'))
    const json = await res.json()
    const ids = json.rows.map((r: Row) => r.id)
    expect(ids).toContain('bk-team-paid-client-owes')
    expect(ids).toContain('bk-completed-unpaid')
    expect(ids).not.toContain('bk-team-paid-client-paid')
  })

  it('counts the team-paid-but-client-owes booking toward the AR total', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/ar-aging'))
    const json = await res.json()
    expect(json.total_cents).toBe(30000) // 200 + 100, the paid-in-full one excluded
  })
})
