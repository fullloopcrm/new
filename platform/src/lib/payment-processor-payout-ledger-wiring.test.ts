/**
 * payment-processor.ts `processPayment` — the REAL postPayoutToLedger wiring +
 * the instant-payout-fallback branch (P1/W1 queue item c: flagged-but-untested
 * edge, sibling to payment-processor-revenue-wiring.test.ts which did the same
 * for postPaymentRevenue).
 *
 * payment-processor-payout.test.ts pins the payout MATH but stubs
 * stripe.payouts.create to always succeed and postPayoutToLedger as a blanket
 * no-op — it never asserts the wiring itself. Two real gaps closed here:
 *
 *   1. Instant-payout fallback (lines 251-260): `stripe.payouts.create(...,
 *      { method: 'instant' })` is wrapped in its own try/catch — if the
 *      cleaner's Connect account can't receive an instant payout, the error is
 *      swallowed and the transfer still completes on Stripe's standard
 *      schedule (isInstant=false, payoutId=null). A missing catch here would
 *      crash the whole payment flow over a non-fatal Stripe capability gap.
 *   2. postPayoutToLedger({ tenantId, payoutId }) is called fire-and-forget
 *      (line 282-284) with the REAL just-inserted team_member_payouts row id,
 *      and a rejection is swallowed by its own .catch(), only logging —
 *      exactly the postPaymentRevenue contract, on the payout side.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { tenant, seedBooking } from '@/test/payment-processor-fixtures'
import { makeStripePayoutSpies } from '@/test/stripe-payout-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const postPayoutToLedger = vi.hoisted(() => vi.fn())

const stripeCalls = makeStripePayoutSpies()

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger }))
vi.mock('stripe', () => ({
  default: class {
    transfers = { create: stripeCalls.transfers }
    payouts = { create: stripeCalls.payouts }
  },
}))

import { processPayment } from './payment-processor'

function pay(bookingId: string, amountCents: number) {
  return processPayment({
    tenant, bookingId, clientId: 'client-1', method: 'zelle', amountCents, referenceId: `ref-${bookingId}`,
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [], payments: [], team_member_payouts: [], clients: [] }
  stripeCalls.transfers.mockClear()
  stripeCalls.transfers.mockImplementation((args: Record<string, unknown>) => Promise.resolve({ id: 'tr_1', ...args }))
  stripeCalls.payouts.mockClear()
  stripeCalls.payouts.mockImplementation(() => Promise.resolve({ id: 'po_1' }))
  postPayoutToLedger.mockReset()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('processPayment — instant-payout fallback', () => {
  it('instant payout succeeds: row records instant=true + the real Stripe payout id', async () => {
    seedBooking(h, 'bkA', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: 'acct_1' } })
    const r = await pay('bkA', 10000)
    expect(r?.status).toBe('paid')
    expect(stripeCalls.payouts).toHaveBeenCalledTimes(1)
    expect(h.store.team_member_payouts[0]).toMatchObject({ instant: true, stripe_payout_id: 'po_1', status: 'transferred' })
  })

  it('instant payout REJECTS: swallowed, transfer still completes, row falls back to instant=false/payout_id=null', async () => {
    stripeCalls.payouts.mockRejectedValueOnce(new Error('instant_payouts_unsupported'))
    postPayoutToLedger.mockResolvedValue(undefined)
    seedBooking(h, 'bkB', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: 'acct_1' } })
    const r = await pay('bkB', 10000)
    // The transfer (the actual money movement) still succeeds and the booking
    // still ends up paid — only the "instant" cadence request failed.
    expect(r?.status).toBe('paid')
    expect(r?.cleanerPaidCents).toBe(8000)
    expect(stripeCalls.transfers).toHaveBeenCalledTimes(1)
    expect(h.store.team_member_payouts[0]).toMatchObject({ instant: false, stripe_payout_id: null, status: 'transferred' })
  })
})

describe('processPayment — real postPayoutToLedger wiring (not a mocked no-op)', () => {
  it('calls postPayoutToLedger with the tenant + the REAL inserted team_member_payouts row id', async () => {
    postPayoutToLedger.mockResolvedValue(undefined)
    seedBooking(h, 'bkC', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: 'acct_1' } })
    const r = await pay('bkC', 10000)
    expect(r?.status).toBe('paid')
    expect(postPayoutToLedger).toHaveBeenCalledTimes(1)
    const call = postPayoutToLedger.mock.calls[0][0] as { tenantId: string; payoutId: string }
    expect(call.tenantId).toBe('tenant-pp')
    expect(call.payoutId).toMatch(/^team_member_payouts-\d+$/)
    const insertedPayout = h.store.team_member_payouts.find((p) => p.id === call.payoutId)
    expect(insertedPayout).toBeTruthy()
  })

  it('is fire-and-forget — processPayment resolves while postPayoutToLedger is still pending', async () => {
    postPayoutToLedger.mockReturnValue(new Promise<void>(() => {}))
    seedBooking(h, 'bkD', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: 'acct_1' } })
    const r = await pay('bkD', 10000)
    expect(r?.status).toBe('paid')
    expect(postPayoutToLedger).toHaveBeenCalledTimes(1)
  })

  it('swallows a postPayoutToLedger rejection — never surfaces to the caller, only logs', async () => {
    postPayoutToLedger.mockRejectedValue(new Error('ledger down'))
    seedBooking(h, 'bkE', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: 'acct_1' } })
    await expect(pay('bkE', 10000)).resolves.toMatchObject({ status: 'paid' })
    await Promise.resolve()
    await Promise.resolve()
    expect(console.error).toHaveBeenCalledWith('[payment-processor] payout ledger post failed:', expect.any(Error))
  })

  it('is NEVER called when the cleaner has no Stripe account (no payout row is created)', async () => {
    seedBooking(h, 'bkF', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: null } })
    const r = await pay('bkF', 10000)
    expect(r?.status).toBe('paid')
    expect(postPayoutToLedger).not.toHaveBeenCalled()
    expect(h.store.team_member_payouts).toHaveLength(0)
  })
})
