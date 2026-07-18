import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * invoice.paid / invoice.payment_failed / customer.subscription.deleted used
 * to locate the target tenant by matching the Stripe-supplied email against
 * tenants.owner_email. owner_email is not unique (legitimate multi-location
 * owners can share one) and is fully attacker-chosen: /api/prospects is
 * public unauthenticated intake for owner_email, and once an admin approves
 * a prospect that value becomes the Stripe Checkout customer_email (see
 * admin/prospects/[id]/route.ts). Anyone who ran their OWN Stripe
 * subscription through to one of these events with a spoofed email could
 * flip an unrelated, already-provisioned tenant's billing_status by email
 * match alone. The fix keys off tenants.stripe_subscription_id (stored at
 * signup, unforgeable) instead.
 *
 * This proves: (1) the legitimate subscription-id match still works, and
 * (2) an event carrying another tenant's owner_email but a DIFFERENT
 * subscription id no longer touches that tenant.
 */

const h = vi.hoisted(() => {
  type Row = Record<string, any>
  const store: Record<string, Row[]> = {
    tenants: [
      { id: 'tenant-a', name: 'Tenant A', owner_email: 'shared@example.com', stripe_subscription_id: 'sub_A', billing_status: 'active' },
      { id: 'tenant-b', name: 'Tenant B', owner_email: 'shared@example.com', stripe_subscription_id: 'sub_B', billing_status: 'active' },
    ],
  }
  const chain = (table: string) => {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      maybeSingle: async () => ({ data: (store[table] || []).find(match) ?? null, error: null }),
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'update') {
          store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...payload } : r))
          return res({ data: null, error: null })
        }
        return res({ data: (store[table] || []).filter(match), error: null })
      },
    }
    return c
  }
  return { store, chain, reset: () => {
    store.tenants[0].billing_status = 'active'
    delete store.tenants[0].last_payment_at
    delete store.tenants[0].subscription_cancelled_at
    store.tenants[1].billing_status = 'active'
    delete store.tenants[1].last_payment_at
    delete store.tenants[1].subscription_cancelled_at
  } }
})

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
  }
  return { default: MockStripe }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => h.chain(t) } }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger: vi.fn(async () => ({ posted: true })),
  postRefundToLedger: vi.fn(async () => ({ posted: true })),
  postChargebackToLedger: vi.fn(async () => ({ posted: true })),
  tenantFromPaymentIntent: vi.fn(async () => null),
  syncBookingRefundStatus: vi.fn(async () => {}),
}))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))

import { POST } from './route'

function invoiceEvent(type: 'invoice.paid' | 'invoice.payment_failed', opts: { subscriptionId?: string; customerEmail?: string }) {
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({
      type,
      data: {
        object: {
          customer_email: opts.customerEmail ?? null,
          parent: opts.subscriptionId ? { subscription_details: { subscription: opts.subscriptionId } } : null,
        },
      },
    }),
  })
}

function subscriptionDeletedEvent(subscriptionId: string) {
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({ type: 'customer.subscription.deleted', data: { object: { id: subscriptionId, customer: 'cus_whatever' } } }),
  })
}

beforeEach(() => {
  h.reset()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
  process.env.ADMIN_NOTIFICATION_EMAIL = ''
})

describe('POST /api/webhooks/stripe — subscription-lifecycle events match by stripe_subscription_id, not email', () => {
  it('invoice.paid: flips the RIGHT tenant active by subscription id', async () => {
    h.store.tenants[0].billing_status = 'past_due'
    const res = await POST(invoiceEvent('invoice.paid', { subscriptionId: 'sub_A', customerEmail: 'shared@example.com' }))
    expect(res.status).toBe(200)
    expect(h.store.tenants[0].billing_status).toBe('active')
    expect(h.store.tenants[0].last_payment_at).toBeTruthy()
  })

  it('invoice.payment_failed: an event carrying tenant B\'s owner_email but tenant A\'s subscription id only touches tenant A', async () => {
    // Attacker-shaped case: customer_email matches TENANT_B's owner_email
    // (shared/spoofed), but the real subscription id on the event is A's.
    const res = await POST(invoiceEvent('invoice.payment_failed', { subscriptionId: 'sub_A', customerEmail: 'shared@example.com' }))
    expect(res.status).toBe(200)
    expect(h.store.tenants[0].billing_status).toBe('past_due') // A: matched by subscription id
    expect(h.store.tenants[1].billing_status).toBe('active') // B: untouched despite matching email
  })

  it('invoice.paid: no subscription id on the event → no tenant touched (no email fallback)', async () => {
    await POST(invoiceEvent('invoice.paid', { customerEmail: 'shared@example.com' }))
    expect(h.store.tenants[0].billing_status).toBe('active')
    expect(h.store.tenants[0].last_payment_at).toBeFalsy()
    expect(h.store.tenants[1].billing_status).toBe('active')
    expect(h.store.tenants[1].last_payment_at).toBeFalsy()
  })

  it('customer.subscription.deleted: cancels only the tenant owning that subscription id', async () => {
    const res = await POST(subscriptionDeletedEvent('sub_B'))
    expect(res.status).toBe(200)
    expect(h.store.tenants[1].billing_status).toBe('cancelled')
    expect(h.store.tenants[0].billing_status).toBe('active')
  })
})
