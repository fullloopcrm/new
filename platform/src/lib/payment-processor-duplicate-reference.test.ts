/**
 * payment-processor.ts `processPayment` — duplicate reference_id idempotency.
 *
 * processPayment() summed prior payments then INSERTed a new row with no DB
 * constraint backing (tenant_id, booking_id, reference_id) at all. Two
 * concurrent calls carrying the SAME reference_id -- a double-tapped checkout
 * button (team-portal/checkout uses a deterministic
 * `cleaner-checkout-${bookingId}` ref), a client retry after a timeout, or a
 * redelivered admin/payments/finalize-match reconciliation request -- both
 * read the same prior-payments sum before either insert commits: double
 * revenue posted to the ledger AND a duplicate team_member_payouts row.
 *
 * Fix: migration 065_unique_payments_reference.sql adds a partial unique index
 * on payments(tenant_id, booking_id, reference_id) WHERE reference_id IS NOT
 * NULL; processPayment() now catches 23505 on the insert and returns an
 * idempotent no-op (skips ledger post, Stripe transfer, payout row, all SMS)
 * instead of proceeding. The shared ledger-supabase-fake now simulates that
 * same 23505 for a genuine duplicate insert on `payments`, so this test drives
 * the REAL processPayment rather than mocking the error at the call site.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { tenant, seedBooking } from '@/test/payment-processor-fixtures'
import { makeStripePayoutSpies } from '@/test/stripe-payout-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

const stripeCalls = makeStripePayoutSpies()

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(() => Promise.resolve()) }))
vi.mock('stripe', () => ({
  default: class {
    transfers = { create: stripeCalls.transfers }
    payouts = { create: stripeCalls.payouts }
  },
}))

import { processPayment } from './payment-processor'

function pay(bookingId: string, amountCents: number, referenceId: string) {
  return processPayment({ tenant, bookingId, clientId: 'client-1', method: 'zelle', amountCents, referenceId })
}

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [], payments: [], admin_tasks: [], clients: [], team_member_payouts: [] }
  stripeCalls.transfers.mockClear()
  stripeCalls.payouts.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('processPayment — duplicate reference_id idempotency', () => {
  it('a 2nd call with the SAME reference_id does not double the payments/payout/ledger rows', async () => {
    seedBooking(h, 'bk1', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: 'acct_1', pay_rate: 20 } })

    const first = await pay('bk1', 10000, 'dup-ref-1')
    expect(first?.status).toBe('paid')
    expect(first?.cleanerPaidCents).toBeGreaterThan(0)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.team_member_payouts).toHaveLength(1)
    expect(stripeCalls.transfers).toHaveBeenCalledTimes(1)

    const second = await pay('bk1', 10000, 'dup-ref-1')

    expect(h.store.payments).toHaveLength(1)
    expect(h.store.team_member_payouts).toHaveLength(1)
    expect(stripeCalls.transfers).toHaveBeenCalledTimes(1)
    expect(second?.cleanerPaidCents).toBe(0)
    expect(second?.status).toBe('paid')
    expect(second?.totalReceivedCents).toBe(10000)
  })

  it('a DIFFERENT reference_id for the same booking is still treated as a real second payment', async () => {
    seedBooking(h, 'bk2', { price: 20000 })

    await pay('bk2', 10000, 'ref-a')
    const second = await pay('bk2', 10000, 'ref-b')

    expect(h.store.payments).toHaveLength(2)
    expect(second?.totalReceivedCents).toBe(20000)
    expect(second?.status).toBe('paid')
  })
})
