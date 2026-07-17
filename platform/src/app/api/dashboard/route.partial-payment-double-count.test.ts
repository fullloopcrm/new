import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * GET /api/dashboard's today/week/month "revenue collected" figures and its
 * pending-collections bucket both ignored payment_status='partial' entirely
 * -- the revenue queries filtered payment_status='paid' only (so cash a
 * client already sent in on a partial booking never showed as collected
 * revenue), and the pending query filtered payment_status='pending' only (so
 * a partial booking's real outstanding balance never showed as pending
 * either). A partially-paid booking was invisible on both sides of the
 * ledger. Same root cause as the ar-aging/cash-flow/finance-summary fix this
 * session.
 */

const TENANT_A = 'tenant-A'
const now = new Date()

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  bookings: [
    // Fully paid — should count in full toward revenue collected.
    { id: 'bk-paid', tenant_id: TENANT_A, price: 20000, start_time: now.toISOString(), status: 'completed', payment_status: 'paid' },
    // Partially paid — $50 of $200 already collected, $150 still owed.
    { id: 'bk-partial', tenant_id: TENANT_A, price: 20000, partial_payment_cents: 5000, start_time: now.toISOString(), status: 'completed', payment_status: 'partial' },
    // Fully unpaid — whole price is pending, nothing collected yet.
    { id: 'bk-unpaid', tenant_id: TENANT_A, price: 10000, start_time: now.toISOString(), status: 'completed', payment_status: 'pending' },
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

describe('GET /api/dashboard — partial payments must not vanish from either side of the ledger', () => {
  it('counts only the amount actually received (not full price) toward today/week/month revenue', async () => {
    const res = await GET()
    const json = await res.json()
    // bk-paid (20000) + bk-partial's received amount (5000), NOT bk-partial's full price.
    expect(json.financials.today.revenue).toBe(25000)
    expect(json.financials.week.revenue).toBe(25000)
    expect(json.financials.month.revenue).toBe(25000)
  })

  it('counts a partial booking\'s remaining balance (not full price) toward pending, alongside the fully-unpaid booking', async () => {
    const res = await GET()
    const json = await res.json()
    // bk-unpaid (10000) + bk-partial's remaining balance (20000 - 5000 = 15000).
    expect(json.financials.pending.revenue).toBe(25000)
    expect(json.financials.pending.jobs).toBe(2)
  })
})
