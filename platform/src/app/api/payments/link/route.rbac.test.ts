import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/payments/link — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check before minting a
 * real Stripe payment link and writing it onto the booking. By default
 * rbac.ts grants 'bookings.edit' to owner/admin/manager only -- 'staff' gets
 * only bookings.view/bookings.create -- so any staff-tier member could
 * already generate a payable Stripe link for a booking, with zero role
 * check, no override needed -- same class as P70-P80.
 *
 * FIX: requirePermission('bookings.edit') on POST, matching the convention
 * already used for single-booking mutations (bookings/[id]/route.ts PUT)
 * and the sibling /api/payments/checkout route.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
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
      tenantId: A,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

const createPaymentLink = vi.fn(async () => ({ url: 'https://pay/link-x' }))
vi.mock('@/lib/stripe', () => ({ createPaymentLink: (...a: unknown[]) => createPaymentLink(...(a as [])) }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: A, price: 10000, service_type: 'Clean', payment_link: null },
    ],
    tenants: [{ id: A, stripe_api_key: 'sk_live_a' }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
  createPaymentLink.mockClear()
})

function post(body: unknown) {
  return POST(new Request('http://t/api/payments/link', { method: 'POST', body: JSON.stringify(body) }))
}

describe('POST /api/payments/link — permission probe', () => {
  it('owner (has bookings.edit) can mint a payment link', async () => {
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(200)
    expect(createPaymentLink).toHaveBeenCalledTimes(1)
  })

  it("'manager' (has bookings.edit per default rbac.ts) can mint a payment link", async () => {
    tenantHolder.role = 'manager'
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(200)
    expect(createPaymentLink).toHaveBeenCalledTimes(1)
  })

  it("PERMISSION PROBE: 'staff' (no bookings.edit per default rbac.ts, no override needed) is forbidden from minting a payment link", async () => {
    tenantHolder.role = 'staff'
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(403)
    expect(createPaymentLink).not.toHaveBeenCalled()
    expect(h.seed.bookings.find((b) => b.id === 'bk-a')!.payment_link).toBeNull()
  })

  it("PERMISSION PROBE: a tenant that revokes 'bookings.edit' from admin via a role_permissions override blocks POST for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'bookings.edit': false } } },
    }
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(403)
    expect(createPaymentLink).not.toHaveBeenCalled()
  })
})
