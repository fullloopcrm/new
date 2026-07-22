import { describe, it, expect } from 'vitest'
import { computeCheckoutPricing } from './checkout-pricing'

/**
 * computeCheckoutPricing replaces two hand-rolled, independently-diverged
 * copies of this math that lived inline in BookingsAdmin.tsx's two Check Out
 * handlers. Each copy had different real bugs (see checkout-pricing.ts's
 * header comment): a single 5-min grace window for both client and cleaner
 * hours (should be the canonical 10-min/15-min dual grace), and no
 * applyRecurringDiscount() re-application (silently wiped a recurring
 * client's discount on every admin check-out).
 */

function iso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60000).toISOString()
}

const base = {
  hourlyRate: 69,
  cleanerHourlyRate: 25,
  discountPercent: null,
  oneTimeCreditCents: null,
  recurringType: null,
  maxHours: null,
  teamSize: 1,
}

describe('computeCheckoutPricing — dual grace window (client 10-min, cleaner 15-min)', () => {
  it('at 41 min elapsed: client billed 1.0h, cleaner paid 0.5h — the two must differ', () => {
    const r = computeCheckoutPricing({ ...base, checkInIso: iso(41), checkOutIso: iso(0) })
    // client: 1.0h × $69 = $69; cleaner: 0.5h × $25 = $12.50
    expect(r.priceCents).toBe(6900)
    expect(r.cleanerPayCents).toBe(1250)
    expect(r.actualHours).toBe(1)
  })

  it('a hand-rolled single 5-min-grace implementation would have collapsed these to the same value — this must not', () => {
    // 12 min remainder past a half-hour block: client (10-min grace) rounds
    // up, cleaner (15-min grace) does not. A single-grace bug (like the old
    // 5-min inline math) would round BOTH up, overpaying the cleaner.
    const raw = 132 // 2h12m
    const r = computeCheckoutPricing({ ...base, checkInIso: iso(raw), checkOutIso: iso(0) })
    expect(r.priceCents).toBe(Math.round(2.5 * 69 * 100)) // client billed 2.5h
    expect(r.cleanerPayCents).toBe(Math.round(2.0 * 25 * 100)) // cleaner paid 2.0h
  })
})

describe('computeCheckoutPricing — recurring discount re-application', () => {
  it('applies the 20% weekly recurring discount to the recomputed price', () => {
    const r = computeCheckoutPricing({ ...base, checkInIso: iso(120), checkOutIso: iso(0), recurringType: 'weekly' })
    // 2h × $69 = $138 = 13800¢ -> -20% = 11040¢. applyRecurringDiscount plain-
    // rounds (no $5 floor — that's only applyDiscount, and only when an admin
    // discount_percent is actually set).
    expect(r.priceCents).toBe(11040)
  })

  it('applies the 10% biweekly/monthly recurring discount', () => {
    const r = computeCheckoutPricing({ ...base, checkInIso: iso(120), checkOutIso: iso(0), recurringType: 'monthly' })
    // 13800¢ -> -10% = 12420¢, plain-rounded.
    expect(r.priceCents).toBe(12420)
  })

  it('a non-recurring (or one-time) booking is unaffected', () => {
    const r = computeCheckoutPricing({ ...base, checkInIso: iso(120), checkOutIso: iso(0), recurringType: null })
    expect(r.priceCents).toBe(13800)
  })

  it('admin discount_percent and one_time_credit_cents stack on TOP of the recurring discount', () => {
    const r = computeCheckoutPricing({
      ...base, checkInIso: iso(120), checkOutIso: iso(0),
      recurringType: 'weekly', discountPercent: 10, oneTimeCreditCents: 300,
    })
    // 13800 -> recurring -20% (plain round) -> 11040
    // -> admin -10% (floors to nearest $5) -> 9936 -> 9500 -> -$3 credit -> 9200
    expect(r.priceCents).toBe(9200)
  })
})

describe('computeCheckoutPricing — team minimum floors price/pay but not actualHours', () => {
  it('a 2-cleaner job finishing in 2h is billed/paid for the 4h floor', () => {
    const r = computeCheckoutPricing({ ...base, checkInIso: iso(120), checkOutIso: iso(0), teamSize: 2 })
    expect(r.priceCents).toBe(4 * 69 * 2 * 100) // 4h floor × $69 × crew 2
    expect(r.cleanerPayCents).toBe(4 * 25 * 100) // 4h floor × $25
    expect(r.actualHours).toBe(2) // true elapsed, NOT floored
  })

  it('a single-cleaner job is never floored', () => {
    const r = computeCheckoutPricing({ ...base, checkInIso: iso(120), checkOutIso: iso(0), teamSize: 1 })
    expect(r.priceCents).toBe(2 * 69 * 100)
    expect(r.actualHours).toBe(2)
  })

  it('a job longer than the floor is billed/paid for actual time', () => {
    const r = computeCheckoutPricing({ ...base, checkInIso: iso(360), checkOutIso: iso(0), teamSize: 2 })
    expect(r.priceCents).toBe(6 * 69 * 2 * 100)
    expect(r.actualHours).toBe(6)
  })
})

describe('computeCheckoutPricing — max_hours cap', () => {
  it('clamps both client and cleaner hours to the cap before the team minimum', () => {
    const r = computeCheckoutPricing({ ...base, checkInIso: iso(300), checkOutIso: iso(0), maxHours: 3 })
    expect(r.actualHours).toBe(3)
    expect(r.priceCents).toBe(3 * 69 * 100)
  })
})

describe('computeCheckoutPricing — rate fallbacks', () => {
  it('falls back to $69/hr client rate; cleaner rate falls back to the >$60 tier ($30) since 69 > 60', () => {
    const r = computeCheckoutPricing({
      ...base, hourlyRate: null, cleanerHourlyRate: null,
      checkInIso: iso(60), checkOutIso: iso(0),
    })
    expect(r.priceCents).toBe(1 * 69 * 100)
    expect(r.cleanerPayCents).toBe(1 * 30 * 100)
  })

  it('cleaner rate falls back to the <=$60 tier ($25) when the client rate is 60 or under', () => {
    const r = computeCheckoutPricing({
      ...base, hourlyRate: 55, cleanerHourlyRate: null,
      checkInIso: iso(60), checkOutIso: iso(0),
    })
    expect(r.cleanerPayCents).toBe(1 * 25 * 100)
  })
})
