/**
 * Stripe webhook — checkout.session.completed race-condition guards (P1/W1).
 *
 * Two idempotency gaps found in a fresh broad-hunt pass, distinct from the
 * already-covered sequential-replay case in signature-verification-and-idempotency.test.ts:
 *
 * 1. Booking-payment path (route.ts step 1): `payments.stripe_session_id` is
 *    UNIQUE at the DB level, so it's the REAL idempotency claim — the earlier
 *    "existing" SELECT is only a fast-path. Stripe delivers at-least-once and
 *    retries on slow/failed responses, so two deliveries for the same session
 *    can both pass the SELECT (race window) before either INSERT commits; the
 *    loser's INSERT then fails the UNIQUE constraint. Pre-fix code never
 *    checked the insert's error/data, so it fell through to step 4 and fired a
 *    REAL (non-idempotent) Stripe Connect transfer to the cleaner a second
 *    time — an actual double payout, not just a double DB write.
 *
 * 2. Quote-deposit path (route.ts quote_deposit branch): read `deposit_paid_at`,
 *    then a plain (non-conditional) UPDATE — not atomic. A same race lets two
 *    deliveries both pass the read, then both write, double-advancing the deal
 *    stage, double-inserting deal_activities notes, and double-firing the
 *    owner alert (SMS/email). Fixed with the same compare-and-swap pattern
 *    already used one branch up for the prospect-signup claim: the UPDATE
 *    itself carries a `deposit_paid_at IS NULL` guard, so only one delivery's
 *    write actually matches a row.
 *
 * Both are modeled here by forcing the SPECIFIC racy call (the payments
 * INSERT / the quotes CAS UPDATE) to report "someone else already claimed
 * this" regardless of the fake store's content — the real race is a genuine
 * DB-level concurrency event a sequential in-memory fake can't reproduce by
 * itself, so the store state alone (e.g. pre-seeding a duplicate row) would
 * get caught by the earlier fast-path SELECT and never reach the code under
 * test. This isolates exactly the two guards this fix added.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import type { FakeStoreHandle } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const raceCtl = vi.hoisted(() => ({ forceBookingPaymentInsertFailure: false, forceDepositClaimLoss: false }))
const stripeCtl = vi.hoisted(() => ({ current: null as unknown, transfersCreate: vi.fn() }))

const postPaymentRevenue = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const postPayoutToLedger = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const postDepositToLedger = vi.hoisted(() => vi.fn(() => Promise.resolve({ posted: true })))
const postRefundToLedger = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const postChargebackToLedger = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const tenantFromPaymentIntent = vi.hoisted(() => vi.fn(() => Promise.resolve(null)))
const sendSMS = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const smsAdmins = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const nmSmsAdmins = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const convertSaleToJob = vi.hoisted(() => vi.fn(() => Promise.resolve({ job_id: 'job_1', already_converted: false })))
const ownerAlert = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))

/**
 * Wraps the shared ledger fake so the ONE racy call in each path can be told
 * "you lost the race" independent of what's actually in the in-memory store —
 * mutating the returned chain object in place (not spreading a copy) because
 * `.eq()`/`.is()` close over and return the SAME chain reference; a copy's
 * override would be dropped the moment the route code chains another filter.
 */
function makeRacySupabase(handle: FakeStoreHandle) {
  const base = makeLedgerSupabaseFake(handle)
  return {
    ...base,
    from(table: string) {
      const chain = base.from(table) as Record<string, unknown> & {
        insert: (p: unknown) => Record<string, unknown>
        update: (p: unknown) => Record<string, unknown>
      }
      if (table === 'payments') {
        const originalInsert = chain.insert
        chain.insert = (p: unknown) => {
          const c = originalInsert(p) as Record<string, unknown> & { single: () => Promise<unknown> }
          if (raceCtl.forceBookingPaymentInsertFailure) {
            c.single = () =>
              Promise.resolve({
                data: null,
                error: { code: '23505', message: 'duplicate key value violates unique constraint "payments_stripe_session_id_key"' },
              })
          }
          return c
        }
      }
      if (table === 'quotes') {
        const originalUpdate = chain.update
        chain.update = (p: unknown) => {
          const c = originalUpdate(p) as Record<string, unknown> & { maybeSingle: () => Promise<unknown> }
          if (raceCtl.forceDepositClaimLoss) {
            c.maybeSingle = () => Promise.resolve({ data: null, error: null })
          }
          return c
        }
      }
      return chain
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeRacySupabase(h), supabase: makeRacySupabase(h) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger, postRefundToLedger, postChargebackToLedger, tenantFromPaymentIntent,
}))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: nmSmsAdmins }))
vi.mock('@/lib/jobs', () => ({ convertSaleToJob }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))
vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: () => stripeCtl.current }
    transfers = { create: stripeCtl.transfersCreate }
    payouts = { create: vi.fn(() => Promise.resolve(undefined)) }
  },
}))

import { POST as stripeWebhook } from './route'

