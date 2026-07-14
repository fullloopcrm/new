/**
 * payment-processor.ts `processPayment` — the REAL fire-and-forget revenue
 * wiring (P1/W1 money-path-coverage.md HIGH gap #3, queue item a).
 *
 * `processPayment` calls `postPaymentRevenue({ tenantId, paymentId })
 *   .catch(err => console.error(...))` WITHOUT awaiting it
 * (payment-processor.ts:169-172). Every existing processPayment test (math,
 * payout) mocks postPaymentRevenue as a blanket `vi.fn(() => Promise.resolve())`
 * — that proves the client/payout math but never exercises the wiring itself:
 * whether it's called at all, with what args, and what happens when it's slow
 * or rejects. This file controls postPaymentRevenue per-test to close that.
 *
 * Three things asserted that no other test asserts:
 *   1. It is called with the tenant + the REAL just-inserted payment row id
 *      (not a placeholder) — both on a full AND a partial payment, since the
 *      call site sits above the partial/paid branch.
 *   2. It is fire-and-forget: processPayment resolves without waiting for
 *      postPaymentRevenue to settle (proven by leaving its promise pending).
 *   3. A rejection is swallowed by the `.catch()` — it never surfaces to the
 *      caller, and only logs via console.error.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { tenant, seedBooking } from '@/test/payment-processor-fixtures'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const postPaymentRevenue = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(() => Promise.resolve()) }))

import { processPayment } from './payment-processor'

async function pay(bookingId: string, amountCents: number) {
  return processPayment({
    tenant, bookingId, clientId: 'client-1', method: 'zelle', amountCents, referenceId: `ref-${bookingId}-${amountCents}`,
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [], payments: [], admin_tasks: [], clients: [] }
  postPaymentRevenue.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('processPayment — real postPaymentRevenue wiring (not a mocked no-op)', () => {
  it('calls postPaymentRevenue with the tenant + the REAL inserted payment row id, on a full payment', async () => {
    postPaymentRevenue.mockResolvedValue(undefined)
    seedBooking(h, 'bkA', { price: 10000 })
    const r = await pay('bkA', 10000)
    expect(r?.status).toBe('paid')
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)
    const call = postPaymentRevenue.mock.calls[0][0] as { tenantId: string; paymentId: string }
    expect(call.tenantId).toBe('tenant-pp')
    // the fake mints ids as `${table}-${seq}` on real insert — assert it's a
    // genuine payments row id, not a hardcoded/placeholder string.
    expect(call.paymentId).toMatch(/^payments-\d+$/)
    const insertedPayment = h.store.payments.find((p) => p.id === call.paymentId)
    expect(insertedPayment).toBeTruthy()
    expect(insertedPayment?.tenant_id).toBe('tenant-pp')
  })

  it('also fires on a PARTIAL payment — the call sits above the partial/paid branch', async () => {
    postPaymentRevenue.mockResolvedValue(undefined)
    seedBooking(h, 'bkB', { price: 10000 })
    const r = await pay('bkB', 1000)
    expect(r?.status).toBe('partial')
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)
    const call = postPaymentRevenue.mock.calls[0][0] as { paymentId: string }
    const insertedPayment = h.store.payments.find((p) => p.id === call.paymentId)
    expect(insertedPayment?.status).toBe('partial')
  })

  it('is fire-and-forget — processPayment resolves while postPaymentRevenue is still pending', async () => {
    // Never resolved during this test. If processPayment awaited it, `pay()`
    // below would hang until the suite's timeout instead of resolving.
    postPaymentRevenue.mockReturnValue(new Promise<void>(() => {}))
    seedBooking(h, 'bkC', { price: 10000 })
    const r = await pay('bkC', 10000)
    expect(r?.status).toBe('paid')
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)
  })

  it('swallows a postPaymentRevenue rejection — never surfaces to the caller, only logs', async () => {
    postPaymentRevenue.mockRejectedValue(new Error('ledger down'))
    seedBooking(h, 'bkD', { price: 10000 })
    await expect(pay('bkD', 10000)).resolves.toMatchObject({ status: 'paid' })
    // Let the already-rejected promise's .catch() microtask run.
    await Promise.resolve()
    await Promise.resolve()
    expect(console.error).toHaveBeenCalledWith('[payment-processor] revenue post failed:', expect.any(Error))
  })
})
