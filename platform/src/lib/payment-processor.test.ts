/**
 * MISSING-IDEMPOTENCY-KEY fix — processPayment() cleaner transfer/payout.
 *
 * LEADER finding (2026-07-13): the equivalent transfer/payout call in
 * webhooks/stripe/route.ts passes an idempotencyKey (`cleaner-payout:<booking>:<session>`)
 * specifically so a retried delivery can't double-pay the cleaner. This
 * standalone payment path (team-portal checkout report + finalize-match
 * reconciliation) called the same Stripe APIs with NO idempotency key at
 * all — a double-tap on "Check Out" (or any retry) fires processPayment()
 * twice, each hitting stripe.transfers.create/payouts.create with identical
 * amounts, paying the cleaner twice. Fixed by keying on bookingId+referenceId
 * (the caller-supplied stable dedupe value), mirroring the webhook path.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('./supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('./sms', () => ({ sendSMS: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('./finance/post-revenue', () => ({ postPaymentRevenue: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./finance/post-labor', () => ({ postPayoutToLedger: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./nycmaid/tenant', () => ({ isNycMaid: () => false }))

const transfersCreate = vi.fn().mockResolvedValue({ id: 'tr_test' })
const payoutsCreate = vi.fn().mockResolvedValue({ id: 'po_test' })

vi.mock('stripe', () => {
  class FakeStripe {
    transfers = { create: transfersCreate }
    payouts = { create: payoutsCreate }
  }
  return { default: FakeStripe }
})

process.env.STRIPE_SECRET_KEY = 'sk_test_x'

import { supabaseAdmin } from './supabase'
import { processPayment } from './payment-processor'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const BOOKING_ID = 'booking-1'
const TEAM_MEMBER_ID = 'tm-1'
const CLIENT_ID = 'client-1'
const REFERENCE_ID = 'cleaner-checkout-booking-1'

function seed() {
  fake._seed('bookings', [
    {
      id: BOOKING_ID,
      tenant_id: TENANT_ID,
      team_member_id: TEAM_MEMBER_ID,
      client_id: CLIENT_ID,
      team_member_pay: null,
      actual_hours: 2,
      hourly_rate: 50,
      pay_rate: 25,
      price: 10_000,
      check_in_time: null,
      start_time: null,
      clients: { name: 'Client', phone: null, address: null },
      team_members: {
        name: 'Cleaner',
        phone: null,
        sms_consent: false,
        stripe_account_id: 'acct_cleaner',
        hourly_rate: 25,
        pay_rate: 25,
        preferred_language: 'en',
      },
    },
  ])
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, phone: null }])
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Tenant', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null },
  ])
}

beforeEach(() => {
  fake._store.clear()
  transfersCreate.mockClear()
  payoutsCreate.mockClear()
})

describe('processPayment cleaner transfer/payout idempotency', () => {
  it('passes a stable idempotencyKey (booking+referenceId) on the transfer and instant payout', async () => {
    seed()
    await processPayment({
      tenant: { id: TENANT_ID },
      bookingId: BOOKING_ID,
      clientId: CLIENT_ID,
      method: 'cash',
      amountCents: 10_000,
      referenceId: REFERENCE_ID,
    })

    expect(transfersCreate).toHaveBeenCalledTimes(1)
    const [, transferOpts] = transfersCreate.mock.calls[0]
    expect(transferOpts.idempotencyKey).toBe(`cleaner-payout:${BOOKING_ID}:${REFERENCE_ID}`)

    expect(payoutsCreate).toHaveBeenCalledTimes(1)
    const [, payoutOpts] = payoutsCreate.mock.calls[0]
    expect(payoutOpts.idempotencyKey).toBe(`cleaner-instant-payout:${BOOKING_ID}:${REFERENCE_ID}`)
  })

  it('a retried call with the same bookingId+referenceId reuses the same idempotencyKey (Stripe would dedupe it)', async () => {
    seed()
    await processPayment({
      tenant: { id: TENANT_ID },
      bookingId: BOOKING_ID,
      clientId: CLIENT_ID,
      method: 'cash',
      amountCents: 10_000,
      referenceId: REFERENCE_ID,
    })
    const firstKey = transfersCreate.mock.calls[0][1].idempotencyKey

    // Simulate the same logical retry (double-tap checkout) — same booking,
    // same caller-supplied referenceId.
    await processPayment({
      tenant: { id: TENANT_ID },
      bookingId: BOOKING_ID,
      clientId: CLIENT_ID,
      method: 'cash',
      amountCents: 10_000,
      referenceId: REFERENCE_ID,
    })
    const secondKey = transfersCreate.mock.calls[1][1].idempotencyKey

    expect(secondKey).toBe(firstKey)
  })
})

describe('processPayment — clientId FK-injection', () => {
  // admin/payments/finalize-match is gated by a single INTERNAL_API_KEY that
  // is global across ALL tenants and passes a raw caller-supplied clientId
  // straight through to processPayment — a leaked/misused key (or a buggy
  // automated caller) could otherwise attribute a payment to an unowned or
  // cross-tenant client id. clientId must come from the tenant-verified
  // booking row, never from the caller.
  it('a forged clientId in the input never lands on the payments row — booking.client_id wins', async () => {
    seed()
    await processPayment({
      tenant: { id: TENANT_ID },
      bookingId: BOOKING_ID,
      clientId: 'client-FORGED', // attacker/bug-supplied, does not own this booking
      method: 'zelle',
      amountCents: 10_000,
      referenceId: REFERENCE_ID,
    })

    const payments = fake._store.get('payments') || []
    expect(payments).toHaveLength(1)
    expect(payments[0].client_id).toBe(CLIENT_ID)
    expect(payments[0].client_id).not.toBe('client-FORGED')
  })
})
