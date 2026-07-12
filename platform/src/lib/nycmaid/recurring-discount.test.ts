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
