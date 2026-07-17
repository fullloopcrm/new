import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/referrers/analytics's `completedReferredBookings` counted
 * bookings.status==='completed' only. POST /api/finance/payroll (bulk
 * payroll) flips a booking's `status` straight to 'paid' once the team
 * member is paid out -- a finished referred job, but the count silently
 * dropped it the instant payroll ran, undercounting a referrer's actual
 * completed-job volume.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  lead_clicks: [],
  bookings: [
    { id: 'bk-bulk-paid', tenant_id: TENANT, status: 'paid', price: 20000, referrer_id: 'ref-1' },
    { id: 'bk-pending', tenant_id: TENANT, status: 'scheduled', price: 5000, referrer_id: 'ref-1' },
  ],
  referrers: [],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    not: (col: string, _op: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    order: () => c,
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

describe('GET /api/referrers/analytics — status=paid (bulk payroll) blind spot', () => {
  it('counts the bulk-paid referred booking as completed, not dropped', async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.overview.completedReferredBookings).toBe(1)
    expect(json.overview.totalReferredBookings).toBe(2)
  })
})
