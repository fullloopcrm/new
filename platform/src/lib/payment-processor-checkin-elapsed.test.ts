/**
 * payment-processor.ts `processPayment` — the check-in-elapsed expectedCents
 * fallback (P1/W1 queue item c: flagged-but-untested edge).
 *
 * payment-processor-math.test.ts explicitly flags this branch as deliberately
 * NOT asserted there ("the check-in elapsed branch is time-dependent —
 * Date.now() — so it is deliberately not asserted here; those cases never set
 * check_in_time"). It is the third and last expectedCents fallback, used only
 * when a booking has NEITHER actual_hours NOR a booked price:
 *
 *   rawMinutes = max(0, (now - check_in_time) / 60000)
 *   estHours   = max(0.5, ceil((rawMinutes + 30) / 30) * 0.5)   // 30min buffer,
 *                                                                // round up to next 30min
 *   expectedCents = round(estHours * clientRate * 100)
 *
 * A wrong rounding here would over/under-bill a client mid-job before actual
 * hours are logged. Pinned with `vi.useFakeTimers` so "now" is deterministic.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

const NOW = '2026-07-12T12:00:00.000Z'

/** check_in_time this many minutes before NOW, as a naive-Z ISO string. */
function checkInMinutesAgo(minutes: number): string {
  return new Date(new Date(NOW).getTime() - minutes * 60_000).toISOString()
}

async function pay(bookingId: string, amountCents: number) {
  return processPayment({
    tenant, bookingId, clientId: 'client-1', method: 'zelle', amountCents, referenceId: `ref-${bookingId}-${amountCents}`,
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [], payments: [], admin_tasks: [], clients: [] }
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('processPayment — check-in-elapsed expectedCents fallback (no actual_hours, no price)', () => {
  it('83 elapsed minutes rounds UP to the next 30min bucket (2.0h), not down', async () => {
    // rawMinutes=83 -> (83+30)/30 = 3.766.. -> ceil = 4 -> estHours = 4*0.5 = 2.0h
    seedBooking(h, 'bk1', { actual_hours: null, price: null, hourly_rate: 100, check_in_time: checkInMinutesAgo(83) })
    const r = await pay('bk1', 20000)
    expect(r?.expectedCents).toBe(20000)
    expect(r?.status).toBe('paid')
  })

  it('a check-in at exactly NOW (0 elapsed) still bills the 30min minimum buffer', async () => {
    // rawMinutes=0 -> (0+30)/30 = 1 -> ceil = 1 -> estHours = max(0.5, 1*0.5) = 0.5h
    seedBooking(h, 'bk2', { actual_hours: null, price: null, hourly_rate: 100, check_in_time: checkInMinutesAgo(0) })
    const r = await pay('bk2', 5000)
    expect(r?.expectedCents).toBe(5000)
  })

  it('exactly 30 elapsed minutes lands ON the 1.0h bucket boundary (no round-up past it)', async () => {
    // rawMinutes=30 -> (30+30)/30 = 2.0 exactly -> ceil = 2 -> estHours = 1.0h
    seedBooking(h, 'bk3', { actual_hours: null, price: null, hourly_rate: 100, check_in_time: checkInMinutesAgo(30) })
    const r = await pay('bk3', 10000)
    expect(r?.expectedCents).toBe(10000)
  })

  it('one minute past the 30min boundary rounds UP to the next bucket (1.5h)', async () => {
    // rawMinutes=31 -> (31+30)/30 = 2.033.. -> ceil = 3 -> estHours = 1.5h
    seedBooking(h, 'bk4', { actual_hours: null, price: null, hourly_rate: 100, check_in_time: checkInMinutesAgo(31) })
    const r = await pay('bk4', 15000)
    expect(r?.expectedCents).toBe(15000)
  })

  it('defaults clientRate to 69 when hourly_rate is unset, same as the other fallback branches', async () => {
    seedBooking(h, 'bk5', { actual_hours: null, price: null, hourly_rate: null, check_in_time: checkInMinutesAgo(0) })
    const r = await pay('bk5', 3450) // 0.5h * $69 * 100 = 3450
    expect(r?.expectedCents).toBe(3450)
  })

  it('actual_hours still wins over check_in_time when both are present (fallback order)', async () => {
    seedBooking(h, 'bk6', { actual_hours: 1, price: null, hourly_rate: 100, check_in_time: checkInMinutesAgo(83) })
    const r = await pay('bk6', 10000)
    // 1h * $100 = $100, NOT the check-in-elapsed 2.0h * $100 = $200.
    expect(r?.expectedCents).toBe(10000)
  })

  it('booked price still wins over check_in_time when both are present (fallback order)', async () => {
    seedBooking(h, 'bk7', { actual_hours: null, price: 7500, hourly_rate: 100, check_in_time: checkInMinutesAgo(83) })
    const r = await pay('bk7', 7500)
    // price ($75) wins, NOT the check-in-elapsed 2.0h * $100 = $200.
    expect(r?.expectedCents).toBe(7500)
  })
})
