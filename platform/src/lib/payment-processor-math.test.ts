/**
 * payment-processor.ts `processPayment` — money-math edges (P1/W1 queue item b).
 *
 * `processPayment` is the non-Stripe money-in path (Zelle / Venmo / cash /
 * admin-confirmed). money-path-coverage.md flags it as HIGH gap #1: the most
 * math-dense untested function in the money path. This test pins the two pieces
 * of math where an off-by-one silently over/under-pays:
 *
 *   1. expectedCents resolution — the booked `price` wins whenever it's set
 *      (matches webhooks/stripe/route.ts and admin/record-payment, both of
 *      which already trusted price); falls back to an actual_hours recompute
 *      only when no price is locked in yet. (The check-in elapsed branch is
 *      time-dependent — Date.now() — so it is deliberately not asserted here;
 *      these cases never set check_in_time.)
 *   2. the 95% partial-vs-paid threshold (STRICT `<`) and
 *      tip = max(0, totalReceived − expected), computed over PRIOR payments too.
 *
 * We drive the REAL processPayment against the shared in-memory Supabase fake and
 * assert its returned ProcessPaymentResult. All network/SMS/ledger side-effects
 * (sms, admin-contacts, notify, revenue post, payout post) are mocked to no-ops;
 * no team-member Stripe account is seeded, so the payout branch (Stripe) never
 * runs. Nothing here touches the network, a real key, or a real DB.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { tenant, seedBooking, seedPriorPayment } from '@/test/payment-processor-fixtures'

// hoisted mutable store so the vi.mock factory can reach it (money-spine pattern)
const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
// Peripheral I/O — no-op so only the math + DB rows are exercised.
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(() => Promise.resolve()) }))

import { processPayment } from './payment-processor'

// TENANT / tenant / seedBooking / seedPriorPayment are shared with
// payment-processor-payout.test.ts via @/test/payment-processor-fixtures.

async function pay(bookingId: string, amountCents: number) {
  return processPayment({
    tenant, bookingId, clientId: 'client-1', method: 'zelle', amountCents, referenceId: `ref-${amountCents}`,
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [], payments: [], admin_tasks: [], clients: [] }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('processPayment — expectedCents resolution', () => {
  it('bills the booked price, NOT an actual_hours recompute, once the booking is checked out', async () => {
    // Booked price $50 is the real, locked, already-quoted amount (set by
    // team-portal/checkout's computeCheckoutPricing at check-out time, which
    // already folds in team_size/discount/credit). actual_hours (2h × $100 =
    // $200) is a red-herring live recompute using an incomplete formula (no
    // team_size, discount can drift from what was baked into price — see
    // recurring-discount.ts). A $60 payment against the real $50 price is an
    // overpayment → paid + $10 tip. This is the fix for the production bug
    // where NYC Maid bookings 36aac9da/71f7fd84 had payments summing to the
    // exact locked price but stayed stuck 'partial' forever because the old
    // code compared against a drifted actual_hours recompute instead.
    seedBooking(h, 'bk1', { actual_hours: 2, hourly_rate: 100, price: 5000, check_out_time: '2026-08-01T12:00:00Z' })
    const r = await pay('bk1', 6000)
    expect(r?.expectedCents).toBe(5000)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(1000)
  })

  it('falls back to an actual_hours recompute when no price is locked yet', async () => {
    // No real booking should ever reach processPayment with actual_hours set
    // and no price — every writer of actual_hours (team-portal/checkout,
    // finance/backfill) sets price in the same write — but keep the fallback
    // covered: actual 2h × $100 = $200 expected, no price to fall back to.
    seedBooking(h, 'bk1b', { actual_hours: 2, hourly_rate: 100, price: null })
    const r = await pay('bk1b', 6000)
    expect(r?.expectedCents).toBe(20000)
    expect(r?.status).toBe('partial')
  })

  it('does not stay stuck partial when a discount recomputed after the price was locked would drift the actual_hours fallback above what was actually paid', async () => {
    // Reproduces the exact live bug: 3.5h × $69 = $241.50 raw, but the price
    // that was actually locked and quoted (and fully paid) was $190 (a 20%
    // weekly-recurring discount applied at booking time). If expectedCents
    // were still resolved from actual_hours × rate × discount instead of the
    // locked price, rounding/timing drift in when discount_percent lands on
    // the row can put the recompute a few dollars above what the client
    // actually owed, permanently misclassifying a fully-paid booking as
    // partial. Trusting price directly closes that window.
    seedBooking(h, 'bk1c', { actual_hours: 3.5, hourly_rate: 69, discount_percent: 20, price: 19000, check_out_time: '2026-08-20T20:16:03Z' })
    const r = await pay('bk1c', 19000)
    expect(r?.expectedCents).toBe(19000)
    expect(r?.status).toBe('paid')
  })

  it('falls back to booked price when actual_hours is unknown', async () => {
    seedBooking(h, 'bk2', { actual_hours: null, hourly_rate: 100, price: 5000 })
    const r = await pay('bk2', 5000)
    expect(r?.expectedCents).toBe(5000)
    expect(r?.status).toBe('paid')
  })

  it('defaults hourly_rate to 69 when the booking has none and no price is locked', async () => {
    // 1h × default $69 = $6900 expected.
    seedBooking(h, 'bk3', { actual_hours: 1, hourly_rate: null, price: null })
    const r = await pay('bk3', 6900)
    expect(r?.expectedCents).toBe(6900)
  })

  it('rounds actual_hours × rate × 100 half-up to the cent when no price is locked', async () => {
    // 1.333h × $69 = $91.977 → 9197.7¢ → Math.round → 9198¢.
    seedBooking(h, 'bk4', { actual_hours: 1.333, hourly_rate: 69, price: null })
    const r = await pay('bk4', 9198)
    expect(r?.expectedCents).toBe(9198)
  })

  it('treats a zero-expected booking (no hours, no price) as fully PAID with no tip', async () => {
    // No actual_hours, no price, no check-in → expectedCents = 0. The partial
    // guard (`expectedCents > 0`) is false, so any payment books as 'paid' and
    // the tip guard also short-circuits to 0. Pins this edge so a future change
    // to the guard can't silently start charging tips on unpriced bookings.
    seedBooking(h, 'bk5', { actual_hours: null, hourly_rate: null, price: null })
    const r = await pay('bk5', 5000)
    expect(r?.expectedCents).toBe(0)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(0)
  })
})

describe('processPayment — 95% partial threshold (strict <) + tip', () => {
  it('EXACTLY 95% of expected is PAID, not partial (threshold is strict <)', async () => {
    // expected $100. $95 == 95% exactly. `95_00 < 95_00` is false → paid, tip 0.
    seedBooking(h, 'bk6', { price: 10000 })
    const r = await pay('bk6', 9500)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(0)
  })

  it('one cent under 95% is PARTIAL, with no tip', async () => {
    seedBooking(h, 'bk7', { price: 10000 })
    const r = await pay('bk7', 9499)
    expect(r?.status).toBe('partial')
    expect(r?.tipCents).toBe(0)
    expect(r?.totalReceivedCents).toBe(9499)
  })

  it('overpayment books the excess as tip', async () => {
    seedBooking(h, 'bk8', { price: 10000 })
    const r = await pay('bk8', 12000)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(2000)
  })

  it('sums PRIOR payments — a top-up that crosses the threshold flips partial→paid', async () => {
    // $90 already received (was partial), now +$6 = $96 of $100 → 96 ≥ 95 → paid.
    // Excess over expected is negative → tip clamps to 0 (no phantom tip).
    seedBooking(h, 'bk9', { price: 10000 })
    seedPriorPayment(h, 'bk9', 9000)
    const r = await pay('bk9', 600)
    expect(r?.totalReceivedCents).toBe(9600)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(0)
  })

  it('prior + new that overshoots expected books the true excess as tip', async () => {
    // $80 prior + $30 new = $110 of $100 → paid, tip = $10.
    seedBooking(h, 'bk10', { price: 10000 })
    seedPriorPayment(h, 'bk10', 8000)
    const r = await pay('bk10', 3000)
    expect(r?.totalReceivedCents).toBe(11000)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(1000)
  })
})
