import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * DELETE /api/team/[id] -- p1-w1 queue item 2. The existing guard (commit
 * 60f3f7810) already deactivates instead of hard-deleting when a member has
 * bookings or crew-assignment rows. But team_member_payouts and
 * payroll_payments both have NOT NULL team_member_id FKs with no ON DELETE
 * clause at all (plain RESTRICT) and neither is tied to a booking_id that's
 * required -- a member can carry payout/payroll history with zero bookings
 * (a manual bonus payout, a payroll run after their last booking was
 * reassigned). That's a real, still-reproducible path to the reported
 * "team_members/bookings_team_member_id_fkey" crash surviving the earlier
 * fix, because the guard never looked at those two tables.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const auditSpy = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: 'tenant-A',
      tenant: { id: 'tenant-A' },
      role: 'owner',
    })),
  }
})
vi.mock('@/lib/audit', () => ({ audit: auditSpy }))

import { DELETE } from './route'

const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  auditSpy.mockClear()
  h.store = {
    team_members: [{ id: 'tm-1', tenant_id: 'tenant-A', name: 'Gloria', status: 'active' }],
    bookings: [],
    booking_team_members: [],
    team_member_payouts: [],
    payroll_payments: [],
  }
})

describe('DELETE /api/team/[id] -- payout/payroll guard', () => {
  it('deactivates (does not hard-delete) a member with payout history but zero bookings', async () => {
    h.store.team_member_payouts = [{ id: 'p1', tenant_id: 'tenant-A', team_member_id: 'tm-1', booking_id: null, amount_cents: 5000 }]

    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deactivated).toBe(true)
    const stored = h.store.team_members.find((m) => m.id === 'tm-1')
    expect(stored).toBeDefined() // still present -- not hard-deleted
    expect(stored?.status).toBe('inactive')
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'team.deactivated', entityId: 'tm-1' }))
  })

  it('deactivates a member with payroll history but zero bookings', async () => {
    h.store.payroll_payments = [{ id: 'pp1', tenant_id: 'tenant-A', team_member_id: 'tm-1', amount: 10000 }]

    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deactivated).toBe(true)
    expect(h.store.team_members.find((m) => m.id === 'tm-1')).toBeDefined()
  })

  it('still hard-deletes a member with no booking/crew/payout/payroll history at all', async () => {
    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deactivated).toBe(false)
    expect(h.store.team_members.find((m) => m.id === 'tm-1')).toBeUndefined()
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'team.deleted', entityId: 'tm-1' }))
  })
})
