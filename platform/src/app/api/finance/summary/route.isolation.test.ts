import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/summary (converted to tenantDb).
 *
 * The dashboard summary fans out ~10 reads across bookings, payments,
 * referral_commissions and team_member_payouts — all now scoped by tenantDb
 * (`.eq('tenant_id', ctx)`). A foreign tenant's rows in the same window must not
 * inflate the caller's job counts or collected total. (Revenue $ is from the
 * ledger, mocked to 0.)
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
vi.mock('@/lib/finance/ledger-reports', () => ({ ledgerProfitAndLoss: vi.fn(async () => ({ revenue_cents: 0 })) }))

import { GET } from './route'

function seed() {
  return {
    bookings: [
      { id: 'a1', tenant_id: A, status: 'completed', start_time: '2026-07-10T00:00:00Z', price: 10000, team_member_pay: 3000, team_member_paid: true, payment_status: 'paid' },
      { id: 'b1', tenant_id: B, status: 'completed', start_time: '2026-07-10T00:00:00Z', price: 99999, team_member_pay: 4000, team_member_paid: true, payment_status: 'paid' },
    ],
    payments: [
      { id: 'pa', tenant_id: A, amount_cents: 10000, tip_cents: 0, method: 'stripe', created_at: '2026-07-10T00:00:00Z' },
      { id: 'pb', tenant_id: B, amount_cents: 55555, tip_cents: 0, method: 'stripe', created_at: '2026-07-10T00:00:00Z' },
    ],
    referral_commissions: [
      { id: 'ca', tenant_id: A, commission_cents: 500, created_at: '2026-07-10T00:00:00Z' },
      { id: 'cb', tenant_id: B, commission_cents: 9000, created_at: '2026-07-10T00:00:00Z' },
    ],
    team_member_payouts: [
      { id: 'oa', tenant_id: A, amount_cents: 3000, instant: false, created_at: '2026-07-10T00:00:00Z' },
      { id: 'ob', tenant_id: B, amount_cents: 4000, instant: true, created_at: '2026-07-10T00:00:00Z' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/summary GET — tenant isolation', () => {
  it("job counts + collected total reflect only the caller; tenant B is excluded", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    // Only A's completed booking is counted this month/year.
    expect(body.monthJobs).toBe(1)
    expect(body.yearJobs).toBe(1)
    // Only A's payment is collected (B's $555.55 excluded).
    expect(body.payments.collected).toBe(10000)
    expect(body.monthReferralCommissions).toBe(500)
  })
})
