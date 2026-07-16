import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/payments/checkout — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check before minting a
 * Stripe checkout session against a booking's price. By default rbac.ts
 * grants 'bookings.edit' to owner/admin/manager only -- 'staff' gets only
 * bookings.view/bookings.create -- so any staff-tier member could already
 * trigger a real Stripe checkout session for a booking, with zero role
 * check, no override needed -- same class as P70-P80.
 *
 * FIX: requirePermission('bookings.edit') on POST, matching the convention
 * already used for single-booking mutations (bookings/[id]/route.ts PUT).
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

const createCheckoutSession = vi.fn(async () => ({ url: 'https://stripe/checkout-x', id: 'cs_x' }))
vi.mock('@/lib/stripe', () => ({ createCheckoutSession: (...a: unknown[]) => createCheckoutSession(...(a as [])) }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: A, price: 10000, service_type: 'Clean', clients: null },
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
  createCheckoutSession.mockClear()
})

function post(body: unknown) {
  return POST(new Request('http://t/api/payments/checkout', { method: 'POST', body: JSON.stringify(body) }))
}

describe('POST /api/payments/checkout — permission probe', () => {
  it('owner (has bookings.edit) can create a checkout session', async () => {
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(200)
    expect(createCheckoutSession).toHaveBeenCalledTimes(1)
  })

  it("'manager' (has bookings.edit per default rbac.ts) can create a checkout session", async () => {
    tenantHolder.role = 'manager'
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(200)
    expect(createCheckoutSession).toHaveBeenCalledTimes(1)
  })

  it("PERMISSION PROBE: 'staff' (no bookings.edit per default rbac.ts, no override needed) is forbidden from creating a checkout session", async () => {
    tenantHolder.role = 'staff'
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(403)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: a tenant that revokes 'bookings.edit' from admin via a role_permissions override blocks POST for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'bookings.edit': false } } },
    }
    const res = await post({ booking_id: 'bk-a' })
    expect(res.status).toBe(403)
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })
})
