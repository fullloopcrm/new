import { describe, it, expect } from 'vitest'
import { PRICING, computeMonthly } from './billing-pricing'

/**
 * Platform seat pricing — single source of truth. These assert the exact
 * computed dollar totals, so any drift in the per-seat rates or the arithmetic
 * (e.g. adding the wrong seat class, dropping a term) trips a value assertion.
 */
describe('computeMonthly', () => {
  it('sums admin seats and team-member seats at their respective rates', () => {
    // 2 admins ($2,500) + 3 team ($250) = 5,000 + 750 = 5,750
    expect(computeMonthly(2, 3)).toBe(2 * PRICING.adminMonthly + 3 * PRICING.teamMemberMonthly)
    expect(computeMonthly(2, 3)).toBe(5750)
  })

  it('one admin, no team = one admin rate ($2,500)', () => {
    expect(computeMonthly(1, 0)).toBe(2500)
  })

  it('zero of everything = $0', () => {
    expect(computeMonthly(0, 0)).toBe(0)
  })

  it('treats missing/NaN-ish counts as 0 (|| 0 guard)', () => {
    // @ts-expect-error exercising the null-coalescing guard at the boundary
    expect(computeMonthly(undefined, undefined)).toBe(0)
    // @ts-expect-error
    expect(computeMonthly(null, 4)).toBe(4 * PRICING.teamMemberMonthly)
  })

  it('admins and team are not interchangeable (different rates)', () => {
    // Guards against a copy-paste bug that uses one rate for both seat classes.
    expect(computeMonthly(1, 0)).not.toBe(computeMonthly(0, 1))
  })
})
