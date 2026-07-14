import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * bookings/[id]/payment PATCH — permission + tenant isolation.
 *
 * BUG (fixed here): this route mutates payment_status, tip_amount, team_pay,
 * actual_hours, and team_paid — the same class of financial write that
 * cleaner-payout (bookings.edit) and record-payment/jobs-payments
 * (finance.expenses) already gate behind requirePermission. This route used
 * only getTenantForRequest(), which succeeds for ANY tenant_members row
 * regardless of role — so a 'staff' role user (rbac.ts grants staff only
 * bookings.view/bookings.create, no bookings.edit and no finance.*) could
 * call it directly and mark any booking paid, set an arbitrary tip/team_pay,
 * or flip team_paid to hide an unpaid payout.
 *
 * FIX: requirePermission('bookings.edit') before the update.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tid-a' as string }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
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

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff' role is denied by the ACTUAL permission table, not a stub.
import { PATCH } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a1', tenant_id: A, payment_status: 'unpaid', tip_amount: 0 },
      { id: 'bk-b1', tenant_id: B, payment_status: 'unpaid', tip_amount: 0 },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
  roleHolder.tenantId = A
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'PATCH', body: JSON.stringify(body) })
}

describe('bookings/[id]/payment — permission + tenant isolation', () => {
  it("owner can mark the acting tenant's own booking paid", async () => {
    const res = await PATCH(req({ payment_status: 'paid', payment_method: 'cash' }), params('bk-a1'))
    expect(res.status).toBe(200)
    const own = h.seed.bookings.find((b) => b.id === 'bk-a1')!
    expect(own.payment_status).toBe('paid')
  })

  it("PERMISSION PROBE: 'staff' role (no bookings.edit, no finance.*) is forbidden and nothing changes", async () => {
    roleHolder.role = 'staff'
    const res = await PATCH(req({ payment_status: 'paid', tip_amount: 5000 }), params('bk-a1'))
    expect(res.status).toBe(403)
    const own = h.seed.bookings.find((b) => b.id === 'bk-a1')!
    expect(own.payment_status).toBe('unpaid')
    expect(own.tip_amount).toBe(0)
  })

  it("WRONG-TENANT PROBE: an owner from tenant A cannot touch tenant B's booking", async () => {
    const res = await PATCH(req({ payment_status: 'paid' }), params('bk-b1'))
    expect(res.status).toBe(500)
    const foreign = h.seed.bookings.find((b) => b.id === 'bk-b1')!
    expect(foreign.payment_status).toBe('unpaid')
  })
})
