/**
 * POST /api/finance/payroll — duplicate manual-payroll-payment race.
 *
 * This route had ZERO idempotency check before this fix -- every call
 * unconditionally inserted a payroll_payments row. A double-tapped "Record
 * Payment" button or a client retry after a dropped response landed two
 * rows. Worse than the team_member_payouts case this mirrors
 * (2026_07_16 cleaner-payout fix): postPayrollToLedger() is idempotent PER
 * ROW (by the row's own id as the journal source_id), so two duplicate rows
 * post TWO separate balanced journal entries -- double-booking real labor
 * expense on the P&L, not just inflating a report that sums the raw table.
 *
 * Same two-layer fix shape as cleaner-payout/record-payment: an app-level
 * 20s dedup window (closes the common case) plus a DB-backed partial unique
 * index on (tenant_id, idempotency_key) as the true-concurrency backstop
 * (2026_07_16_payroll_payments_dedup.sql).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const TENANT_ID = 'tenant-A'
const TEAM_MEMBER_ID = 'tm-1'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/finance/post-labor', () => ({ postPayrollToLedger: vi.fn(async () => ({ posted: true })) }))

import { POST } from './route'

function payrollReq(body: Record<string, unknown>) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    payroll_payments: [],
    bookings: [],
  }
})

describe('concurrent "Record Payment" for the same team member', () => {
  it('lands exactly one payroll_payments row for identical near-simultaneous submissions', async () => {
    const body = { team_member_id: TEAM_MEMBER_ID, amount: 500, method: 'zelle', period_start: '2026-07-01', period_end: '2026-07-15' }
    const [first, second] = await Promise.all([payrollReq(body), payrollReq(body)])

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(h.store.payroll_payments).toHaveLength(1)

    const secondJson = await second.json()
    expect(secondJson.deduped).toBe(true)
  })

  it('a normal single call still records the payment (no regression on the non-race path)', async () => {
    const res = await payrollReq({ team_member_id: TEAM_MEMBER_ID, amount: 500, method: 'zelle', period_start: '2026-07-01', period_end: '2026-07-15' })
    expect(res.status).toBe(201)
    expect(h.store.payroll_payments).toHaveLength(1)
    expect(h.store.payroll_payments[0].amount).toBe(50000)
  })

  it('does NOT dedupe a genuinely separate payment (different amount) submitted right after', async () => {
    await payrollReq({ team_member_id: TEAM_MEMBER_ID, amount: 500, method: 'zelle', period_start: '2026-07-01', period_end: '2026-07-15' })
    const second = await payrollReq({ team_member_id: TEAM_MEMBER_ID, amount: 300, method: 'zelle', period_start: '2026-07-16', period_end: '2026-07-31' })

    expect(second.status).toBe(201)
    expect(h.store.payroll_payments).toHaveLength(2)
  })

  it('does NOT dedupe a same-amount payment recorded outside the dedup window', async () => {
    // Seed an existing payment whose created_at is well outside the 20s
    // dedup window — mirrors a genuine second $500 payroll payment recorded
    // on a later pay period.
    h.store.payroll_payments.push({
      id: 'existing-old', tenant_id: TENANT_ID, team_member_id: TEAM_MEMBER_ID,
      amount: 50000, method: 'zelle', created_at: '2020-01-01T00:00:00.000Z',
    })

    const res = await payrollReq({ team_member_id: TEAM_MEMBER_ID, amount: 500, method: 'zelle', period_start: '2026-07-01', period_end: '2026-07-15' })
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.deduped).toBeUndefined()
    expect(h.store.payroll_payments).toHaveLength(2)
  })
})
