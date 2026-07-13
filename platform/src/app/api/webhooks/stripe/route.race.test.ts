/**
 * STRIPE WEBHOOK MONEY-RACE — booking-payment + quote-deposit + invoice-payment
 * atomic claims.
 *
 * LEADER finding (2026-07-13): Stripe retries webhook deliveries on
 * timeout/5xx, so concurrent/duplicate deliveries for the same
 * `checkout.session.completed` event are routine, not an edge case. Three
 * call sites in this handler decided "have we processed this?" with a
 * select-then-branch that leaves a gap for both deliveries to pass:
 *
 *   1. Booking-payment path — `payments.stripe_session_id` was checked with
 *      a pre-`select`, then written with a plain `insert` whose error was
 *      never checked. A concurrent delivery's insert *does* fail on the
 *      existing UNIQUE constraint, but the code fell straight through to
 *      the cleaner Stripe Connect payout regardless — a real double-pay.
 *   2. Quote-deposit path — `quotes.deposit_paid_at` was read, checked, and
 *      only written later; two deliveries could both read null and both
 *      post the deposit to the ledger / advance the deal.
 *   3. Invoice-payment path — same shape as (1): a pre-`select` on
 *      `payments.stripe_session_id` followed by an unchecked `insert`. A
 *      concurrent delivery could double-insert the payment row, which
 *      double-credits `invoice.amount_paid_cents` via the DB trigger.
 *
 * All three are now atomic: the payment inserts (1, 3) ARE the claim
 * (23505 = idempotent, returned before any side effect), and the deposit
 * UPDATE (2) only succeeds `WHERE deposit_paid_at IS NULL`. This suite
 * drives the real POST handler with two concurrent/retried deliveries for
 * the same session and proves each path processes exactly once.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

// Fire-and-forget side effects — stubbed so the test only exercises the
// atomic-claim logic, not ledger/SMS/email internals.
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger: vi.fn().mockResolvedValue(undefined),
  postRefundToLedger: vi.fn().mockResolvedValue(undefined),
  postChargebackToLedger: vi.fn().mockResolvedValue(undefined),
  tenantFromPaymentIntent: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn().mockResolvedValue(undefined) }))

const transfersCreate = vi.fn().mockResolvedValue({ id: 'tr_test' })
const payoutsCreate = vi.fn().mockResolvedValue({ id: 'po_test' })
let constructEventImpl: (body: string) => unknown = () => { throw new Error('no event configured') }

vi.mock('stripe', () => {
  class FakeStripe {
    webhooks = { constructEvent: (body: string) => constructEventImpl(body) }
    transfers = { create: transfersCreate }
    payouts = { create: payoutsCreate }
    customers = { retrieve: vi.fn() }
  }
  return { default: FakeStripe }
})

process.env.STRIPE_SECRET_KEY = 'sk_test_x'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const SESSION_ID = 'cs_test_session_1'

function postCheckoutCompleted(session: Row) {
  constructEventImpl = () => ({ type: 'checkout.session.completed', data: { object: session } })
  return POST(new Request('https://x.test/api/webhooks/stripe', {
    method: 'POST',
    body: JSON.stringify({}), // body content is irrelevant — constructEvent is stubbed
    headers: { 'stripe-signature': 'sig' },
  }))
}

beforeEach(() => {
  fake._store.clear()
  transfersCreate.mockClear()
  payoutsCreate.mockClear()
  // Real schema: payments.stripe_session_id TEXT UNIQUE
  // (011_parity_with_nycmaid.sql:85) — register it so the fake enforces the
  // same constraint the atomic-insert-as-claim fix relies on.
  fake._addUniqueConstraint('payments', 'stripe_session_id')
})

describe('booking-payment path — payments.stripe_session_id atomic claim', () => {
  const BOOKING_ID = 'booking-1'
  const TEAM_MEMBER_ID = 'tm-1'

  function seed() {
    fake._seed('bookings', [
      {
        id: BOOKING_ID,
        tenant_id: TENANT_ID,
        client_id: 'client-1',
        team_member_id: TEAM_MEMBER_ID,
        hourly_rate: 50,
        pay_rate: 25,
        team_member_pay: null,
        actual_hours: 2,
        price: 10_000,
        team_members: { name: 'Cleaner', phone: null, pay_rate: 25, stripe_account_id: 'acct_cleaner', preferred_language: 'en' },
        clients: { name: 'Client', phone: null, address: null },
        tenants: { name: 'Tenant', telnyx_api_key: null, telnyx_phone: null },
      },
    ])
  }

  const session = {
    id: SESSION_ID,
    amount_total: 10_000,
    metadata: { booking_id: BOOKING_ID, tenant_id: TENANT_ID },
    client_reference_id: null,
    customer_details: null,
    payment_intent: 'pi_test_1',
  } as unknown as Row

  it('two concurrent deliveries for the same session insert exactly one payment row and transfer the cleaner exactly once', async () => {
    seed()
    const [r1, r2] = await Promise.all([postCheckoutCompleted(session), postCheckoutCompleted(session)])
    const [b1, b2] = await Promise.all([r1.json(), r2.json()])

    const payments = fake._all('payments')
    expect(payments.length).toBe(1)
    expect(payments[0].stripe_session_id).toBe(SESSION_ID)

    // Exactly one delivery reaches the payout section — the loser returns
    // idempotent before it ever calls stripe.transfers.create.
    expect(transfersCreate).toHaveBeenCalledTimes(1)
    const [, transferOpts] = transfersCreate.mock.calls[0]
    expect(transferOpts.idempotencyKey).toBe(`cleaner-payout:${BOOKING_ID}:${SESSION_ID}`)

    const outcomes = [b1, b2]
    expect(outcomes.filter((o) => o.idempotent === true).length).toBe(1)
    expect(outcomes.some((o) => o.received === true && !o.idempotent)).toBe(true)
  })

  it('a sequential retry after the first delivery lands is idempotent (no second payment, no second transfer)', async () => {
    seed()
    await postCheckoutCompleted(session)
    expect(fake._all('payments').length).toBe(1)
    expect(transfersCreate).toHaveBeenCalledTimes(1)

    const retry = await postCheckoutCompleted(session)
    const retryBody = await retry.json()
    expect(retryBody).toEqual({ received: true, idempotent: true })
    expect(fake._all('payments').length).toBe(1)
    expect(transfersCreate).toHaveBeenCalledTimes(1)
  })
})

describe('quote-deposit path — quotes.deposit_paid_at atomic claim', () => {
  const QUOTE_ID = 'quote-1'
  const DEAL_ID = 'deal-1'

  function seed() {
    fake._seed('quotes', [
      {
        id: QUOTE_ID,
        tenant_id: TENANT_ID,
        status: 'accepted',
        deal_id: DEAL_ID,
        deposit_paid_at: null,
        deposit_paid_cents: null,
        deposit_session_id: null,
        deposit_cents: 5_000,
        quote_number: 'Q-1',
        converted_job_id: null,
        converted_at: null,
        total_cents: 20_000,
        client_id: 'client-1',
        title: 'Deposit Quote',
      },
    ])
    fake._seed('deals', [{ id: DEAL_ID, tenant_id: TENANT_ID, stage: 'quoted' }])
  }

  const session = {
    id: SESSION_ID,
    amount_total: 5_000,
    metadata: { quote_deposit: 'true', quote_id: QUOTE_ID, tenant_id: TENANT_ID },
    client_reference_id: null,
    customer_details: null,
    payment_intent: 'pi_test_2',
  } as unknown as Row

  it('two concurrent deliveries post the deposit exactly once', async () => {
    seed()
    const [r1, r2] = await Promise.all([postCheckoutCompleted(session), postCheckoutCompleted(session)])
    const [b1, b2] = await Promise.all([r1.json(), r2.json()])

    const quoteRow = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteRow?.deposit_paid_at).toBeTruthy()
    expect(quoteRow?.deposit_paid_cents).toBe(5_000)

    const outcomes = [b1, b2]
    expect(outcomes.filter((o) => o.idempotent === true).length).toBe(1)
    expect(outcomes.some((o) => o.quote_deposit_paid === true)).toBe(true)

    // Deal only advances to sold once — a second post-to-ledger/deal-advance
    // would show up as a second stage_change activity row.
    const stageChanges = fake._all('deal_activities').filter((a) => a.type === 'stage_change')
    expect(stageChanges.length).toBe(1)

    // The deposit-to-job conversion only runs for the winning delivery.
    expect(fake._all('jobs').length).toBe(1)
  })

  it('a sequential retry after the first delivery lands is idempotent (deposit not double-posted)', async () => {
    seed()
    await postCheckoutCompleted(session)
    const quoteAfterFirst = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteAfterFirst?.deposit_paid_at).toBeTruthy()

    const retry = await postCheckoutCompleted(session)
    const retryBody = await retry.json()
    expect(retryBody).toEqual({ received: true, idempotent: true })

    const stageChanges = fake._all('deal_activities').filter((a) => a.type === 'stage_change')
    expect(stageChanges.length).toBe(1)
    expect(fake._all('jobs').length).toBe(1)
  })
})

describe('invoice-payment path — payments.stripe_session_id atomic claim', () => {
  const INVOICE_ID = 'invoice-1'

  const session = {
    id: SESSION_ID,
    amount_total: 7_500,
    metadata: { invoice_id: INVOICE_ID, tenant_id: TENANT_ID },
    client_reference_id: null,
    customer_details: null,
    payment_intent: 'pi_test_3',
  } as unknown as Row

  it('two concurrent deliveries for the same session insert exactly one invoice payment row', async () => {
    const [r1, r2] = await Promise.all([postCheckoutCompleted(session), postCheckoutCompleted(session)])
    const [b1, b2] = await Promise.all([r1.json(), r2.json()])

    const payments = fake._all('payments')
    expect(payments.length).toBe(1)
    expect(payments[0].stripe_session_id).toBe(SESSION_ID)
    expect(payments[0].invoice_id).toBe(INVOICE_ID)

    const outcomes = [b1, b2]
    expect(outcomes.filter((o) => o.idempotent === true).length).toBe(1)
    expect(outcomes.some((o) => o.invoice_paid === true)).toBe(true)
  })

  it('a sequential retry after the first delivery lands is idempotent (no second payment)', async () => {
    await postCheckoutCompleted(session)
    expect(fake._all('payments').length).toBe(1)

    const retry = await postCheckoutCompleted(session)
    const retryBody = await retry.json()
    expect(retryBody).toEqual({ received: true, idempotent: true })
    expect(fake._all('payments').length).toBe(1)
  })
})
