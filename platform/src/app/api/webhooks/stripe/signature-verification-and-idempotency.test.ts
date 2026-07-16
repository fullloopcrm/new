/**
 * Stripe webhook — signature-verification FAILURE handling + idempotency-key
 * replay (P1/W1 18:01 queue item a).
 *
 * refund-dispute-wiring.test.ts (the only other test that drives the real
 * POST handler) mocks `stripe.webhooks.constructEvent` to unconditionally
 * return the fed event — it never exercises the `catch` branch where a
 * bad/forged signature makes constructEvent throw, so a regression there
 * (e.g. someone swallowing the throw, or returning 200 on failure) would go
 * unnoticed. Separately, no test replays the SAME checkout.session.completed
 * event twice through the real handler to prove the stripe_session_id
 * idempotency check (route.ts invoice path) blocks a double revenue post on
 * a Stripe webhook retry (Stripe redelivers at-least-once).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const postPaymentRevenue = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const stripeCtl = vi.hoisted(() => ({ current: null as unknown, throwOnConstruct: false }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue }))
// Stripe — no network, no real key. constructEvent either throws (bad
// signature) or returns the event we fed it, per-test.
vi.mock('stripe', () => ({
  default: class {
    webhooks = {
      constructEvent: () => {
        if (stripeCtl.throwOnConstruct) {
          throw new Error('No signatures found matching the expected signature for payload')
        }
        return stripeCtl.current
      },
    }
  },
}))

import { POST as stripeWebhook } from './route'

function post(sig = 't=1,v1=sig') {
  return stripeWebhook(
    new Request('http://acme.example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': sig },
      body: JSON.stringify({ id: 'evt_1' }),
    }),
  )
}

beforeEach(() => {
  h.seq = 0
  h.store = { payments: [] }
  postPaymentRevenue.mockClear()
  stripeCtl.current = null
  stripeCtl.throwOnConstruct = false
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('signature verification failure', () => {
  it('rejects a bad/forged signature with 400 and posts NOTHING', async () => {
    stripeCtl.throwOnConstruct = true
    const res = await post('t=1,v1=forged')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'Invalid signature' })
    // A forged signature must never reach any downstream write.
    expect(h.store.payments).toHaveLength(0)
    expect(postPaymentRevenue).not.toHaveBeenCalled()
  })
})

describe('checkout.session.completed idempotency replay (invoice path, stripe_session_id key)', () => {
  const TENANT = 'tenant-A'

  function invoiceSessionEvent(sessionId: string) {
    return {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          amount_total: 5000,
          payment_intent: 'pi_1',
          metadata: { tenant_id: TENANT, invoice_id: 'inv_1' },
        },
      },
    }
  }

  it('posts revenue once on first delivery; a replay of the same event is a no-op', async () => {
    stripeCtl.current = invoiceSessionEvent('cs_replay_1')

    const first = await post()
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ received: true, invoice_paid: true })
    expect(h.store.payments).toHaveLength(1)
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)
    expect(postPaymentRevenue).toHaveBeenCalledWith({ tenantId: TENANT, paymentId: h.store.payments[0].id })

    // Stripe redelivers the SAME event (at-least-once delivery / manual retry).
    // Same signature-verified body → same session.id → must hit the
    // stripe_session_id lookup and short-circuit before any second insert.
    const replay = await post()
    expect(replay.status).toBe(200)
    expect(await replay.json()).toEqual({ received: true, idempotent: true })

    // No double insert, no second revenue post — the money is posted exactly once.
    expect(h.store.payments).toHaveLength(1)
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)
  })

  it('does not conflate two DIFFERENT sessions — each gets its own payment + revenue post', async () => {
    stripeCtl.current = invoiceSessionEvent('cs_a')
    await post()
    stripeCtl.current = invoiceSessionEvent('cs_b')
    await post()

    expect(h.store.payments).toHaveLength(2)
    expect(postPaymentRevenue).toHaveBeenCalledTimes(2)
  })

  it('a TRUE concurrent redelivery (both requests bypass the stripe_session_id SELECT fast-path) still lands exactly one payments row', async () => {
    // The "existing" check above is only a fast-path -- it has the same
    // read-then-write TOCTOU gap as every other route fixed this session.
    // Promise.all here drives both requests through the SELECT (both see no
    // existing row) before either INSERT commits, so only migration 011's
    // real stripe_session_id UNIQUE constraint (emulated by the shared fake)
    // can prevent a double payments row + double revenue post. Previously
    // the insert's error was discarded entirely, so this scenario would have
    // landed two rows.
    stripeCtl.current = invoiceSessionEvent('cs_concurrent_1')

    const [first, second] = await Promise.all([post(), post()])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)

    const bodies = await Promise.all([first.json(), second.json()])
    const idempotent = bodies.filter((b) => b.idempotent)
    const paid = bodies.filter((b) => b.invoice_paid)
    expect(idempotent).toHaveLength(1)
    expect(paid).toHaveLength(1)
  })
})
