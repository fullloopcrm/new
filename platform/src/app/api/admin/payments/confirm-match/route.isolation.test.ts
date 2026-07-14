import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/payments/confirm-match POST — permission + tenant isolation.
 *
 * BUG (fixed here): matches an unmatched Zelle/Venmo payment to a booking,
 * inserts a `payments` row, and flips the booking to paid — the same class
 * of financial write jobs/[id]/payments and invoices/[id]/record-payment
 * gate behind requirePermission('finance.expenses'). This route used only
 * getTenantForRequest(), which succeeds for ANY tenant_members row regardless
 * of role — so a 'staff' role user (no finance.* permission per rbac.ts)
 * could match arbitrary payments to bookings and mark them paid.
 *
 * FIX: requirePermission('finance.expenses') before the match.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))

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

// Real requirePermission + real rbac run against the mocked tenant-query above.
import { POST } from './route'

function seed() {
  return {
    unmatched_payments: [
      { id: 'up-a1', tenant_id: A, method: 'zelle', amount_cents: 10000, sender_name: 'Alice', status: 'pending' },
      { id: 'up-b1', tenant_id: B, method: 'zelle', amount_cents: 10000, sender_name: 'Bob', status: 'pending' },
    ],
    bookings: [
      { id: 'bk-a1', tenant_id: A, client_id: 'cl-a1', team_member_id: null, price: 10000, payment_status: 'unpaid' },
      { id: 'bk-b1', tenant_id: B, client_id: 'cl-b1', team_member_id: null, price: 10000, payment_status: 'unpaid' },
    ],
    payments: [],
    tenants: [{ id: A, name: 'Tenant A' }, { id: B, name: 'Tenant B' }],
    notifications: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
  roleHolder.tenantId = A
})

function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

describe('admin/payments/confirm-match — permission + tenant isolation', () => {
  it('owner can match their own unmatched payment to their own booking', async () => {
    const res = await POST(req({ unmatchedPaymentId: 'up-a1', bookingId: 'bk-a1' }))
    expect(res.status).toBe(200)
    const unmatched = h.seed.unmatched_payments.find((u) => u.id === 'up-a1')!
    expect(unmatched.status).toBe('matched')
    const booking = h.seed.bookings.find((b) => b.id === 'bk-a1')!
    expect(booking.payment_status).toBe('paid')
    expect(h.capture.inserts.find((i) => i.table === 'payments')).toBeDefined()
  })

  it("PERMISSION PROBE: 'staff' role (no finance.expenses) is forbidden and nothing changes", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req({ unmatchedPaymentId: 'up-a1', bookingId: 'bk-a1' }))
    expect(res.status).toBe(403)
    const unmatched = h.seed.unmatched_payments.find((u) => u.id === 'up-a1')!
    expect(unmatched.status).toBe('pending')
    expect(h.capture.inserts.find((i) => i.table === 'payments')).toBeUndefined()
  })

  it("WRONG-TENANT PROBE: tenant A owner cannot match tenant B's unmatched payment or booking", async () => {
    const res = await POST(req({ unmatchedPaymentId: 'up-b1', bookingId: 'bk-b1' }))
    expect(res.status).toBe(404)
    const unmatched = h.seed.unmatched_payments.find((u) => u.id === 'up-b1')!
    expect(unmatched.status).toBe('pending')
    const booking = h.seed.bookings.find((b) => b.id === 'bk-b1')!
    expect(booking.payment_status).toBe('unpaid')
    expect(h.capture.inserts.find((i) => i.table === 'payments')).toBeUndefined()
  })
})
