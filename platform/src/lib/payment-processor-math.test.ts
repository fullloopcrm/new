/**
 * payment-processor.ts `processPayment` — money-math edges (P1/W1 queue item b).
 *
 * `processPayment` is the non-Stripe money-in path (Zelle / Venmo / cash /
 * admin-confirmed). money-path-coverage.md flags it as HIGH gap #1: the most
 * math-dense untested function in the money path. This test pins the two pieces
 * of math where an off-by-one silently over/under-pays:
 *
 *   1. expectedCents resolution — actual_hours × hourly_rate wins over the booked
 *      `price`; falls back to price only when actual isn't known. (The check-in
 *      elapsed branch is time-dependent — Date.now() — so it is deliberately not
 *      asserted here; these cases never set check_in_time.)
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

const TENANT = 'tenant-pp'

/** A tenant object with both key fields DEFINED so hydrateTenant short-circuits
 *  (no tenants query) and, being null, keeps every SMS/Stripe branch inert. */
const tenant = { id: TENANT, name: 'Acme', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null }

type BookingSeed = {
  actual_hours?: number | null
  hourly_rate?: number | null
  price?: number | null
}

/** Seed one tenant-scoped booking (no team member → payout branch skipped). */
function seedBooking(id: string, b: BookingSeed) {
  ;(h.store.bookings ||= []).push({
    id,
    tenant_id: TENANT,
    team_member_id: null,
    client_id: 'client-1',
    team_member_pay: null,
    actual_hours: b.actual_hours ?? null,
    hourly_rate: b.hourly_rate ?? null,
    pay_rate: null,
    price: b.price ?? null,
    check_in_time: null,
    start_time: null,
    clients: { name: 'Pat', phone: null, address: null },
    team_members: null,
  })
}

function seedPriorPayment(bookingId: string, amountCents: number) {
  ;(h.store.payments ||= []).push({
    id: `prior-${amountCents}`, tenant_id: TENANT, booking_id: bookingId, amount_cents: amountCents,
  })
}

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
  it('bills actual_hours × hourly_rate, NOT the booked price, when actual is known', async () => {
    // actual 2h × $100 = $200 expected. Booked price is a red-herring $50.
    // A $60 payment is only 30% of $200 → partial. If price ($50) had won,
    // $60 would be an overpayment (paid + $10 tip). Asserting 'partial' proves
    // actual_hours takes precedence.
    seedBooking('bk1', { actual_hours: 2, hourly_rate: 100, price: 5000 })
    const r = await pay('bk1', 6000)
    expect(r?.expectedCents).toBe(20000)
    expect(r?.status).toBe('partial')
  })

  it('falls back to booked price when actual_hours is unknown', async () => {
    seedBooking('bk2', { actual_hours: null, hourly_rate: 100, price: 5000 })
    const r = await pay('bk2', 5000)
    expect(r?.expectedCents).toBe(5000)
    expect(r?.status).toBe('paid')
  })

  it('defaults hourly_rate to 69 when the booking has none', async () => {
    // 1h × default $69 = $6900 expected.
    seedBooking('bk3', { actual_hours: 1, hourly_rate: null, price: null })
    const r = await pay('bk3', 6900)
    expect(r?.expectedCents).toBe(6900)
  })

  it('rounds actual_hours × rate × 100 half-up to the cent', async () => {
    // 1.333h × $69 = $91.977 → 9197.7¢ → Math.round → 9198¢.
    seedBooking('bk4', { actual_hours: 1.333, hourly_rate: 69, price: null })
    const r = await pay('bk4', 9198)
    expect(r?.expectedCents).toBe(9198)
  })

  it('treats a zero-expected booking (no hours, no price) as fully PAID with no tip', async () => {
    // No actual_hours, no price, no check-in → expectedCents = 0. The partial
    // guard (`expectedCents > 0`) is false, so any payment books as 'paid' and
    // the tip guard also short-circuits to 0. Pins this edge so a future change
    // to the guard can't silently start charging tips on unpriced bookings.
    seedBooking('bk5', { actual_hours: null, hourly_rate: null, price: null })
    const r = await pay('bk5', 5000)
    expect(r?.expectedCents).toBe(0)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(0)
  })
})

describe('processPayment — 95% partial threshold (strict <) + tip', () => {
  it('EXACTLY 95% of expected is PAID, not partial (threshold is strict <)', async () => {
    // expected $100. $95 == 95% exactly. `95_00 < 95_00` is false → paid, tip 0.
    seedBooking('bk6', { price: 10000 })
    const r = await pay('bk6', 9500)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(0)
  })

  it('one cent under 95% is PARTIAL, with no tip', async () => {
    seedBooking('bk7', { price: 10000 })
    const r = await pay('bk7', 9499)
    expect(r?.status).toBe('partial')
    expect(r?.tipCents).toBe(0)
    expect(r?.totalReceivedCents).toBe(9499)
  })

  it('overpayment books the excess as tip', async () => {
    seedBooking('bk8', { price: 10000 })
    const r = await pay('bk8', 12000)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(2000)
  })

  it('sums PRIOR payments — a top-up that crosses the threshold flips partial→paid', async () => {
    // $90 already received (was partial), now +$6 = $96 of $100 → 96 ≥ 95 → paid.
    // Excess over expected is negative → tip clamps to 0 (no phantom tip).
    seedBooking('bk9', { price: 10000 })
    seedPriorPayment('bk9', 9000)
    const r = await pay('bk9', 600)
    expect(r?.totalReceivedCents).toBe(9600)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(0)
  })

  it('prior + new that overshoots expected books the true excess as tip', async () => {
    // $80 prior + $30 new = $110 of $100 → paid, tip = $10.
    seedBooking('bk10', { price: 10000 })
    seedPriorPayment('bk10', 8000)
    const r = await pay('bk10', 3000)
    expect(r?.totalReceivedCents).toBe(11000)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(1000)
  })
})
