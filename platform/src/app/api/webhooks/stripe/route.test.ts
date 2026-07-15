import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — session-level idempotency (route's first line of defense).
 *
 * The invoice-payment branch claims the session atomically: it INSERTs the
 * payment directly (stripe_session_id UNIQUE, migration 011) and treats a
 * 23505 on that insert as the idempotency signal, returning
 * `{ idempotent: true }` — there is no separate select-then-insert existence
 * check (that shape had a race gap between the read and the write; the
 * insert itself is now the atomic decision point). This test drives the
 * invoice-payment branch (the simplest money branch) and proves a duplicate
 * delivery inserts the payment exactly once.
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

// ── Supabase mock: track captured inserts + enforce the UNIQUE constraint ──
// The insert itself is the atomic claim — a second insert for the same
// stripe_session_id must surface a 23505, same as the real Postgres index.
let paymentRows: Array<{ id: string; stripe_session_id: string }>
let insertCount: number

function paymentsBuilder() {
  const state: { pending?: Record<string, unknown> } = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: (row: Record<string, unknown>) => {
      state.pending = row
      return chain
    },
    single: async () => {
      // terminal for insert().select().single()
      const sessionId = String(state.pending?.stripe_session_id ?? '')
      if (paymentRows.some(r => r.stripe_session_id === sessionId)) {
        return {
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint on payments.stripe_session_id' },
        }
      }
      insertCount++
      const id = `pay_${insertCount}`
      paymentRows.push({ id, stripe_session_id: sessionId })
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
