import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Double-payout regression for the booking-payment branch of
 * checkout.session.completed. The route's idempotency guard was a plain
 * SELECT-then-INSERT on payments.stripe_session_id: two concurrent webhook
 * deliveries for the same session can both pass the SELECT (neither sees the
 * other's row yet) before either INSERT commits. The loser's INSERT then
 * hits the table's real UNIQUE(stripe_session_id) constraint -- but the route
 * never checked the insert error, so it fell straight through to step 4
 * (auto-pay the cleaner via a real Stripe transfer) a SECOND time for the
 * same charge. Fix: check the insert error; a 23505 (unique violation) means
 * another delivery already claimed this session, so stop before the payout.
 *
 * This test forces that exact insert-time rejection (independent of what the
 * idempotency SELECT sees, which is how the real race manifests) and asserts
 * the route stops cold -- no Stripe transfer, no instant payout, no payout
 * ledger row.
 */

const TENANT = 'tenant-a'
const BOOKING = 'booking-1'

const transfersCreate = vi.fn(async () => ({ id: 'tr_should_never_happen' }))
const payoutsCreate = vi.fn(async () => ({ id: 'po_should_never_happen' }))

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
    transfers = { create: transfersCreate }
    payouts = { create: payoutsCreate }
  }
  return { default: MockStripe }
})

const payoutInsert = vi.fn(async () => ({ data: { id: 'payout-row' }, error: null }))

function chain(table: string) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    limit: () => c,
    // Idempotency SELECT: simulate the race window where this delivery's
    // read genuinely sees nothing yet (the other transaction hasn't
    // committed from this reader's point of view).
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: [], error: null }),
    insert: (row: Record<string, unknown>) => {
      if (table === 'payments') {
        return {
          select: () => ({
            single: async () => ({
              data: null,
              error: { code: '23505', message: 'duplicate key value violates unique constraint "payments_stripe_session_id_key"' },
            }),
          }),
        }
      }
      if (table === 'team_member_payouts') {
        return { select: () => ({ single: payoutInsert }) }
      }
      return { select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) }
    },
    update: () => c,
    single: async () => {
      if (table === 'bookings') {
        return {
          data: {
            id: BOOKING,
            client_id: 'client-1',
            team_member_id: 'tm-1',
            hourly_rate: 69,
            pay_rate: 25,
            team_member_pay: null,
            actual_hours: 2,
            price: null,
            team_members: { name: 'Cleaner', phone: '+15551230000', pay_rate: 25, stripe_account_id: 'acct_cleaner', preferred_language: 'en' },
            clients: { name: 'Victim Client', phone: '+15559990000', address: '123 Main St' },
            tenants: { name: 'Acme', telnyx_api_key: null, telnyx_phone: null },
          },
          error: null,
        }
      }
      return { data: null, error: null }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger: vi.fn(async () => ({ posted: true })),
  postRefundToLedger: vi.fn(async () => ({ posted: true })),
  postChargebackToLedger: vi.fn(async () => ({ posted: true })),
  tenantFromPaymentIntent: vi.fn(async () => null),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false, NYCMAID_TENANT_ID: 'nycmaid' }))

import { POST } from './route'

function paidEvent() {
  const session = {
    id: 'cs_race_1',
    amount_total: 13800,
    payment_intent: 'pi_race_1',
    client_reference_id: null,
    customer_details: {},
    metadata: { booking_id: BOOKING, tenant_id: TENANT },
  }
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: session } }),
  })
}

beforeEach(() => {
  transfersCreate.mockClear()
  payoutsCreate.mockClear()
  payoutInsert.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
})

describe('POST /api/webhooks/stripe — booking payment insert race', () => {
  it('stops before paying the cleaner when the payments insert hits the unique-constraint (duplicate) error', async () => {
    const res = await POST(paidEvent())
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ received: true, idempotent: true })

    // The whole point of the fix: no double Stripe transfer, no instant
    // payout, no payout ledger row, when the insert says "already claimed".
    expect(transfersCreate).not.toHaveBeenCalled()
    expect(payoutsCreate).not.toHaveBeenCalled()
    expect(payoutInsert).not.toHaveBeenCalled()
  })
})
