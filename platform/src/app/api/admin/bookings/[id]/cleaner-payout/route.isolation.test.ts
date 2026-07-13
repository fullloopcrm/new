import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/bookings/[id]/cleaner-payout — tenantDb() conversion wrong-tenant
 * probe (P1/W1 queue-c). Platform-admin route: booking lookup by id is
 * deliberately cross-tenant, but the payout it inserts must carry the
 * booking's own tenant_id via the wrapper's auto-stamp — not a manually
 * threaded value that a future edit could drop or mismatch.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))

import { POST } from './route'

const params = (id: string) => Promise.resolve({ id })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', team_member_id: 'tm-1' },
      { id: 'book-B1', tenant_id: 'tenant-B', team_member_id: 'tm-2' },
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

  it("a second tenant's payout is stamped independently and never mixes tenant_id", async () => {
    await POST(postReq({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' }), { params: params('book-A1') })
    await POST(postReq({ cleaner_id: 'tm-2', amount_cents: 6000, method: 'cash' }), { params: params('book-B1') })

    const payoutA = h.store.team_member_payouts.find((p) => p.booking_id === 'book-A1')
    const payoutB = h.store.team_member_payouts.find((p) => p.booking_id === 'book-B1')
    expect(payoutA?.tenant_id).toBe('tenant-A')
    expect(payoutB?.tenant_id).toBe('tenant-B')
  })

  it("marking book-A1 paid never flips book-B1's paid flag", async () => {
    await POST(postReq({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' }), { params: params('book-A1') })
    const bookingB = h.store.bookings.find((b) => b.id === 'book-B1')
    expect(bookingB?.team_member_paid).toBeUndefined()
  })
})
