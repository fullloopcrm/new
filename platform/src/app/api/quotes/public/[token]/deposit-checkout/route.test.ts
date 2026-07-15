import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 checkout/payment HAPPY-PATH lock — customer path #2, SECOND ANGLE (quotes).
 *
 * Already locked on p1-w4:
 *   - invoices/public/[token]/checkout/route.test.ts  → customer pays an
 *     INVOICE balance (front half).
 *   - webhooks/stripe/route.invoice-payment.happy-path.test.ts → webhook back
 *     half.
 *
 * This is the parallel FRONT half for the QUOTE deposit money path — a customer
 * on a tenant's public proposal link clicking "Pay deposit" and getting a real
 * Stripe Checkout Session:
 *   POST /api/quotes/public/[token]/deposit-checkout
 *
 * WHY IT MATTERS (what a regression here breaks for a real customer):
 *   1. The charge amount = DEPOSIT REMAINING (deposit_cents − deposit_paid_cents),
 *      not the full deposit. Drop the subtraction and a customer who already
 *      paid part of the deposit is charged the whole deposit again.
 *   2. The session must carry metadata { quote_id, tenant_id, quote_deposit }
 *      on BOTH the session and the payment_intent — that is the only thing that
 *      lets the webhook mark the deposit paid, close the deal to sold, and spin
 *      up the Job. Lose it and the money lands nowhere.
 *   3. A declined/expired proposal, or one with no deposit remaining, must NOT
 *      mint a session — the double-charge / dead-proposal guard.
 *
 * REAL: the route handler (deposit math, guards, Stripe args, event-log call).
 * MOCKED: Stripe SDK (sessions.create spy), the DB (returns a preset quote
 * joined to its tenant), decryptSecret (identity — tenant key passes through),
 * and logQuoteEvent (asserted-called).
 */

const TENANT_A = 'aaaaaaaa-1111-2222-3333-444444444444'

const h = vi.hoisted(() => {
  return {
    quote: null as Record<string, any> | null,
    createSession: vi.fn(async (_args: Record<string, any>) => ({
      id: 'cs_test_deposit_1',
      url: 'https://checkout.stripe.test/cs_test_deposit_1',
    })),
    logQuoteEvent: vi.fn(async (_e: Record<string, any>) => {}),
  }
})

// Supabase: from('quotes').select(...).eq('public_token', token).maybeSingle()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: h.quote, error: null }),
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

vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('@/lib/quote', () => ({ logQuoteEvent: h.logQuoteEvent }))

import { POST } from './route'

function makeQuote(over: Record<string, any> = {}) {
  return {
    id: 'quote-A',
    tenant_id: TENANT_A,
    quote_number: 'Q-2044',
    title: 'Roof wash — spring package',
    status: 'sent',
    contact_email: 'buyer@example.com',
    deposit_cents: 12000,
    deposit_paid_cents: 0,
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
  return new Request(`https://sparkle.example/api/quotes/public/${token}/deposit-checkout`, { method: 'POST' })
}
const ctx = (token: string) => ({ params: Promise.resolve({ token }) })

beforeEach(() => {
  h.quote = makeQuote()
  h.createSession.mockClear()
  h.logQuoteEvent.mockClear()
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.fullloop.example'
})

describe('POST /api/quotes/public/[token]/deposit-checkout — customer pays a proposal deposit', () => {
  it('mints a Stripe Checkout Session for the full deposit due, tagged with quote+tenant+deposit flag, and returns its URL', async () => {
    const res = await POST(req('tok_A'), ctx('tok_A'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/cs_test_deposit_1' })

    expect(h.createSession).toHaveBeenCalledTimes(1)
    const args = h.createSession.mock.calls[0][0]

    // Charges the full deposit (nothing paid yet), in payment mode.
    expect(args.mode).toBe('payment')
    expect(args.line_items[0].price_data.unit_amount).toBe(12000)
    expect(args.line_items[0].price_data.currency).toBe('usd')
    expect(args.line_items[0].quantity).toBe(1)
    expect(args.customer_email).toBe('buyer@example.com')

    // The attribution the webhook (deposit back half) depends on — on BOTH the
    // session and the payment_intent, and it flags this as a deposit.
    expect(args.metadata).toMatchObject({
      quote_id: 'quote-A',
      tenant_id: TENANT_A,
      quote_deposit: 'true',
    })
    expect(args.payment_intent_data.metadata).toMatchObject({
      quote_id: 'quote-A',
      tenant_id: TENANT_A,
      quote_deposit: 'true',
    })

    // The checkout-created event is logged with the session id + amount.
    expect(h.logQuoteEvent).toHaveBeenCalledTimes(1)
    expect(h.logQuoteEvent.mock.calls[0][0]).toMatchObject({
      quote_id: 'quote-A',
      tenant_id: TENANT_A,
      event_type: 'viewed',
      detail: { action: 'deposit_checkout_created', stripe_session_id: 'cs_test_deposit_1', amount_cents: 12000 },
    })
  })

  it('charges only the REMAINING deposit when part of it was already paid (never re-charges the full deposit)', async () => {
    h.quote = makeQuote({ deposit_cents: 12000, deposit_paid_cents: 5000 })

    const res = await POST(req('tok_A'), ctx('tok_A'))

    expect(res.status).toBe(200)
    expect(h.createSession).toHaveBeenCalledTimes(1)
    // 12000 − 5000 = 7000, NOT the 12000 deposit.
    expect(h.createSession.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(7000)
  })

  it('refuses to create a session for a declined proposal — the dead-proposal guard', async () => {
    h.quote = makeQuote({ status: 'declined' })

    const res = await POST(req('tok_A'), ctx('tok_A'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/declined/i)
    // No Stripe session, no event — the customer is not charged.
    expect(h.createSession).not.toHaveBeenCalled()
    expect(h.logQuoteEvent).not.toHaveBeenCalled()
  })

  it('refuses when the deposit is already fully paid — no session, no double charge', async () => {
    h.quote = makeQuote({ deposit_cents: 12000, deposit_paid_cents: 12000 })

    const res = await POST(req('tok_A'), ctx('tok_A'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/no deposit due/i)
    expect(h.createSession).not.toHaveBeenCalled()
  })

  it('unknown token 404s — no session, no event', async () => {
    h.quote = null

    const res = await POST(req('tok_bogus'), ctx('tok_bogus'))

    expect(res.status).toBe(404)
    expect(h.createSession).not.toHaveBeenCalled()
    expect(h.logQuoteEvent).not.toHaveBeenCalled()
  })
})
