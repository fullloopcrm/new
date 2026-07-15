import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Defense-in-depth for the NYC Maid instant-payout leg: the payments table's
 * UNIQUE stripe_session_id constraint is the FIRST line of defense against a
 * duplicate webhook delivery re-entering the payout branch (see
 * route.payout-idempotency.test.ts). This test proves the SECOND line of
 * defense — the Stripe idempotencyKey on stripe.payouts.create — still holds
 * even if that DB-level guard is somehow bypassed (e.g. two distinct Stripe
 * sessions get tied to the same booking_id upstream). Without a key,
 * stripe.transfers.create is deduped by Stripe but stripe.payouts.create is
 * NOT, so a second delivery would land a second, real instant payout on top
 * of the (deduped) transfer — a real double-pay of the cleaner.
 */

const TENANT_ID = 'nycmaid_tenant'
const SESSION_ID = 'cs_instant_payout_1'
const bookingEvent = {
  type: 'checkout.session.completed',
  data: {
    object: {
      id: SESSION_ID,
      metadata: { booking_id: 'book_instant_1', tenant_id: TENANT_ID },
      amount_total: 13800,
      payment_intent: 'pi_instant_1',
      client_reference_id: null,
      customer_details: { email: 'payer@example.com' },
    },
  },
}

// Simulate real Stripe idempotency-key semantics for BOTH money-moving calls:
// same key => cached object returned, no new transfer/payout minted.
const idempotencyStore = new Map<string, { id: string }>()
let realTransferCount = 0
let realPayoutCount = 0
const transfersCreate = vi.fn(async (_params: unknown, options?: { idempotencyKey?: string }) => {
  const key = options?.idempotencyKey
  if (key && idempotencyStore.has(key)) return idempotencyStore.get(key)!
  realTransferCount++
  const transfer = { id: `tr_${realTransferCount}` }
  if (key) idempotencyStore.set(key, transfer)
  return transfer
})
const payoutsCreate = vi.fn(async (_params: unknown, options?: { idempotencyKey?: string }) => {
  const key = options?.idempotencyKey
  if (key && idempotencyStore.has(key)) return idempotencyStore.get(key)!
  realPayoutCount++
  const payout = { id: `po_${realPayoutCount}` }
  if (key) idempotencyStore.set(key, payout)
  return payout
})

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => bookingEvent }
    transfers = { create: transfersCreate }
    payouts = { create: payoutsCreate }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

// Always succeeds — models the DB-level dedupe being bypassed so the route
// runs the payout branch on EVERY delivery, putting all the weight on the
// Stripe-side idempotency keys.
let payRowCounter = 0
function paymentsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    insert: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
    single: async () => ({ data: { id: `pay_${++payRowCounter}` }, error: null }),
  }
  return chain
}

function bookingsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    update: () => chain,
    single: async () => ({
      data: {
        id: 'book_instant_1', client_id: 'client_1', team_member_id: 'tm_1',
        hourly_rate: 69, pay_rate: null, team_member_pay: null, actual_hours: 2, price: 13800,
        team_members: { name: 'Cleaner', phone: null, pay_rate: 25, stripe_account_id: 'acct_tm_1', preferred_language: 'en' },
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
        single: async () => ({ data: { id: 'row_x' }, error: null }),
      }
      return noop
    },
  },
}))

vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: async () => ({ posted: true }) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: async () => ({ posted: true }) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: (tid: string) => tid === 'nycmaid_tenant', NYCMAID_TENANT_ID: 'nycmaid_tenant' }))

import { POST } from './route'

function req(body: string): Request {
  return { text: async () => body, headers: { get: () => 'sig_test' } } as unknown as Request
}

beforeEach(() => {
  transfersCreate.mockClear()
  payoutsCreate.mockClear()
  idempotencyStore.clear()
  realTransferCount = 0
  realPayoutCount = 0
  payRowCounter = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
})

describe('Stripe webhook — NYC Maid instant payout never double-pays even if DB dedupe is bypassed', () => {
  it('two deliveries for the same booking pass the same instant-payout idempotencyKey and only one real payout is minted', async () => {
    const first = await POST(req('{}'))
    const second = await POST(req('{}'))

    expect((await first.json()).received).toBe(true)
    expect((await second.json()).received).toBe(true)

    // Both the transfer AND the instant payout were invoked at the application
    // layer on each delivery...
    expect(transfersCreate).toHaveBeenCalledTimes(2)
    expect(payoutsCreate).toHaveBeenCalledTimes(2)

    const [, transferOpts1] = transfersCreate.mock.calls[0]
    const [, transferOpts2] = transfersCreate.mock.calls[1]
    expect(transferOpts1).toEqual({ idempotencyKey: 'payout-book_instant_1' })
    expect(transferOpts2).toEqual({ idempotencyKey: 'payout-book_instant_1' })

    const [, payoutOpts1] = payoutsCreate.mock.calls[0]
    const [, payoutOpts2] = payoutsCreate.mock.calls[1]
    expect(payoutOpts1).toEqual({ stripeAccount: 'acct_tm_1', idempotencyKey: 'payout-instant-book_instant_1' })
    expect(payoutOpts2).toEqual({ stripeAccount: 'acct_tm_1', idempotencyKey: 'payout-instant-book_instant_1' })

    // ...but Stripe's own idempotency semantics mean only ONE real transfer and
    // ONE real instant payout were ever minted across both deliveries.
    expect(realTransferCount).toBe(1)
    expect(realPayoutCount).toBe(1)
  })
})
