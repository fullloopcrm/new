/**
 * Per-tenant checkout webhook signature verification for a tenant running
 * its OWN standalone Stripe account (2026-08-06, FloridaMade wiring).
 *
 * A tenant's static "customer enters amount" Payment Link (the NYC Maid-
 * parity flow — one reusable link, ?client_reference_id=<bookingId>
 * appended per SMS) carries NO metadata: Stripe does not copy a Payment
 * Link's own metadata onto the Checkout Session it produces on completion
 * (confirmed against Stripe's payment-link tracking docs — only
 * client_reference_id survives). So peekEventTenantId() can't find
 * metadata.tenant_id on these events and must fall back to resolving the
 * tenant from the referenced booking via client_reference_id before it can
 * even pick which tenants.stripe_webhook_secret to attempt.
 *
 * This previously meant ANY tenant other than the one behind the shared
 * platform STRIPE_WEBHOOK_SECRET (nycmaid) had its real client payments
 * silently rejected with a signature mismatch — Stripe would process the
 * charge, but the app would never record it. See
 * peekEventTenantId()'s client_reference_id branch in ./route.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const stripeCtl = vi.hoisted(() => ({
  current: null as unknown,
  globalSecretWorks: false,
  calls: [] as string[],
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))

vi.mock('stripe', () => ({
  default: class {
    webhooks = {
      constructEvent: (_body: string, _sig: string, secret: string) => {
        stripeCtl.calls.push(secret)
        if (secret === 'whsec_platform_global' && stripeCtl.globalSecretWorks) return stripeCtl.current
        if (secret === 'whsec_tenant_checkout_real') return stripeCtl.current
        throw new Error('No signatures found matching the expected signature for payload')
      },
    }
    paymentLinks = { retrieve: vi.fn() }
  },
}))

import { POST as stripeWebhook } from './route'

function post(body: unknown) {
  return stripeWebhook(
    new Request('http://acme.example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=sig' },
      body: JSON.stringify(body),
    }),
  )
}

const TENANT_ID = 'tenant-checkout-1'
const BOOKING_ID = 'booking-checkout-1'

// Static Payment Link checkout — no metadata, only client_reference_id.
// session.payment_link is intentionally omitted so the anti-fraud
// link-ownership check (further down in the handler) stays false and
// processing exits cleanly via the "no booking reference" branch — this
// test targets signature verification, not the downstream money path
// (covered elsewhere).
function staticLinkCheckoutEvent(overrides?: Record<string, unknown>) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        client_reference_id: BOOKING_ID,
        amount_total: 5000,
        metadata: {},
        ...overrides,
      },
    },
  }
}

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [{ id: BOOKING_ID, tenant_id: TENANT_ID }], tenants: [] }
  stripeCtl.current = null
  stripeCtl.globalSecretWorks = false
  stripeCtl.calls = []
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_platform_global'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('webhooks/stripe — per-tenant checkout webhook secret fallback via client_reference_id', () => {
  it('resolves the tenant from the referenced booking and verifies against its own stripe_webhook_secret', async () => {
    h.store.tenants = [{ id: TENANT_ID, stripe_webhook_secret: 'whsec_tenant_checkout_real' }]
    stripeCtl.current = staticLinkCheckoutEvent()

    const res = await post(staticLinkCheckoutEvent())
    expect(res.status).toBe(200)

    // Tried the global secret first (unchanged priority), then the
    // booking-resolved tenant's own checkout secret.
    expect(stripeCtl.calls).toEqual(['whsec_platform_global', 'whsec_tenant_checkout_real'])
  })

  it('rejects with 400 when the referenced booking does not exist — no tenant hint available at all', async () => {
    h.store.bookings = []
    h.store.tenants = [{ id: TENANT_ID, stripe_webhook_secret: 'whsec_tenant_checkout_real' }]
    stripeCtl.current = staticLinkCheckoutEvent()

    const res = await post(staticLinkCheckoutEvent())
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid signature' })
  })

  it('rejects with 400 when the resolved tenant has no stripe_webhook_secret configured', async () => {
    h.store.tenants = [{ id: TENANT_ID, stripe_webhook_secret: null }]
    stripeCtl.current = staticLinkCheckoutEvent()

    const res = await post(staticLinkCheckoutEvent())
    expect(res.status).toBe(400)
  })

  it('rejects with 400 when the resolved tenant IS found but its secret still does not verify (forged/stale)', async () => {
    h.store.tenants = [{ id: TENANT_ID, stripe_webhook_secret: 'whsec_tenant_checkout_STALE' }]
    stripeCtl.current = staticLinkCheckoutEvent()

    const res = await post(staticLinkCheckoutEvent())
    expect(res.status).toBe(400)
    expect(stripeCtl.calls).toEqual(['whsec_platform_global', 'whsec_tenant_checkout_STALE'])
  })

  it('prefers metadata.tenant_id over client_reference_id when both are present (dynamic per-booking Checkout Session)', async () => {
    h.store.bookings = [] // no booking row needed — metadata path never queries bookings
    h.store.tenants = [{ id: TENANT_ID, stripe_webhook_secret: 'whsec_tenant_checkout_real' }]
    const evt = staticLinkCheckoutEvent({ metadata: { tenant_id: TENANT_ID } })
    stripeCtl.current = evt

    const res = await post(evt)
    expect(res.status).toBe(200)
    expect(stripeCtl.calls).toEqual(['whsec_platform_global', 'whsec_tenant_checkout_real'])
  })

  it('still succeeds on the first (global secret) attempt when it verifies — unchanged priority/behavior', async () => {
    stripeCtl.globalSecretWorks = true
    stripeCtl.current = staticLinkCheckoutEvent()

    const res = await post(staticLinkCheckoutEvent())
    expect(res.status).toBe(200)
    expect(stripeCtl.calls).toEqual(['whsec_platform_global'])
  })
})
