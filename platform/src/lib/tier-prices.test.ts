import { describe, it, expect } from 'vitest'
import { signupPricing } from './tier-prices'
import { PRICING } from './billing-pricing'

/**
 * Seat-based signup pricing in CENTS. The security-relevant invariant is the
 * 1-admin clamp: a self-serve checkout must never resolve to $0/mo. These pin
 * the clamp, the floor(), and the ×100 cents conversion by asserting exact
 * integer cent totals.
 */
describe('signupPricing', () => {
  it('clamps to a minimum of 1 admin when given 0', () => {
    const p = signupPricing({ admins: 0, teamMembers: 0 })
    expect(p.admins).toBe(1)
    // 1 admin = $2,500/mo = 250,000 cents — NOT zero.
    expect(p.monthly_cents).toBe(PRICING.adminMonthly * 100)
    expect(p.monthly_cents).toBe(250000)
    expect(p.monthly_cents).toBeGreaterThan(0)
  })

  it('clamps to 1 admin when nothing is passed at all', () => {
    const p = signupPricing()
    expect(p.admins).toBe(1)
    expect(p.teamMembers).toBe(0)
    expect(p.monthly_cents).toBe(250000)
  })

  it('converts the setup fee to cents (×100)', () => {
    expect(signupPricing().setup_cents).toBe(PRICING.setupFee * 100)
    expect(signupPricing().setup_cents).toBe(2500000)
  })

  it('computes monthly cents from both seat classes', () => {
    const p = signupPricing({ admins: 2, teamMembers: 3 })
    // (2*2500 + 3*250) * 100 = 5,750 * 100 = 575,000
    expect(p.monthly_cents).toBe(575000)
    expect(p.admins).toBe(2)
    expect(p.teamMembers).toBe(3)
  })

  it('floors fractional seat counts', () => {
    const p = signupPricing({ admins: 2.9, teamMembers: 3.9 })
    expect(p.admins).toBe(2)
    expect(p.teamMembers).toBe(3)
    expect(p.monthly_cents).toBe(575000)
  })

  it('floors team members to a minimum of 0 (no negative seats)', () => {
    const p = signupPricing({ admins: 1, teamMembers: -5 })
    expect(p.teamMembers).toBe(0)
    expect(p.monthly_cents).toBe(250000)
  })
})
