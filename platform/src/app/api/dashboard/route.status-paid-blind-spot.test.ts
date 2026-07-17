import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * GET /api/dashboard (the main operator dashboard aggregator) filtered
 * bookings.status='completed' only across four spots: the pending-collections
 * revenue bucket, the 30-day "completed" stat count, and the today/week/month
 * "revenue collected" figures. POST /api/finance/payroll (bulk payroll) flips
 * a booking's `status` straight to 'paid' once the team member is paid out --
 * that says nothing about whether the client still owes money (payment_status)
 * or whether the job itself should keep showing on the operator's own
 * dashboard. A bulk-paid booking used to vanish from all of these the instant
 * payroll ran on it. Same root cause as the finance/pnl, finance/summary,
 * cleaner-income, crew-earnings, reconcile-candidates, ar-aging, pending,
 * client-analytics sweep this session.
 */

const TENANT_A = 'tenant-A'
const now = new Date()

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  bookings: [
    // Team paid via bulk payroll AND client already paid -- should count
    // toward "revenue collected" (today/week/month) and job lists.
    { id: 'bk-collected', tenant_id: TENANT_A, price: 20000, start_time: now.toISOString(), status: 'paid', payment_status: 'paid' },
    // Team paid via bulk payroll but client STILL owes -- should still show
    // up in the pending-collections bucket.
    { id: 'bk-owed', tenant_id: TENANT_A, price: 15000, start_time: now.toISOString(), status: 'paid', payment_status: 'pending' },
  ],
  clients: [],
  team_members: [],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let headCount = false
  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { head?: boolean }) => {
      if (opts?.head) headCount = true
      return c
    },
    eq: (col: string, val: unknown) => {
      filters.push((r) => r[col] === val)
      return c
    },
    in: (col: string, vals: unknown[]) => {
      filters.push((r) => vals.includes(r[col]))
      return c
    },
    gte: (col: string, val: unknown) => {
      filters.push((r) => (r[col] as string) >= (val as string))
      return c
    },
    lt: (col: string, val: unknown) => {
      filters.push((r) => (r[col] as string) < (val as string))
      return c
    },
    lte: (col: string, val: unknown) => {
      filters.push((r) => (r[col] as string) <= (val as string))
      return c
    },
    order: () => c,
    then: (res: (v: { data: unknown; count: number | null; error: unknown }) => unknown) => {
      const filtered = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve(
        res({ data: headCount ? null : filtered, count: headCount ? filtered.length : null, error: null }),
      )
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: TENANT_A, role: 'admin' })),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/rbac', () => ({ hasPermission: () => true }))
vi.mock('@/lib/require-permission', () => ({ overridesFor: () => ({}) }))

import { GET } from './route'

describe('GET /api/dashboard — status=paid (bulk payroll) blind spot', () => {
  it('keeps a bulk-paid-but-client-still-owes booking in the pending-collections bucket', async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.financials.pending.revenue).toBe(15000)
    expect(json.financials.pending.jobs).toBe(1)
  })

  it('rolls a bulk-paid, client-already-paid booking into today/week/month revenue collected', async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(20000)
    expect(json.financials.week.revenue).toBe(20000)
    expect(json.financials.month.revenue).toBe(20000)
  })

  it('counts both bulk-paid bookings toward the 30-day completed stat', async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.stats.completed).toBe(2)
  })

  it('keeps bulk-paid bookings on the today job list and map instead of vanishing', async () => {
    const res = await GET()
    const json = await res.json()
    const todayIds = (json.todayJobs as Row[]).map((j) => j.id)
    expect(todayIds).toContain('bk-collected')
    expect(todayIds).toContain('bk-owed')
    const mapTodayIds = (json.mapJobs.today as Row[]).map((j) => j.id)
    expect(mapTodayIds).toContain('bk-collected')
  })
})
