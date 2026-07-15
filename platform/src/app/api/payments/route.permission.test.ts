import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/payments/checkout + /api/payments/link — bookings.edit gate.
 *
 * Both routes only called getTenantForRequest() (base session auth) with no
 * requirePermission check — any authenticated tenant member of any role
 * could generate a real Stripe Checkout Session or Payment Link against an
 * arbitrary booking in their tenant (using the tenant's live Stripe key),
 * unlike the sibling booking-mutation routes (bookings/[id] PATCH,
 * bookings/batch-update) which are gated on 'bookings.edit'. Per rbac.ts,
 * 'staff' lacks bookings.edit (view/create only) — owner/admin/manager keep
 * working.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { selena_config: null },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: async () => ({ id: 'cs_test', url: 'https://stripe.test/cs_test' }),
  createPaymentLink: async () => ({ url: 'https://stripe.test/link_test' }),
}))

process.env.STRIPE_SECRET_KEY = 'sk_test_env'

import { POST as postCheckout } from './checkout/route'
import { POST as postLink } from './link/route'

const postReq = () =>
  new Request('http://x/api/payments/checkout', { method: 'POST', body: JSON.stringify({ booking_id: 'booking-1' }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    bookings: [{ id: 'booking-1', tenant_id: 'tenant-A', price: 100, service_type: 'Deep Clean' }],
    tenants: [{ id: 'tenant-A', stripe_api_key: null }],
  }
})

describe('POST /api/payments/checkout — bookings.edit permission', () => {
  it('rejects a staff member (no bookings.edit) with 403', async () => {
    const res = await postCheckout(postReq())
    expect(res.status).toBe(403)
  })

  it('allows a manager (has bookings.edit) to create a checkout session', async () => {
    h.role = 'manager'
    const res = await postCheckout(postReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://stripe.test/cs_test')
  })
})

describe('POST /api/payments/link — bookings.edit permission', () => {
  it('rejects a staff member (no bookings.edit) with 403 and does not write payment_link', async () => {
    const res = await postLink(postReq())
    expect(res.status).toBe(403)
    expect(h.store.bookings[0].payment_link).toBeUndefined()
  })

  it('allows an owner to create a payment link', async () => {
    h.role = 'owner'
    const res = await postLink(postReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://stripe.test/link_test')
  })
})
