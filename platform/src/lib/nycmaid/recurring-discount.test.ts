import { describe, it, expect } from 'vitest'
import { recurringDiscountPct, applyRecurringDiscount } from './recurring-discount'

/**
 * Recurring-service discount: weekly = 20% off, biweekly/monthly = 10% off,
 * everything else = 0. Tests pin the exact percentages and the rounding of the
 * applied price, so swapping a rate or dropping a case trips a value assertion.
 */
describe('recurringDiscountPct', () => {
  it('weekly → 20%', () => {
    expect(recurringDiscountPct('weekly')).toBe(0.2)
  })

  it('biweekly (all spellings) → 10%', () => {
    expect(recurringDiscountPct('biweekly')).toBe(0.1)
    expect(recurringDiscountPct('bi-weekly')).toBe(0.1)
    expect(recurringDiscountPct('bi weekly')).toBe(0.1)
    expect(recurringDiscountPct('bi_weekly')).toBe(0.1)
  })

  it('monthly → 10%', () => {
    expect(recurringDiscountPct('monthly')).toBe(0.1)
  })

  it('triweekly (all spellings) → 10%, same tier as its biweekly/monthly neighbors', () => {
    // Real, staff-selectable RecurringType (quote builder's cadence picker) that
    // reaches real bookings via sale-to-recurring.ts and gets billed through
    // team-portal/checkout's applyRecurringDiscount call same as every other
    // cadence -- must not silently fall through to the 0% default.
    expect(recurringDiscountPct('triweekly')).toBe(0.1)
    expect(recurringDiscountPct('tri-weekly')).toBe(0.1)
    expect(recurringDiscountPct('tri_weekly')).toBe(0.1)
  })

  it('"1st Mon" / "3rd Fri" (BookingsAdmin.tsx\'s own monthly_day display-string convention) → 10%', () => {
    // BookingsAdmin.tsx (dashboard/bookings/_recurring.ts's getRecurringDisplayName) stores
    // this human label directly as recurring_type instead of an enum key -- same monthly
    // tier as monthly_date/monthly_weekday, just a different string shape reaching here.
    expect(recurringDiscountPct('1st Mon')).toBe(0.1)
    expect(recurringDiscountPct('3rd Fri')).toBe(0.1)
    expect(recurringDiscountPct('2nd Tue')).toBe(0.1)
  })

  it('monthly_date / monthly_weekday (the real RecurringType enum values, lib/recurring.ts) → 10%', () => {
    // bare 'monthly' never actually reaches this function from a real schedule row anymore --
    // every enum-validated write path (admin/recurring-schedules, dashboard/schedules,
    // client/recurring, CSV import) normalizes it to monthly_date/monthly_weekday before persisting.
    expect(recurringDiscountPct('monthly_date')).toBe(0.1)
    expect(recurringDiscountPct('monthly_weekday')).toBe(0.1)
  })

  it('normalizes case and separators (WEEKLY, Weekly)', () => {
    expect(recurringDiscountPct('WEEKLY')).toBe(0.2)
    expect(recurringDiscountPct('Weekly')).toBe(0.2)
  })

  it('one-time / none / null → 0', () => {
    expect(recurringDiscountPct('one-time')).toBe(0)
    expect(recurringDiscountPct('none')).toBe(0)
    expect(recurringDiscountPct('')).toBe(0)
    expect(recurringDiscountPct(null)).toBe(0)
    expect(recurringDiscountPct(undefined)).toBe(0)
  })

  it('weekly beats biweekly (percentages are distinct)', () => {
    expect(recurringDiscountPct('weekly')).toBeGreaterThan(recurringDiscountPct('biweekly'))
  })
})

describe('applyRecurringDiscount', () => {
  it('applies 20% off weekly and rounds to an integer', () => {
    // 20000 * 0.8 = 16000
    expect(applyRecurringDiscount(20000, 'weekly')).toBe(16000)
  })

  it('applies 10% off monthly', () => {
    expect(applyRecurringDiscount(20000, 'monthly')).toBe(18000)
  })

  it('rounds the discounted result (odd cent value)', () => {
    // 12345 * 0.8 = 9876 exactly; use a value that needs rounding:
    // 9999 * 0.9 = 8999.1 → 8999
    expect(applyRecurringDiscount(9999, 'monthly')).toBe(8999)
  })

  it('returns the price unchanged when there is no discount', () => {
    expect(applyRecurringDiscount(20000, 'one-time')).toBe(20000)
    expect(applyRecurringDiscount(20000, null)).toBe(20000)
  })
})
