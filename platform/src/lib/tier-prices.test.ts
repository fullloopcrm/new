import { describe, it, expect } from 'vitest'
import { signupPricing } from './tier-prices'
import { PRICING, computeMonthly } from './billing-pricing'

/**
 * Checkout / signup pricing (money path). Both the admin-approve endpoint and
 * the Stripe webhook derive a tenant's rate from signupPricing() — never from
 * values on the prospect row. Flat pricing (2026-08-02): admins/teamMembers
 * are headcount only, clamped/floored for sane tracking, but they no longer
 * change the bill — every signup is $2,500/mo flat + $25,000 setup.
 */

describe('computeMonthly (source of truth)', () => {
  it('is flat regardless of seat counts', () => {
    expect(computeMonthly(1, 0)).toBe(PRICING.monthlyFee)
    expect(computeMonthly(2, 3)).toBe(PRICING.monthlyFee)
    expect(computeMonthly(0, 0)).toBe(PRICING.monthlyFee)
  })
})

describe('signupPricing', () => {
  it('defaults to exactly 1 admin / 0 team members when no seats are given', () => {
    const p = signupPricing()
    expect(p.admins).toBe(1)
    expect(p.teamMembers).toBe(0)
    expect(p.monthly_cents).toBe(PRICING.monthlyFee * 100)
    expect(p.setup_cents).toBe(PRICING.setupFee * 100)
    expect(p.label).toBe('Full Loop')
  })

  it('clamps admins up to a minimum of 1 for headcount tracking (display only, no price effect)', () => {
    for (const bad of [0, -1, -100, undefined] as const) {
      const p = signupPricing({ admins: bad as number | undefined })
      expect(p.admins).toBe(1)
      expect(p.monthly_cents).toBe(PRICING.monthlyFee * 100)
    }
  })

  it('clamps team members up to a minimum of 0 (no negative headcount)', () => {
    const p = signupPricing({ admins: 1, teamMembers: -5 })
    expect(p.teamMembers).toBe(0)
    expect(p.monthly_cents).toBe(PRICING.monthlyFee * 100)
  })

  it('floors fractional seat counts (headcount tracking only)', () => {
    const p = signupPricing({ admins: 2.9, teamMembers: 3.9 })
    expect(p.admins).toBe(2)
    expect(p.teamMembers).toBe(3)
  })

  it('monthly is flat and identical no matter how many admins/team members are recorded', () => {
    const small = signupPricing({ admins: 1, teamMembers: 0 })
    const large = signupPricing({ admins: 9, teamMembers: 40 })
    expect(small.monthly_cents).toBe(large.monthly_cents)
    expect(large.monthly_cents).toBe(computeMonthly() * 100)
  })

  it('always returns the fixed one-time setup fee regardless of seats', () => {
    expect(signupPricing({ admins: 1 }).setup_cents).toBe(PRICING.setupFee * 100)
    expect(signupPricing({ admins: 9, teamMembers: 40 }).setup_cents).toBe(PRICING.setupFee * 100)
  })
})
