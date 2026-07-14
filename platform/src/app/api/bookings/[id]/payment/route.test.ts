import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PATCH /api/bookings/:id/payment — permission gate.
 *
 * This route mutates payment_status, tip_amount, team_pay, actual_hours, and
 * team_paid -- the same class of financial write that cleaner-payout
 * (bookings.edit) and record-payment/jobs-payments (finance.expenses)
 * already gate behind requirePermission. This route used only
 * getTenantForRequest(), which succeeds for ANY tenant_members row
 * regardless of role -- so a 'staff' role user (rbac.ts grants staff only
 * bookings.view/bookings.create, no bookings.edit and no finance.*) could
 * call it directly and mark any booking paid, set an arbitrary tip/team_pay,
 * or flip team_paid to hide an unpaid payout.
 *
 * FIX: requirePermission('bookings.edit') before the update. Real
 * requirePermission + real rbac run against a mocked tenant-query, so a
 * 'staff' role is denied by the ACTUAL permission table, not a stub.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tenant-A' as string }))

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
      tenantId: roleHolder.tenantId,
      tenant: { id: roleHolder.tenantId },
      role: roleHolder.role,
    })),
  }
})
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

// Real requirePermission + real rbac run against the mocked tenant-query above.
import { PATCH } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  h.store = {
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', payment_status: 'unpaid', tip_amount: 0 },
      { id: 'book-B1', tenant_id: 'tenant-B', payment_status: 'unpaid', tip_amount: 0 },
    ],
  }
})

describe('PATCH /api/bookings/:id/payment — permission gate', () => {
  it("owner can mark the acting tenant's own booking paid", async () => {
    const res = await PATCH(patchReq({ payment_status: 'paid', payment_method: 'cash' }), params('book-A1'))
    expect(res.status).toBe(200)
    expect(h.store.bookings.find((b) => b.id === 'book-A1')?.payment_status).toBe('paid')
  })

  it("PERMISSION PROBE: 'staff' role (no bookings.edit) is forbidden and nothing changes", async () => {
    roleHolder.role = 'staff'
    const res = await PATCH(patchReq({ payment_status: 'paid', tip_amount: 5000 }), params('book-A1'))
    expect(res.status).toBe(403)
    const own = h.store.bookings.find((b) => b.id === 'book-A1')
    expect(own?.payment_status).toBe('unpaid')
    expect(own?.tip_amount).toBe(0)
  })

  it("WRONG-TENANT PROBE: an owner from tenant A cannot touch tenant B's booking", async () => {
    const res = await PATCH(patchReq({ payment_status: 'paid' }), params('book-B1'))
    expect(res.status).toBe(500)
    expect(h.store.bookings.find((b) => b.id === 'book-B1')?.payment_status).toBe('unpaid')
  })
})
