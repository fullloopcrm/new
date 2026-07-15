import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/pnl?source=raw (converted to tenantDb).
 *
 * The raw-source path reads `bookings` + `expenses` directly; both are now scoped
 * by tenantDb (`.eq('tenant_id', ctx)`). A foreign tenant's paid booking / expense
 * in the same date window must NOT bleed into the caller's revenue/expense totals.
 * (The default ledger path returns before these reads and is out of scope here.)
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: A })),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/entity', () => ({ entityIdFromUrl: () => null }))
vi.mock('@/lib/finance/ledger-reports', () => ({ ledgerProfitAndLoss: vi.fn(async () => ({ revenue_cents: 0 })) }))

import { GET } from './route'

function seed() {
  return {
    bookings: [
      { id: 'a1', tenant_id: A, price: 10000, team_member_pay: 3000, payment_status: 'paid', start_time: '2026-07-10T00:00:00Z', status: 'completed' },
      { id: 'b1', tenant_id: B, price: 99999, team_member_pay: 4000, payment_status: 'paid', start_time: '2026-07-10T00:00:00Z', status: 'completed' },
    ],
    expenses: [
      { id: 'e-a', tenant_id: A, category: 'supplies', amount: 5000, date: '2026-07-10', tax_deductible: true },
      { id: 'e-b', tenant_id: B, category: 'supplies', amount: 88888, date: '2026-07-10', tax_deductible: true },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/pnl GET (source=raw) — tenant isolation', () => {
  it("revenue + expense totals exclude the other tenant's rows", async () => {
    const res = await GET(new Request('http://t/api/finance/pnl?source=raw&from=2026-07-01&to=2026-07-31'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.revenue_cents).toBe(10000)
    expect(body.expenses_total_cents).toBe(5000)
  })
})
