import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/finance/tax-export — row-count regression + wrong-tenant probe.
 *
 * FIXED: bookings/expenses/contractor-pay queries had no `.range()`, so any
 * tenant with more rows than the project's PostgREST default max-rows cap
 * would get a SILENTLY truncated tax export (no error, missing revenue
 * lines). `paginateAll` (src/lib/finance-export.ts) now pages every query so
 * exports never truncate.
 *
 * The shared tenant-isolation-harness doesn't model the real max-rows cap
 * (it only slices when `.range()` is chained), so it can't catch this
 * regression. This test uses its own minimal fake that DOES simulate the
 * cap — un-ranged queries get capped, ranged queries are honored exactly —
 * so it would have failed against the pre-fix code.
 *
 * LOCK: seeds more rows than the cap and asserts every row appears in the
 * CSV (proves paging past the cap).
 * WRONG-TENANT PROBE: a foreign tenant's booking in the same window must not
 * appear in the export.
 */

const A = 'tid-a'
const B = 'tid-b'
const CAP = 1000 // stand-in for the project's PostgREST default max-rows

type Row = Record<string, unknown>

const holder = vi.hoisted(() => {
  const state = { bookings: [] as Row[], expenses: [] as Row[] }

  function cappedTable(rows: Row[]) {
    let filtered = rows
    let ranged: [number, number] | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filtered = filtered.filter(r => r[col] === val); return chain },
      gte: (col: string, val: unknown) => { filtered = filtered.filter(r => (r[col] as string) >= (val as string)); return chain },
      lte: (col: string, val: unknown) => { filtered = filtered.filter(r => (r[col] as string) <= (val as string)); return chain },
      gt: (col: string, val: unknown) => { filtered = filtered.filter(r => (r[col] as number) > (val as number)); return chain },
      in: (col: string, vals: unknown[]) => { filtered = filtered.filter(r => vals.includes(r[col])); return chain },
      order: () => chain,
      range: (from: number, to: number) => { ranged = [from, to]; return chain },
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
        // A real range() is honored exactly; an un-ranged select gets capped —
        // this is what PostgREST's server-side max-rows setting actually does.
        const page = ranged ? filtered.slice(ranged[0], ranged[1] + 1) : filtered.slice(0, 1000)
        return Promise.resolve({ data: page, error: null }).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  function from(table: string) {
    const rows = table === 'bookings' ? state.bookings : table === 'expenses' ? state.expenses : []
    return cappedTable(rows)
  }

  return { state, from }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: holder.from } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: A })),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

function makeBookings(tenantId: string, count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    tenant_id: tenantId,
    price: 10000,
    team_member_pay: 0,
    payment_status: 'paid',
    payment_method: 'card',
    payment_date: '2026-03-01',
    start_time: '2026-03-01T00:00:00Z',
  }))
}

beforeEach(() => {
  holder.state.bookings = []
  holder.state.expenses = []
})

describe('finance/tax-export GET — pagination + tenant isolation', () => {
  it(`does not truncate an export past the ${CAP}-row PostgREST cap`, async () => {
    holder.state.bookings = [...makeBookings(A, 1500, 'a'), ...makeBookings(B, 5, 'b')]
    const res = await GET(new Request('http://t/api/finance/tax-export?year=2026'))
    expect(res.status).toBe(200)
    const csv = await res.text()
    const revenueLines = csv.split('\n').filter(l => l.includes(',a-'))
    expect(revenueLines).toHaveLength(1500)
  })

  it("excludes the other tenant's bookings from the export", async () => {
    holder.state.bookings = [...makeBookings(A, 5, 'a'), ...makeBookings(B, 5, 'b')]
    const res = await GET(new Request('http://t/api/finance/tax-export?year=2026'))
    const csv = await res.text()
    expect(csv).not.toContain('b-0')
  })
})
