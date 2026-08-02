import { describe, it, expect } from 'vitest'
import { PRICING, computeMonthly } from './billing-pricing'

/**
 * Platform pricing — single source of truth. Flat, unlimited-usage pricing
 * (2026-08-02): $25,000 setup (bank wire, upfront) + $2,500/mo flat,
 * regardless of headcount. computeMonthly() ignores its arguments on
 * purpose — these assert that flatness, not a per-seat formula.
 */
describe('PRICING constants', () => {
  it('setup fee is $25,000', () => {
    expect(PRICING.setupFee).toBe(25000)
  })

  it('monthly fee is $2,500 flat', () => {
    expect(PRICING.monthlyFee).toBe(2500)
  })
})

describe('computeMonthly', () => {
  it('returns the flat monthly fee regardless of admin/team counts', () => {
    expect(computeMonthly(2, 3)).toBe(PRICING.monthlyFee)
    expect(computeMonthly(2, 3)).toBe(2500)
  })

  it('one admin, no team = same flat rate', () => {
    expect(computeMonthly(1, 0)).toBe(2500)
  })

  it('zero of everything = still the flat rate, never $0', () => {
    // Guards against a regression back to a per-seat formula that could
    // resolve to $0 for a headcount of zero.
    expect(computeMonthly(0, 0)).toBe(2500)
  })

  it('missing/undefined/null counts still resolve to the flat rate', () => {
    expect(computeMonthly()).toBe(2500)
    expect(computeMonthly(undefined, undefined)).toBe(2500)
    // @ts-expect-error exercising the boundary with a null admins count
    expect(computeMonthly(null, 4)).toBe(2500)
  })

  it('admin and team counts no longer affect the rate at all', () => {
    // Old model: different rates per seat class. New model: no seat classes.
    expect(computeMonthly(1, 0)).toBe(computeMonthly(0, 1))
    expect(computeMonthly(100, 100)).toBe(computeMonthly(0, 0))
  })
})
