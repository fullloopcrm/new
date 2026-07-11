import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — the booking-payout branch must NOT move money on a concurrent
 * duplicate. payments.stripe_session_id is UNIQUE (migration 011); a duplicate
 * delivery that races past the existence SELECT loses on the insert with 23505.
 * The route now checks that error and bails BEFORE the cleaner payout, instead of
 * swallowing it and continuing into stripe.transfers.create. This drives the real
 * route and asserts the duplicate returns { idempotent: true } and never transfers.
 */

const SESSION_ID = 'cs_dup_booking_1'
const bookingEvent = {
  type: 'checkout.session.completed',
  data: {
    object: {
      id: SESSION_ID,
      metadata: { booking_id: 'book_1', tenant_id: 'tenant_1' },
      amount_total: 13800,
      payment_intent: 'pi_dup_1',
      client_reference_id: null,
      customer_details: { email: 'payer@example.com' },
    },
  },
}

const transfersCreate = vi.fn(async () => ({ id: 'tr_should_not_happen' }))
const payoutsCreate = vi.fn(async () => ({ id: 'po_should_not_happen' }))

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => bookingEvent }
    transfers = { create: transfersCreate }
    payouts = { create: payoutsCreate }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

// payments: existence SELECT → empty (proceed); insert → 23505 unique violation.
function paymentsBuilder() {
  const st = { inserted: false }
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => { st.inserted = true; return chain },
    eq: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }), // existence check: none yet
    single: async () =>
      st.inserted
        ? { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "payments_stripe_session_id_key"' } }
        : { data: null, error: null },
  }
  return chain
}

function bookingsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({
      data: {
        id: 'book_1', client_id: 'client_1', team_member_id: 'tm_1',
        hourly_rate: 6900, pay_rate: 2500, team_member_pay: null, actual_hours: 2, price: 13800,
        team_members: { name: 'Cleaner', phone: null, pay_rate: 2500, stripe_account_id: 'acct_tm_1', preferred_language: 'en' },
        clients: { name: 'Client', phone: null, address: null },
        tenants: { name: 'Tenant', telnyx_api_key: null, telnyx_phone: null },
      },
      error: null,
    }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'payments') return paymentsBuilder()
      if (table === 'bookings') return bookingsBuilder()
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
  return { text: async () => body, headers: { get: () => 'sig_test' } } as unknown as Request
}

beforeEach(() => {
  transfersCreate.mockClear()
  payoutsCreate.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
})

describe('Stripe webhook — duplicate booking payment does not double-pay the cleaner', () => {
  it('a 23505 on the payment insert returns idempotent and never calls transfers.create', async () => {
    const res = await POST(req('{}'))
    const body = await res.json()

    expect(body.idempotent).toBe(true)
    expect(transfersCreate).not.toHaveBeenCalled()
    expect(payoutsCreate).not.toHaveBeenCalled()
  })
})