function post() {
  return stripeWebhook(
    new Request('http://acme.example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=sig' },
      body: JSON.stringify({ id: 'evt_1' }),
    }),
  )
}

const TENANT = 'tenant-A'

beforeEach(() => {
  h.seq = 0
  h.store = { payments: [], bookings: [], quotes: [], deals: [], deal_activities: [], notifications: [], admin_tasks: [], team_member_payouts: [] }
  raceCtl.forceBookingPaymentInsertFailure = false
  raceCtl.forceDepositClaimLoss = false
  stripeCtl.current = null
  stripeCtl.transfersCreate = vi.fn(() => Promise.resolve({ id: 'tr_1' }))
  for (const fn of [postPaymentRevenue, postPayoutToLedger, postDepositToLedger, postRefundToLedger, postChargebackToLedger, tenantFromPaymentIntent, sendSMS, smsAdmins, nmSmsAdmins, convertSaleToJob, ownerAlert]) fn.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('booking-payment race: losing INSERT must not still pay the cleaner', () => {
  function bookingSessionEvent(sessionId: string) {
    return {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          amount_total: 10000,
          payment_intent: 'pi_1',
          metadata: { tenant_id: TENANT, booking_id: 'bk_1' },
        },
      },
    }
  }

  beforeEach(() => {
    h.store.bookings = [{
      id: 'bk_1',
      tenant_id: TENANT,
      client_id: 'client_1',
      team_member_id: 'tm_1',
      hourly_rate: 50,
      pay_rate: null,
      team_member_pay: null,
      actual_hours: 2,
      price: 10000,
      team_members: { name: 'Cleaner', phone: '+15551234567', pay_rate: 25, stripe_account_id: 'acct_123', preferred_language: 'en' },
      clients: { name: 'Client', phone: '+15559876543', address: '123 Main St' },
      tenants: { name: 'Acme', telnyx_api_key: null, telnyx_phone: null },
    }]
  })

  it('happy path (no race): pays once, posts revenue once, transfers once', async () => {
    stripeCtl.current = bookingSessionEvent('cs_ok_1')
    const res = await post()
    expect(res.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)
    expect(stripeCtl.transfersCreate).toHaveBeenCalledTimes(1)
  })

  it('losing delivery (INSERT fails the stripe_session_id UNIQUE constraint) returns idempotent and fires ZERO side effects', async () => {
    stripeCtl.current = bookingSessionEvent('cs_race_1')
    raceCtl.forceBookingPaymentInsertFailure = true

    const res = await post()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true, idempotent: true })
    // The core assertion: a losing delivery must NEVER re-fire the real
    // Stripe Connect transfer — that's an actual double payout, not a DB dupe.
    expect(stripeCtl.transfersCreate).not.toHaveBeenCalled()
    expect(postPaymentRevenue).not.toHaveBeenCalled()
    expect(postPayoutToLedger).not.toHaveBeenCalled()
    expect(smsAdmins).not.toHaveBeenCalled()
    expect(h.store.notifications).toHaveLength(0)
    expect(h.store.team_member_payouts).toHaveLength(0)
  })
})

describe('quote-deposit race: a losing UPDATE must not double-advance the deal or double-alert the owner', () => {
  function depositSessionEvent(sessionId: string) {
    return {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          amount_total: 5000,
          payment_intent: 'pi_2',
          metadata: { tenant_id: TENANT, quote_deposit: 'true', quote_id: 'q_1' },
        },
      },
    }
  }

  beforeEach(() => {
    h.store.quotes = [{
      id: 'q_1', tenant_id: TENANT, deal_id: 'deal_1', deposit_paid_at: null, deposit_cents: 5000, quote_number: 'Q-1001',
    }]
    h.store.deals = [{ id: 'deal_1', tenant_id: TENANT, stage: 'quoted' }]
  })

  it('happy path (no race): advances the deal + alerts the owner exactly once', async () => {
    stripeCtl.current = depositSessionEvent('cs_dep_ok')
    const res = await post()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true, quote_deposit_paid: true })
    expect(h.store.quotes[0].deposit_paid_at).not.toBeNull()
    expect(h.store.deals[0].stage).toBe('sold')
    expect(h.store.deal_activities).toHaveLength(2)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
    expect(convertSaleToJob).toHaveBeenCalledTimes(1)
  })

  it('losing delivery (CAS UPDATE matches 0 rows) returns idempotent and fires ZERO side effects', async () => {
    stripeCtl.current = depositSessionEvent('cs_dep_race')
    raceCtl.forceDepositClaimLoss = true

    const res = await post()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true, idempotent: true })
    // The deal must NOT be double-advanced and the owner must NOT be double-alerted.
    expect(h.store.deals[0].stage).toBe('quoted')
    expect(h.store.deal_activities).toHaveLength(0)
    expect(ownerAlert).not.toHaveBeenCalled()
    expect(convertSaleToJob).not.toHaveBeenCalled()
    expect(postDepositToLedger).not.toHaveBeenCalled()
  })
})
