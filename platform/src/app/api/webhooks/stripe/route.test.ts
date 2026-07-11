import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — session-level idempotency (route's first line of defense).
 *
 * Before touching the ledger, the route guards each money-in checkout on the
 * Stripe session id: it SELECTs payments by stripe_session_id and returns
 * `{ idempotent: true }` if a row already exists, so a redelivered
 * checkout.session.completed never inserts a second payment. This test drives
 * the invoice-payment branch (the simplest money branch) and proves a duplicate
 * delivery inserts the payment exactly once.
 *
 * Backing constraint: payments.stripe_session_id is UNIQUE (migration 011), so
 * even if two deliveries raced past this SELECT, the DB would reject the second
 * insert. The gap (documented in /tmp/w2-webhook-idempotency.md) is that the
 * route does NOT check the insert's error, so a raced second delivery would
 * swallow the unique-violation and still run downstream side effects.
 */

// ── Event returned by the mocked Stripe signature verifier ──
const SESSION_ID = 'cs_test_dup_1'
const invoiceEvent = {
  type: 'checkout.session.completed',
  data: {
    object: {
      id: SESSION_ID,
      metadata: { invoice_id: 'inv_1', tenant_id: 'tenant_1' },
      amount_total: 9900,
      payment_intent: 'pi_test_1',
      client_reference_id: null,
      customer_details: { email: 'payer@example.com' },
    },
  },
}

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => invoiceEvent }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

// ── Supabase mock: track existing-payment lookups + captured inserts ──
// The first existence check returns none; after the insert, subsequent checks
// return the stored row — modelling sequential redelivery against the real
// stripe_session_id guard.
let paymentRows: Array<{ id: string; stripe_session_id: string }>
let insertCount: number

function paymentsBuilder() {
  const state: { op?: 'select' | 'insert'; sessionEq?: string; pending?: Record<string, unknown> } = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: (row: Record<string, unknown>) => {
      state.op = 'insert'
      state.pending = row
      return chain
    },
    eq: (col: string, val: unknown) => {
      if (col === 'stripe_session_id') state.sessionEq = String(val)
      return chain
    },
    limit: () => {
      // terminal for the existence SELECT: resolve to the matching rows
      const data = paymentRows.filter(r => r.stripe_session_id === state.sessionEq)
      return Promise.resolve({ data, error: null })
    },
    single: async () => {
      // terminal for the insert().select().single()
      insertCount++
      const id = `pay_${insertCount}`
      paymentRows.push({ id, stripe_session_id: String(state.pending?.stripe_session_id ?? '') })
      return { data: { id }, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'payments') return paymentsBuilder()
      // Any other table touched on this branch: harmless no-op chain.
      const noop: Record<string, unknown> = {
        select: () => noop, insert: () => noop, update: () => noop, eq: () => noop,
        limit: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }
      return noop
    },
  },
}))

vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: async () => ({ posted: true }) }))

import { POST } from './route'

function req(body: string): Request {
  return {
    text: async () => body,
    headers: { get: () => 'sig_test' },
  } as unknown as Request
}

beforeEach(() => {
  paymentRows = []
  insertCount = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
})

describe('Stripe webhook — duplicate checkout.session.completed (invoice) does not double-insert', () => {
  it('first delivery inserts the payment; second returns idempotent with no second insert', async () => {
    const first = await POST(req('{}'))
    const firstBody = await first.json()
    expect(firstBody.invoice_paid).toBe(true)
    expect(insertCount).toBe(1)

    const second = await POST(req('{}'))
    const secondBody = await second.json()
    expect(secondBody.idempotent).toBe(true)
    expect(insertCount).toBe(1) // no double-apply
  })
})
