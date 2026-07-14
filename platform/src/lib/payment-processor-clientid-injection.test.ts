/**
 * payment-processor.ts `processPayment` — clientId FK-injection witness
 * (P1/W1 backlog batch). `processPayment` used to trust `input.clientId`
 * verbatim for the `payments.client_id` insert and the client-confirmation
 * SMS lookup. `/api/admin/payments/finalize-match` is gated by a single
 * internal API key that is global across ALL tenants and passes a raw
 * caller-supplied `clientId` straight through — so a leaked/misused key (or
 * a bug in an automated reconciliation caller) could attribute a payment to
 * an unowned client, including one belonging to a different tenant. Fixed by
 * deriving `clientId` from the already tenant-scoped `booking.client_id`
 * instead of trusting the caller. This proves the forged id is now ignored.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { tenant, seedBooking } from '@/test/payment-processor-fixtures'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(() => Promise.resolve()) }))

import { processPayment } from './payment-processor'

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [], payments: [], admin_tasks: [], clients: [] }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('processPayment — clientId FK-injection', () => {
  it("a forged clientId in the input never lands on the payments row — booking.client_id wins", async () => {
    seedBooking(h, 'bk-forge', { price: 5000 }) // seeds client_id: 'client-1'

    const r = await processPayment({
      tenant,
      bookingId: 'bk-forge',
      clientId: 'client-FORGED', // attacker/bug-supplied, does not own this booking
      method: 'zelle',
      amountCents: 5000,
      referenceId: 'ref-forge-1',
    })

    expect(r?.status).toBe('paid')
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0].client_id).toBe('client-1')
    expect(h.store.payments[0].client_id).not.toBe('client-FORGED')
  })
})
