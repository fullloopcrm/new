/**
 * POST /api/admin/bookings/:id/cleaner-payout — duplicate manual-payout race.
 *
 * This route had ZERO idempotency check before this fix -- every call
 * unconditionally inserted a team_member_payouts row. A double-tapped "Pay"
 * button firing in two tabs, or the same Zelle/Venmo payout recorded
 * independently by two staff members, landed two rows -- double-counting
 * labor cost in every report that sums this table (finance/payroll-prep,
 * finance/summary, finance/year-end-zip, the closeout-summary widget) even
 * though the team member was paid once.
 *
 * Same two-layer fix shape as record-payment/route.race.test.ts: an app-level
 * 20s dedup window (closes the common case) plus a DB-backed partial unique
 * index on (tenant_id, idempotency_key) as the true-concurrency backstop
 * (2026_07_16_team_member_payouts_dedup.sql).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const TENANT_ID = 'tenant-A'
const BOOKING_ID = 'book-A1'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))

import { POST } from './route'

function payoutReq(body: Record<string, unknown>) {
  return POST(
    new Request('http://t', { method: 'POST', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: BOOKING_ID }) },
  )
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [{ id: BOOKING_ID, tenant_id: TENANT_ID, team_member_id: 'tm-1' }],
    team_members: [{ id: 'tm-1', tenant_id: TENANT_ID, name: 'Alex' }],
    team_member_payouts: [],
  }
})

describe('concurrent "Pay" for the same booking + team member', () => {
  it('lands exactly one team_member_payouts row for identical near-simultaneous submissions', async () => {
    const body = { cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' }
    const [first, second] = await Promise.all([payoutReq(body), payoutReq(body)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.store.team_member_payouts).toHaveLength(1)

    const secondJson = await second.json()
    expect(secondJson.deduped).toBe(true)
  })

  it('a normal single call still records the payout (no regression on the non-race path)', async () => {
    const res = await payoutReq({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' })
    expect(res.status).toBe(200)
    expect(h.store.team_member_payouts).toHaveLength(1)
    expect(h.store.team_member_payouts[0].amount_cents).toBe(5000)
  })

  it('does NOT dedupe a genuinely separate payout (different amount) submitted right after', async () => {
    await payoutReq({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' })
    const second = await payoutReq({ cleaner_id: 'tm-1', amount_cents: 3000, method: 'zelle' })

    expect(second.status).toBe(200)
    expect(h.store.team_member_payouts).toHaveLength(2)
  })

  it('does NOT dedupe a same-amount payout recorded outside the dedup window', async () => {
    // Seed an existing payout whose created_at is well outside the 20s dedup
    // window — mirrors a genuine second $50 Zelle payout recorded days later.
    h.store.team_member_payouts.push({
      id: 'existing-old', tenant_id: TENANT_ID, booking_id: BOOKING_ID, team_member_id: 'tm-1',
      amount_cents: 5000, status: 'zelle', created_at: '2020-01-01T00:00:00.000Z',
    })

    const res = await payoutReq({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.deduped).toBeUndefined()
    expect(h.store.team_member_payouts).toHaveLength(2)
  })
})
