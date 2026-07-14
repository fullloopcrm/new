import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/bookings/[id]/cleaner-payout — tenant isolation (P1/W1 queue-c
 * + cross-lane fix ported from p1-w2 commit 998d6bbe). This route backs the
 * shared /dashboard bookings closeout widget (every tenant's own admin),
 * NOT a platform-super-admin-only tool — it was wrongly gated on
 * requireAdmin() (401ing every ordinary tenant admin), its booking lookup
 * wasn't tenant-scoped (a caller could POST a payout into another tenant's
 * books by booking id), and cleaner_id/team_member_id was an unvalidated
 * caller-supplied FK (a caller could attribute a payout to another tenant's
 * team member). Now gated on requirePermission('bookings.edit') with
 * `.eq('tenant_id', tenantId)` on the booking lookup, plus a
 * tenant-scoped team_members ownership check before the payout insert.
 * The payout it inserts still carries the booking's own tenant_id via the
 * tenantDb() wrapper's auto-stamp — not a manually threaded value a future
 * edit could drop or mismatch.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { POST } from './route'

const params = (id: string) => Promise.resolve({ id })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }))
  h.store = {
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', team_member_id: 'tm-1' },
      { id: 'book-B1', tenant_id: 'tenant-B', team_member_id: 'tm-2' },
    ],
    team_members: [
      { id: 'tm-1', tenant_id: 'tenant-A', name: 'Alex' },
      { id: 'tm-2', tenant_id: 'tenant-B', name: 'Sam' },
    ],
    team_member_payouts: [],
  }
})

describe('POST /api/admin/bookings/[id]/cleaner-payout — tenant isolation', () => {
  it("inserted payout is auto-stamped with the booking's own tenant_id", async () => {
    const res = await POST(postReq({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' }), { params: params('book-A1') })
    expect(res.status).toBe(200)
    const payout = h.store.team_member_payouts.find((p) => p.booking_id === 'book-A1')
    expect(payout?.tenant_id).toBe('tenant-A')
  })

  it("rejects a booking id belonging to another tenant instead of posting a payout into that tenant's books", async () => {
    const res = await POST(postReq({ cleaner_id: 'tm-2', amount_cents: 6000, method: 'cash' }), { params: params('book-B1') })

    expect(res.status).toBe(404)
    expect(h.store.team_member_payouts.some((p) => p.booking_id === 'book-B1')).toBe(false)
  })

  it("rejects a cleaner_id belonging to another tenant instead of attributing a payout to it", async () => {
    const res = await POST(postReq({ cleaner_id: 'tm-2', amount_cents: 5000, method: 'zelle' }), { params: params('book-A1') })

    expect(res.status).toBe(400)
    expect(h.store.team_member_payouts).toHaveLength(0)
  })

  it("marking book-A1 paid never flips book-B1's paid flag", async () => {
    await POST(postReq({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' }), { params: params('book-A1') })
    const bookingB = h.store.bookings.find((b) => b.id === 'book-B1')
    expect(bookingB?.team_member_paid).toBeUndefined()
  })
})
