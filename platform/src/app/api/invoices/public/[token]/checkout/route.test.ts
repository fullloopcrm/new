import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 checkout/payment HAPPY-PATH lock — customer path #2, SECOND ANGLE.
 *
 * The existing lock (webhooks/stripe/route.invoice-payment.happy-path.test.ts)
 * covers the BACK half of the customer money path: Stripe → webhook → payment
 * row + revenue. This locks the FRONT half — the customer, on a tenant's public
 * invoice link, clicking "Pay" and getting a real Stripe Checkout Session:
 *   POST /api/invoices/public/[token]/checkout
 *
 * WHY IT MATTERS (what a regression here breaks for a real customer):
 *   1. The charge amount = BALANCE DUE (total − already-paid), not the full
 *      total. Drop the subtraction and a customer who paid a deposit is charged
 *      the whole invoice again.
 *   2. The session must carry metadata { invoice_id, tenant_id } — that is the
 *      ONLY thing that lets the webhook (back half) attribute the payment to the
 *      right invoice/tenant. Lose it and the money lands nowhere.
 *   3. An already-paid / void / refunded invoice must NOT mint a session — that
 *      is the double-charge guard.
 *
 * REAL: the route handler (balance math, guards, Stripe args, event log call).
 * MOCKED: Stripe SDK (sessions.create spy), the DB (returns a preset invoice
 * joined to its tenant), decryptSecret (identity — the tenant key passes
 * through), and logInvoiceEvent (asserted-called).
 */

const TENANT_A = 'aaaaaaaa-1111-2222-3333-444444444444'

const h = vi.hoisted(() => {
  return {
    // The invoice row the DB returns for the token. Tests mutate before calling.
    invoice: null as Record<string, any> | null,
    // Spy for stripe.checkout.sessions.create — returns a fixed session.
    createSession: vi.fn(async (_args: Record<string, any>) => ({
      id: 'cs_test_front_1',
      url: 'https://checkout.stripe.test/cs_test_front_1',
    })),
    logInvoiceEvent: vi.fn(async (_e: Record<string, any>) => {}),
  }
})

// Supabase: from('invoices').select(...).eq('public_token', token).maybeSingle()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: h.invoice, error: null }),
      }
      return chain
    },
  },
}))

// Stripe SDK: constructor ignores the key; sessions.create is the spy.
vi.mock('stripe', () => {
  class MockStripe {
    checkout = { sessions: { create: h.createSession } }
  }
  return { default: MockStripe }
})

// Tenant Stripe key is stored encrypted; identity decrypt so it passes through.
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('@/lib/invoice', () => ({ logInvoiceEvent: h.logInvoiceEvent }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 9 }) }))

import { POST } from './route'

function makeInvoice(over: Record<string, any> = {}) {
  return {
    id: 'inv-A',
    tenant_id: TENANT_A,
    public_token: 'tok_public_A',
    invoice_number: 'INV-1007',
    title: 'Deep clean — March',
    status: 'sent',
    total_cents: 24500,
    amount_paid_cents: 0,
    contact_email: 'customer@example.com',
    tenants: {
      name: 'Sparkle Co',
      domain: 'sparkle.example',
      stripe_api_key: 'sk_live_tenantA',
      stripe_account_id: 'acct_A',
    },
    ...over,
  }
}

function req(token: string) {
  return new Request(`https://sparkle.example/api/invoices/public/${token}/checkout`, { method: 'POST' })
}
const ctx = (token: string) => ({ params: Promise.resolve({ token }) })

beforeEach(() => {
  h.invoice = makeInvoice()
  h.createSession.mockClear()
  h.logInvoiceEvent.mockClear()
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.fullloop.example'
})

describe('POST /api/invoices/public/[token]/checkout — customer pays a public invoice', () => {
  it('mints a Stripe Checkout Session for the balance due, tagged with invoice+tenant, and returns its URL', async () => {
    const res = await POST(req('tok_public_A'), ctx('tok_public_A'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/cs_test_front_1' })

    expect(h.createSession).toHaveBeenCalledTimes(1)
    const args = h.createSession.mock.calls[0][0]

    // Charges the full balance (nothing paid yet), in payment mode.
    expect(args.mode).toBe('payment')
    expect(args.line_items[0].price_data.unit_amount).toBe(24500)
    expect(args.line_items[0].price_data.currency).toBe('usd')
    expect(args.line_items[0].quantity).toBe(1)

    // The attribution the webhook (back half) depends on.
    expect(args.metadata).toMatchObject({
      invoice_id: 'inv-A',
      tenant_id: TENANT_A,
      invoice_number: 'INV-1007',
    })
    expect(args.payment_intent_data.metadata).toMatchObject({ invoice_id: 'inv-A', tenant_id: TENANT_A })
    expect(args.customer_email).toBe('customer@example.com')

    // The checkout-created event is logged with the session id.
    expect(h.logInvoiceEvent).toHaveBeenCalledTimes(1)
    expect(h.logInvoiceEvent.mock.calls[0][0]).toMatchObject({
      invoice_id: 'inv-A',
      tenant_id: TENANT_A,
      detail: { action: 'stripe_checkout_created', stripe_session_id: 'cs_test_front_1' },
    })
  })

  it('charges only the REMAINING balance when a deposit was already paid (never re-charges the full total)', async () => {
    h.invoice = makeInvoice({ total_cents: 30000, amount_paid_cents: 10000 })

    const res = await POST(req('tok_public_A'), ctx('tok_public_A'))

    expect(res.status).toBe(200)
    expect(h.createSession).toHaveBeenCalledTimes(1)
    // 30000 − 10000 = 20000, NOT the 30000 total.
    expect(h.createSession.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(20000)
  })

  it('refuses to create a session for an already-paid invoice — the double-charge guard', async () => {
    h.invoice = makeInvoice({ status: 'paid' })

    const res = await POST(req('tok_public_A'), ctx('tok_public_A'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/cannot pay paid invoice/i)
    // No Stripe session, no event — the customer is not charged again.
    expect(h.createSession).not.toHaveBeenCalled()
    expect(h.logInvoiceEvent).not.toHaveBeenCalled()
  })
})
