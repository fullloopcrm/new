import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/client-analytics (revenue/LTV dashboard: totalRevenue, avgLTV,
 * topClients, atRiskClients, revenueByReferrer) filtered bookings.status=
 * 'completed' only. POST /api/finance/payroll (bulk payroll) flips a
 * booking's `status` straight to 'paid' once the team member is paid out.
 * A bulk-paid booking used to vanish from a client's totalSpent/bookingCount
 * entirely, corrupting revenue totals, top-client ranking, and active/
 * inactive lifecycle classification the instant payroll ran.
 */

const TENANT_A = 'tenant-A'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [
    { id: 'c-bulk-paid', tenant_id: TENANT_A, name: 'Paid-Out Pete', created_at: '2026-01-01T00:00:00Z', status: 'active', referrer_id: null, referrers: null },
  ],
  bookings: [
    { id: 'bk-bulk-paid', tenant_id: TENANT_A, client_id: 'c-bulk-paid', price: 20000, start_time: new Date().toISOString(), status: 'paid' },
  ],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => (vals as unknown[]).includes(r[col])); return c },
    order: () => c,
    then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null })),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

import { GET } from './route'

describe('GET /api/client-analytics — status=paid (bulk payroll) blind spot', () => {
  it('counts the bulk-paid booking toward the client totalSpent, not zero', async () => {
    const res = await GET()
    const json = await res.json()
    const client = json.allClients.find((c: Row) => c.id === 'c-bulk-paid')
    expect(client.totalSpent).toBe(20000)
    expect(client.bookingCount).toBe(1)
  })

  it('rolls the bulk-paid booking into overview totalRevenue', async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.overview.totalRevenue).toBe(20000)
  })
})
