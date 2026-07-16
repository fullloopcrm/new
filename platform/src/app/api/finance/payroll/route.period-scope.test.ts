import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * finance/payroll POST — booking-paid scoping.
 *
 * BUG (fixed here): after recording a payroll_payments row, the route marked
 * EVERY completed booking for that team member as bookings.status='paid' --
 * with no scoping to the pay period actually being paid. Paying a small
 * single period silently flipped every other completed-but-unrelated
 * booking (a different, never-actually-paid period) to 'paid' too. Since
 * payroll-prep's gross-pay window (GET /api/finance/payroll-prep) only
 * counts status='completed' bookings, those out-of-period bookings then
 * vanished from every future payroll-prep report -- the crew member did the
 * work, was never actually paid for it, and the tool meant to catch "who do
 * we owe" no longer saw it.
 *
 * FIX: when period_start/period_end are supplied, only mark bookings whose
 * start_time falls inside that window (mirroring payroll-prep's own from/to
 * windowing) as paid. Bookings outside the period stay 'completed' -- owed,
 * visible, and payable next.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: TENANT, tenant: { id: TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/finance/post-labor', () => ({
  postPayrollToLedger: vi.fn(async () => ({ posted: true })),
}))

import { POST } from './route'

function seed() {
  return {
    team_members: [{ id: 'tm-a1', tenant_id: TENANT, pay_rate: 20 }],
    payroll_payments: [],
    bookings: [
      // In the period being paid (2026-07-01..2026-07-14).
      { id: 'bk-in-period', tenant_id: TENANT, team_member_id: 'tm-a1', status: 'completed', start_time: '2026-07-05T10:00:00Z' },
      // Completed, but from a DIFFERENT, not-yet-paid period.
      { id: 'bk-out-of-period', tenant_id: TENANT, team_member_id: 'tm-a1', status: 'completed', start_time: '2026-08-01T10:00:00Z' },
    ],
  }
}

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

const BODY = { team_member_id: 'tm-a1', amount: 100, method: 'zelle', period_start: '2026-07-01', period_end: '2026-07-14' }

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/payroll POST — booking-paid scoping', () => {
  it('marks only the in-period booking as paid, leaving the out-of-period booking completed', async () => {
    const res = await POST(postReq(BODY))
    expect(res.status).toBe(201)

    const inPeriod = h.seed.bookings.find((b) => b.id === 'bk-in-period')
    const outOfPeriod = h.seed.bookings.find((b) => b.id === 'bk-out-of-period')
    expect(inPeriod?.status).toBe('paid')
    expect(outOfPeriod?.status).toBe('completed')
  })

  it('with no period supplied, falls back to marking every completed booking (documented, matches the no-period dedup gap)', async () => {
    const res = await POST(postReq({ team_member_id: 'tm-a1', amount: 100, method: 'zelle' }))
    expect(res.status).toBe(201)

    const inPeriod = h.seed.bookings.find((b) => b.id === 'bk-in-period')
    const outOfPeriod = h.seed.bookings.find((b) => b.id === 'bk-out-of-period')
    expect(inPeriod?.status).toBe('paid')
    expect(outOfPeriod?.status).toBe('paid')
  })
})
