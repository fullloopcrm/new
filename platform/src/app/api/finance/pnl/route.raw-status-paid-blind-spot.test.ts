import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/finance/pnl?source=raw treated status='completed' as the only
 * "settled" marker for cost-of-service and unpaid-client-revenue. But
 * `status` (job/team-pay lifecycle) and `payment_status` (the client's own
 * payment) are independent fields -- POST /api/finance/payroll (bulk
 * payroll) flips a booking's `status` straight to 'paid' once the TEAM
 * MEMBER is paid, with zero regard for whether the CLIENT ever paid. So
 * the moment payroll ran on a booking: its team pay silently dropped out
 * of cost-of-service (understating cost, overstating gross profit), and if
 * the client still hadn't paid, that revenue dropped out of unpaid_cents
 * too (the same client-debt-goes-dark bug already fixed in ar-aging and
 * pending). Fixed by treating status 'completed' OR 'paid' as settled for
 * both figures.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  // Team member paid via bulk payroll (status flipped to 'paid'), client
  // still owes -- must still count in cost-of-service AND unpaid_cents.
  {
    id: 'bk-team-paid-client-owes', tenant_id: TENANT, status: 'paid',
    price: 20000, team_member_pay: 8000, payment_status: 'unpaid',
    actual_hours: 4, start_time: '2026-06-01T10:00:00Z',
  },
  // Still fully pending, never touched by payroll -- baseline, must still work.
  {
    id: 'bk-completed-unpaid', tenant_id: TENANT, status: 'completed',
    price: 10000, team_member_pay: 4000, payment_status: 'unpaid',
    actual_hours: 2, start_time: '2026-06-02T10:00:00Z',
  },
  // Client paid in full -- counted as revenue, not unpaid.
  {
    id: 'bk-client-paid', tenant_id: TENANT, status: 'completed',
    price: 15000, team_member_pay: 6000, payment_status: 'paid',
    actual_hours: 3, start_time: '2026-06-03T10:00:00Z',
  },
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
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'bookings' ? bookings : table === 'expenses' ? [] : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col] as string | undefined
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'gte') return !rowVal || rowVal >= String(f.val)
            if (f.op === 'lte') return !rowVal || rowVal <= String(f.val)
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
vi.mock('@/lib/finance/ledger-reports', () => ({
  ledgerProfitAndLoss: async () => { throw new Error('ledger path should not be used for ?source=raw') },
}))

import { GET } from './route'

describe('GET /api/finance/pnl?source=raw — status/payment_status are independent', () => {
  it('counts a bulk-paid booking toward cost-of-service', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/pnl?from=2026-06-01&to=2026-06-30&source=raw'))
    const json = await res.json()
    // 8000 (bulk-paid) + 4000 (still completed) + 6000 (client-paid, but
    // team pay still an incurred cost) = 18000
    expect(json.cost_of_service_cents).toBe(18000)
  })

  it('still counts the bulk-paid-but-client-owes booking toward unpaid_cents', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/pnl?from=2026-06-01&to=2026-06-30&source=raw'))
    const json = await res.json()
    // 20000 (bulk-paid, client owes) + 10000 (still completed, client owes) = 30000
    expect(json.unpaid_cents).toBe(30000)
  })

  it('does not double-count the client-paid booking as unpaid', async () => {
    const res = await GET(new Request('https://app.fullloop.example/api/finance/pnl?from=2026-06-01&to=2026-06-30&source=raw'))
    const json = await res.json()
    expect(json.revenue_cents).toBe(15000)
    expect(json.bookings_count).toBe(1)
  })
})
