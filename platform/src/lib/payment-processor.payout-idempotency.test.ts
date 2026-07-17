import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * payment-processor.processPayment() has NO DB-level dedup on manual payment
 * confirmations (Zelle/Venmo/cash) — unlike the Stripe webhook route, which is
 * protected by a UNIQUE constraint on payments.stripe_session_id. A double-submit
 * of "confirm payment" (admin double-click, retried request) reaches
 * stripe.transfers.create twice for the SAME booking. The only remaining guard
 * is the idempotencyKey (`payout-<bookingId>`) now passed to transfers.create,
 * which makes Stripe treat the second call as a replay of the first instead of
 * moving money again. This test simulates Stripe's own idempotency-key
 * semantics (same key → cached response, no new transfer) and proves the
 * second processPayment() call for the same booking never creates a second,
 * distinct transfer.
 */

const TENANT: { id: string; name: string; stripe_api_key: null; telnyx_api_key: null; telnyx_phone: null } = {
  id: 'tenant_1',
  name: 'Test Tenant',
  stripe_api_key: null,
  telnyx_api_key: null,
  telnyx_phone: null,
}

const BOOKING_ID = 'book_dup_1'

// Simulate real Stripe idempotency-key behavior: same key => cached transfer
// returned, no new transfer object minted.
const idempotencyStore = new Map<string, { id: string }>()
let realTransferCount = 0
let realPayoutCount = 0
const transfersCreate = vi.fn(async (_params: unknown, options?: { idempotencyKey?: string }) => {
  const key = options?.idempotencyKey
  if (key && idempotencyStore.has(key)) {
    return idempotencyStore.get(key)! // no-op: replay of the cached result
  }
  realTransferCount++
  const transfer = { id: `tr_${realTransferCount}` }
  if (key) idempotencyStore.set(key, transfer)
  return transfer
})
// Same replay semantics for the instant payout leg — this is the call that
// used to have NO idempotencyKey, so a duplicate processPayment() would
// dedupe the transfer but still land a SECOND real instant payout.
const payoutsCreate = vi.fn(async (_params: unknown, options?: { idempotencyKey?: string }) => {
  const key = options?.idempotencyKey
  if (key && idempotencyStore.has(key)) {
    return idempotencyStore.get(key)!
  }
  realPayoutCount++
  const payout = { id: `po_${realPayoutCount}` }
  if (key) idempotencyStore.set(key, payout)
  return payout
})

vi.mock('stripe', () => {
  class MockStripe {
    transfers = { create: transfersCreate }
    payouts = { create: payoutsCreate }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

function bookingsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({
      data: {
        id: BOOKING_ID,
        team_member_id: 'tm_1',
        client_id: 'client_1',
        team_member_pay: null,
        actual_hours: 2,
        hourly_rate: 69,
        pay_rate: null,
        price: null,
        check_in_time: null,
        start_time: null,
        clients: { name: 'Client', phone: null, address: null },
        team_members: {
          name: 'Cleaner', phone: null, sms_consent: false,
          stripe_account_id: 'acct_tm_1', hourly_rate: null, pay_rate: 25,
          preferred_language: 'en',
        },
      },
      error: null,
    }),
    update: () => chain,
  }
  return chain
}

function paymentsBuilder() {
  // select().eq().eq() is awaited directly (no .single()) — resolving to this
  // plain chain object with no `data` key, which the caller treats as "no
  // prior payments" via `priorPayments || []`. Keeps each call non-partial.
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    insert: () => chain,
    single: async () => ({ data: { id: 'pay_x' }, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'bookings') return bookingsBuilder()
      if (table === 'payments') return paymentsBuilder()
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

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/cleaner-pay', () => ({ effectiveCleanerRate: (rate: number) => rate }))

import { processPayment } from './payment-processor'

beforeEach(() => {
  transfersCreate.mockClear()
  payoutsCreate.mockClear()
  idempotencyStore.clear()
  realTransferCount = 0
  realPayoutCount = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  // TENANT below has no telnyx_api_key/telnyx_phone — clear the platform
  // fallback (sms-credentials.ts) so SMS-send behavior here stays
  // deterministic regardless of the ambient shell/CI env.
  delete process.env.TELNYX_API_KEY
  delete process.env.TELNYX_PHONE
})

describe('payment-processor — duplicate manual payment confirmation does not double-pay the cleaner', () => {
  it('two processPayment() calls for the same booking pass the same idempotencyKey and the second is a no-op transfer', async () => {
    const first = await processPayment({
      tenant: TENANT,
      bookingId: BOOKING_ID,
      clientId: 'client_1',
      method: 'zelle',
      amountCents: 13800,
      referenceId: 'ref_1',
    })
    const second = await processPayment({
      tenant: TENANT,
      bookingId: BOOKING_ID,
      clientId: 'client_1',
      method: 'zelle',
      amountCents: 13800,
      referenceId: 'ref_2', // e.g. duplicate admin confirm with a different reference
    })

    expect(first?.status).toBe('paid')
    expect(second?.status).toBe('paid')

    // transfers.create was invoked twice at the application layer...
    expect(transfersCreate).toHaveBeenCalledTimes(2)
    const [, firstOptions] = transfersCreate.mock.calls[0]
    const [, secondOptions] = transfersCreate.mock.calls[1]
    expect(firstOptions).toEqual({ idempotencyKey: `payout-${BOOKING_ID}` })
    expect(secondOptions).toEqual({ idempotencyKey: `payout-${BOOKING_ID}` })

    // ...but only ONE real transfer was ever created — the second call is a
    // no-op replay, and both calls resolve to the identical transfer id.
    expect(realTransferCount).toBe(1)
    expect(first?.cleanerPaidCents).toBe(second?.cleanerPaidCents)

    // Same guarantee for the instant payout leg: both calls pass the SAME
    // payout-instant-<bookingId> key, and only one real instant payout is minted.
    expect(payoutsCreate).toHaveBeenCalledTimes(2)
    const [, firstPayoutOptions] = payoutsCreate.mock.calls[0]
    const [, secondPayoutOptions] = payoutsCreate.mock.calls[1]
    expect(firstPayoutOptions).toEqual({ stripeAccount: 'acct_tm_1', idempotencyKey: `payout-instant-${BOOKING_ID}` })
    expect(secondPayoutOptions).toEqual({ stripeAccount: 'acct_tm_1', idempotencyKey: `payout-instant-${BOOKING_ID}` })
    expect(realPayoutCount).toBe(1)
  })
})
