/**
 * invoice.paid / invoice.payment_failed / customer.subscription.deleted —
 * these flip a Full Loop tenant's own SaaS billing_status (renewal succeeded
 * / past_due / cancelled). They used to look tenants up by
 * `tenants.owner_email` matched against the Stripe customer email on the
 * event — but owner_email is editable at any time via
 * `PATCH /api/admin/tenants/[id]`, so an admin fixing a typo (or any drift
 * between Stripe's stored email and the current owner_email) silently broke
 * all three handlers for that tenant forever: renewals never confirm,
 * failed payments never flip billing_status to past_due, cancellations never
 * flip it to cancelled. `tenants.stripe_subscription_id` (set at signup,
 * 2026-07-05 migration) is a stable identifier immune to that drift — these
 * tests prove the handlers now prefer it and only fall back to email for a
 * pre-migration tenant that never got a stored subscription id.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const stripeCtl = vi.hoisted(() => ({ current: null as unknown, customerRetrieveResult: null as unknown }))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: () => stripeCtl.current }
    customers = { retrieve: () => Promise.resolve(stripeCtl.customerRetrieveResult) }
  },
}))

import { POST as stripeWebhook } from './route'

function post(): Promise<Response> {
  return stripeWebhook(
    new Request('http://acme.example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=sig' },
      body: JSON.stringify({ id: 'evt_1' }),
    }),
  )
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    tenants: [
      { id: 'tenant-with-sub', owner_email: 'owner@acme.example.com', stripe_subscription_id: 'sub_abc', billing_status: 'past_due', name: 'Acme Co' },
      { id: 'tenant-legacy-no-sub', owner_email: 'legacy@example.com', stripe_subscription_id: null, billing_status: 'past_due', name: 'Legacy Co' },
    ],
  }
  stripeCtl.current = null
  stripeCtl.customerRetrieveResult = null
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  delete process.env.ADMIN_NOTIFICATION_EMAIL
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function invoiceEvent(type: 'invoice.paid' | 'invoice.payment_failed', opts: { subscriptionId?: string | null; customerEmail?: string | null }) {
  return {
    type,
    data: {
      object: {
        customer_email: opts.customerEmail ?? null,
        parent: opts.subscriptionId
          ? { subscription_details: { subscription: opts.subscriptionId } }
          : null,
      },
    },
  }
}

describe('invoice.paid — tenant lookup', () => {
  it('finds the tenant by stripe_subscription_id even when the Stripe customer_email no longer matches owner_email (admin edited it since signup)', async () => {
    stripeCtl.current = invoiceEvent('invoice.paid', { subscriptionId: 'sub_abc', customerEmail: 'stale-email-on-stripe@example.com' })

    await post()

    const tenant = h.store.tenants.find((t) => t.id === 'tenant-with-sub')
    expect(tenant?.billing_status).toBe('active')
    expect(tenant?.last_payment_at).toBeTruthy()
  })

  it('falls back to customer_email for a pre-migration tenant with no stored subscription id', async () => {
    stripeCtl.current = invoiceEvent('invoice.paid', { subscriptionId: null, customerEmail: 'legacy@example.com' })

    await post()

    expect(h.store.tenants.find((t) => t.id === 'tenant-legacy-no-sub')?.billing_status).toBe('active')
  })

  it('is a no-op when neither the subscription id nor the email match any tenant', async () => {
    stripeCtl.current = invoiceEvent('invoice.paid', { subscriptionId: 'sub_unknown', customerEmail: 'nobody@example.com' })

    await post()

    expect(h.store.tenants.find((t) => t.id === 'tenant-with-sub')?.billing_status).toBe('past_due')
    expect(h.store.tenants.find((t) => t.id === 'tenant-legacy-no-sub')?.billing_status).toBe('past_due')
  })
})

describe('invoice.payment_failed — tenant lookup', () => {
  it('finds the tenant by stripe_subscription_id despite a stale customer_email', async () => {
    stripeCtl.current = invoiceEvent('invoice.payment_failed', { subscriptionId: 'sub_abc', customerEmail: 'stale-email-on-stripe@example.com' })

    await post()

    expect(h.store.tenants.find((t) => t.id === 'tenant-with-sub')?.billing_status).toBe('past_due')
  })
})

describe('customer.subscription.deleted — tenant lookup', () => {
  function subscriptionDeletedEvent(subId: string, customerId = 'cus_1') {
    return { type: 'customer.subscription.deleted', data: { object: { id: subId, customer: customerId } } }
  }

  it('finds the tenant by the subscription id on the event itself — no Stripe customer API call needed', async () => {
    stripeCtl.current = subscriptionDeletedEvent('sub_abc')
    stripeCtl.customerRetrieveResult = { deleted: true } // would break the old email-only path if it were still reached

    await post()

    const tenant = h.store.tenants.find((t) => t.id === 'tenant-with-sub')
    expect(tenant?.billing_status).toBe('cancelled')
    expect(tenant?.subscription_cancelled_at).toBeTruthy()
  })

  it('falls back to a live customer-email lookup for a pre-migration tenant with no stored subscription id', async () => {
    stripeCtl.current = subscriptionDeletedEvent('sub_never_stored', 'cus_legacy')
    stripeCtl.customerRetrieveResult = { deleted: false, email: 'legacy@example.com' }

    await post()

    expect(h.store.tenants.find((t) => t.id === 'tenant-legacy-no-sub')?.billing_status).toBe('cancelled')
  })
})
