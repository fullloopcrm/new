import { describe, it, expect } from 'vitest'
import { signupPricing } from './tier-prices'
import { PRICING, computeMonthly } from './billing-pricing'

/**
 * Checkout / signup pricing (money path). Both the admin-approve endpoint and
 * the Stripe webhook derive a tenant's rate from signupPricing() — never from
 * values on the prospect row — so a crafted or corrupted prospect can't seed a
 * $0/mo tenant. The invariant under test: a signup ALWAYS bills at least 1 admin
 * ($2,500/mo = 250,000 cents), and pricing is a deterministic function of seats.
 */

describe('computeMonthly (source of truth)', () => {
  it('sums admin + team-member seat prices', () => {
    expect(computeMonthly(1, 0)).toBe(PRICING.adminMonthly)
    expect(computeMonthly(2, 3)).toBe(2 * PRICING.adminMonthly + 3 * PRICING.teamMemberMonthly)
    expect(computeMonthly(0, 0)).toBe(0)
  })
})

describe('signupPricing', () => {
  it('defaults to exactly 1 admin / 0 team members when no seats are given', () => {
    const p = signupPricing()
    expect(p.admins).toBe(1)
    expect(p.teamMembers).toBe(0)
    expect(p.monthly_cents).toBe(PRICING.adminMonthly * 100)
    expect(p.setup_cents).toBe(PRICING.setupFee * 100)
    expect(p.label).toBe('Full Loop')
  })

  it('clamps admins up to a minimum of 1 — a checkout can NEVER resolve to $0/mo', () => {
    for (const bad of [0, -1, -100, undefined] as const) {
      const p = signupPricing({ admins: bad as number | undefined })
      expect(p.admins).toBe(1)
      expect(p.monthly_cents).toBeGreaterThanOrEqual(PRICING.adminMonthly * 100)
    }
  })

  it('clamps team members up to a minimum of 0 (no negative credit against admin seats)', () => {
    const p = signupPricing({ admins: 1, teamMembers: -5 })
    expect(p.teamMembers).toBe(0)
    expect(p.monthly_cents).toBe(PRICING.adminMonthly * 100)
  })

  it('floors fractional seat counts (no partial-seat billing)', () => {
    const p = signupPricing({ admins: 2.9, teamMembers: 3.9 })
    expect(p.admins).toBe(2)
    expect(p.teamMembers).toBe(3)
  })

  it('computes seat-based monthly in cents and matches computeMonthly', () => {
    const p = signupPricing({ admins: 2, teamMembers: 3 })
    expect(p.monthly_cents).toBe(computeMonthly(2, 3) * 100)
    expect(p.monthly_cents).toBe((2 * PRICING.adminMonthly + 3 * PRICING.teamMemberMonthly) * 100)
  })

  it('always returns the fixed one-time setup fee regardless of seats', () => {
    expect(signupPricing({ admins: 1 }).setup_cents).toBe(PRICING.setupFee * 100)
    expect(signupPricing({ admins: 9, teamMembers: 40 }).setup_cents).toBe(PRICING.setupFee * 100)
  })
})
