import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/finance/backfill-checkout-price — dry-run-by-default backfill for
 * bookings that went through the now-fixed broken Complete path (never
 * recomputed price/actual_hours/team_member_pay). PREPARE ONLY, never run
 * against prod by this test — this file only exercises it against the fake.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: h.tenantId, role: 'owner' }, error: null })),
}))

import { POST } from './route'

function iso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60000).toISOString()
}

const AFFECTED_1H = {
  id: 'bk-affected-1h',
  tenant_id: 'tenant-A',
  status: 'completed',
  actual_hours: null,
  check_in_time: iso(70),
  check_out_time: iso(10), // ~60 real minutes -> 1.0 client-billed hour
  hourly_rate: 69,
  pay_rate: null, // no booking-level override -> falls back to team member's rate
  discount_percent: null,
  one_time_credit_cents: null,
  recurring_type: null,
  max_hours: null,
  team_size: 1,
  price: 6000, // the stale scheduling-time estimate
  team_member_pay: null,
  team_member_id: 'tm-1',
}

const AFFECTED_WITH_OVERRIDE = {
  id: 'bk-affected-override',
  tenant_id: 'tenant-A',
  status: 'completed',
  actual_hours: null,
  check_in_time: iso(130),
  check_out_time: iso(10), // 2.0 client-billed hours
  hourly_rate: 100,
  pay_rate: 40, // booking-level override, should win over team_members.pay_rate
  discount_percent: null,
  one_time_credit_cents: null,
  recurring_type: null,
  max_hours: null,
  team_size: 1,
  price: 15000,
  team_member_pay: null,
  team_member_id: 'tm-1',
}

const NOT_AFFECTED_ALREADY_RECOMPUTED = {
  id: 'bk-already-fine',
  tenant_id: 'tenant-A',
  status: 'completed',
  actual_hours: 1.5, // already recomputed by a working checkout path -- must be excluded
  check_in_time: iso(100),
  check_out_time: iso(10),
  hourly_rate: 69,
  pay_rate: null,
  discount_percent: null,
  one_time_credit_cents: null,
  recurring_type: null,
  max_hours: null,
  team_size: 1,
  price: 10350,
  team_member_pay: 2500,
  team_member_id: 'tm-1',
}

const NOT_AFFECTED_MISSING_CHECKOUT = {
  id: 'bk-no-checkout-time',
  tenant_id: 'tenant-A',
  status: 'completed',
  actual_hours: null,
  check_in_time: iso(100),
  check_out_time: null, // unrecoverable elapsed time -- must be excluded, not guessed at
  hourly_rate: 69,
  pay_rate: null,
  discount_percent: null,
  one_time_credit_cents: null,
  recurring_type: null,
  max_hours: null,
  team_size: 1,
  price: 6000,
  team_member_pay: null,
  team_member_id: 'tm-1',
}

const NOT_AFFECTED_FOREIGN_TENANT = {
  ...AFFECTED_1H,
  id: 'bk-foreign-tenant',
  tenant_id: 'tenant-B',
}

function seed() {
  return {
    bookings: [
      { ...AFFECTED_1H },
      { ...AFFECTED_WITH_OVERRIDE },
      { ...NOT_AFFECTED_ALREADY_RECOMPUTED },
      { ...NOT_AFFECTED_MISSING_CHECKOUT },
      { ...NOT_AFFECTED_FOREIGN_TENANT },
    ],
    team_members: [{ id: 'tm-1', tenant_id: 'tenant-A', pay_rate: 25 }],
  }
}

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = seed()
})

describe('POST /api/finance/backfill-checkout-price', () => {
  it('dry-run (default): targets exactly the affected rows, writes nothing', async () => {
    const res = await POST(postReq({}))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dryRun).toBe(true)
    expect(body.targeted).toBe(2)
    expect(body.updated).toBe(0)
    const ids = body.changes.map((c: { bookingId: string }) => c.bookingId).sort()
    expect(ids).toEqual(['bk-affected-1h', 'bk-affected-override'])

    // Verify the store was NOT mutated -- the stale price is still there.
    const row = h.store.bookings.find((b) => b.id === 'bk-affected-1h')!
    expect(row.price).toBe(6000)
    expect(row.actual_hours).toBe(null)
  })

  it('dry-run: excludes an already-recomputed booking, a missing-checkout-time booking, and a foreign-tenant booking', async () => {
    const res = await POST(postReq({ dryRun: true }))
    const body = await res.json()
    const ids = body.changes.map((c: { bookingId: string }) => c.bookingId)
    expect(ids).not.toContain('bk-already-fine')
    expect(ids).not.toContain('bk-no-checkout-time')
    expect(ids).not.toContain('bk-foreign-tenant')
  })

  it('dry-run: computes the real bill via computeCheckoutPricing, falling back to team_members.pay_rate when the booking has no override', async () => {
    const res = await POST(postReq({}))
    const body = await res.json()
    const change = body.changes.find((c: { bookingId: string }) => c.bookingId === 'bk-affected-1h')
    // ~60 real minutes -> 1.0 client-billed hour @ $69/hr = $69.00
    expect(change.actualHours).toBe(1)
    expect(change.newPriceCents).toBe(6900)
    expect(change.oldPriceCents).toBe(6000)
    // cleaner pay derived from team_members.pay_rate (25) since booking.pay_rate is null
    expect(change.newTeamMemberPayCents).toBe(2500)
  })

  it('dry-run: a booking-level pay_rate override wins over team_members.pay_rate', async () => {
    const res = await POST(postReq({}))
    const body = await res.json()
    const change = body.changes.find((c: { bookingId: string }) => c.bookingId === 'bk-affected-override')
    // 2.0 hours @ $100/hr client rate = $200.00
    expect(change.newPriceCents).toBe(20000)
    // cleaner pay uses the booking's own pay_rate (40), not team_members.pay_rate (25)
    expect(change.newTeamMemberPayCents).toBe(8000)
  })

  it('dryRun:false actually writes the recomputed values, scoped to actual_hours/price/team_member_pay only', async () => {
    const res = await POST(postReq({ dryRun: false }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dryRun).toBe(false)
    expect(body.updated).toBe(2)

    const row = h.store.bookings.find((b) => b.id === 'bk-affected-1h')!
    expect(row.price).toBe(6900)
    expect(row.actual_hours).toBe(1)
    expect(row.team_member_pay).toBe(2500)
    // Untouched fields stay untouched.
    expect(row.check_in_time).toBe(AFFECTED_1H.check_in_time)
    expect(row.check_out_time).toBe(AFFECTED_1H.check_out_time)
    expect(row.status).toBe('completed')

    // The already-excluded rows are still untouched.
    const foreign = h.store.bookings.find((b) => b.id === 'bk-foreign-tenant')!
    expect(foreign.price).toBe(AFFECTED_1H.price)
  })
})
