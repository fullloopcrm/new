import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/deals/at-risk (the outreach "workable client list" that drives
 * the sales team's who-to-call view) fetched bookings.status in
 * ('completed','scheduled','in_progress') -- no 'paid'. POST /api/finance/
 * payroll (bulk payroll) flips a booking's `status` straight to 'paid'
 * once the team member is paid out. A recently-serviced client's booking
 * used to be invisible to this query entirely the instant payroll ran on
 * it -- zeroing out totalSpent/totalBookings and making lastBookingDate
 * null, which could falsely surface a just-serviced client as overdue for
 * outreach.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [
    { id: 'c-bulk-paid', tenant_id: TENANT, name: 'Paid-Out Pete', status: 'active', created_at: '2026-01-01T00:00:00Z', do_not_service: false, last_outreach_at: null, outreach_count: 0, outreach_status: 'none' },
  ],
  bookings: [
    { id: 'bk-bulk-paid', tenant_id: TENANT, client_id: 'c-bulk-paid', status: 'paid', price: 15000, start_time: '2026-06-01T10:00:00Z' },
  ],
  deals: [],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => (vals as unknown[]).includes(r[col])); return c },
    order: () => c,
    limit: () => c,
    then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null })),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
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

describe('GET /api/deals/at-risk — status=paid (bulk payroll) blind spot', () => {
  it('counts the bulk-paid booking toward totalSpent/totalBookings, not zero', async () => {
    const res = await GET()
    const json = await res.json()
    const all = [...json.workable, ...json.withUpcoming, ...json.onBoard]
    const client = all.find((c: Row) => c.id === 'c-bulk-paid')
    expect(client.totalSpent).toBe(15000)
    expect(client.totalBookings).toBe(1)
    expect(client.lastBookingDate).toBe('2026-06-01T10:00:00.000Z')
  })
})
