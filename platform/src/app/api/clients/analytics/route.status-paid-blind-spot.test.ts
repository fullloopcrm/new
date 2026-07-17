import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/clients/analytics (per-client LTV + lifecycle report) filtered
 * bookings.status='completed' only. POST /api/finance/payroll (bulk
 * payroll) flips a booking's `status` straight to 'paid' once the team
 * member is paid out. A client whose only booking got bulk-paid used to
 * vanish from this report entirely -- LTV, booking count, and lifecycle
 * classification all silently dropped to nothing the instant payroll ran.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  bookings: [
    // Bulk-paid: status='paid'. Client's ONLY booking.
    { tenant_id: TENANT_A, client_id: 'c-bulk-paid', price: 20000, start_time: new Date().toISOString(), status: 'paid', clients: { name: 'Paid-Out Pete' } },
    // Still genuinely unfinished.
    { tenant_id: TENANT_A, client_id: 'c-scheduled', price: 5000, start_time: new Date().toISOString(), status: 'scheduled', clients: { name: 'Future Fran' } },
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
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ active_client_threshold_days: 30, at_risk_threshold_days: 90 }),
}))
vi.mock('@/lib/tenant-query', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

import { GET } from './route'

describe('GET /api/clients/analytics — status=paid (bulk payroll) blind spot', () => {
  it('includes the bulk-paid client in the report, not vanished', async () => {
    const res = await GET()
    const json = await res.json()
    const ids = json.clients.map((c: Row) => c.client_id)
    expect(ids).toContain('c-bulk-paid')
  })

  it('counts the bulk-paid booking toward LTV and totals', async () => {
    const res = await GET()
    const json = await res.json()
    const client = json.clients.find((c: Row) => c.client_id === 'c-bulk-paid')
    expect(client.ltv).toBe(20000)
    expect(json.summary.totalClients).toBe(1) // scheduled booking's client isn't "completed" work yet
    expect(json.summary.totalLtv).toBe(20000)
  })

  it('excludes a merely-scheduled (not yet finished) booking', async () => {
    const res = await GET()
    const json = await res.json()
    const ids = json.clients.map((c: Row) => c.client_id)
    expect(ids).not.toContain('c-scheduled')
  })
})
