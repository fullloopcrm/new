import { describe, it, expect } from 'vitest'
import { effectiveCleanerRate, isPremiumPayZone, REGION_PREMIUM_RATE } from './cleaner-pay'

/**
 * Payout floor (money path). A job in a NYC-metro premium region (NJ, Long
 * Island, Westchester) pays the worker a FLAT $35/hr regardless of their usual
 * rate — job-location based. This is the money-critical branch shared by the
 * SMS payment-processor, the team-portal checkout, and the Stripe webhook payout
 * paths, so a regression here mis-pays every worker in those regions.
 *
 * service-zones.test.ts covers guessZoneFromAddress; this file locks the payout
 * layer on top of it, including the Long-Island ZIP backstop that
 * guessZoneFromAddress deliberately does NOT carry.
 */

describe('isPremiumPayZone', () => {
  it('returns false for a null / undefined / empty address (no zone → not gated)', () => {
    expect(isPremiumPayZone(null)).toBe(false)
    expect(isPremiumPayZone(undefined)).toBe(false)
    expect(isPremiumPayZone('')).toBe(false)
  })

  it('flags NJ Hudson (Hoboken / Jersey City) as premium', () => {
    expect(isPremiumPayZone('123 Washington St, Hoboken, NJ 07030')).toBe(true)
    expect(isPremiumPayZone('50 Journal Sq, Jersey City, NJ')).toBe(true)
  })

  it('flags other NJ (Bergen inland) as premium', () => {
    expect(isPremiumPayZone('10 Main St, Fort Lee, NJ')).toBe(true)
  })

  it('flags Long Island and Westchester (by word) as premium', () => {
    expect(isPremiumPayZone('5 Ocean Ave, Long Island, NY')).toBe(true)
    expect(isPremiumPayZone('1 Main St, Yonkers, NY 10701')).toBe(true)
  })

  it('flags Long Island via the ZIP backstop even when the town name is not recognized', () => {
    // guessZoneFromAddress misses Hempstead (11550) and Long Beach (11561) by
    // name — the payout-only ZIP backstop catches them so LI workers still get $35.
    expect(isPremiumPayZone('20 Front St, Hempstead, NY 11550')).toBe(true)
    expect(isPremiumPayZone('7 Shore Rd, Long Beach, NY 11561')).toBe(true)
    expect(isPremiumPayZone('Suffolk County 11780')).toBe(true)
  })

  it('does NOT flag Queens 116xx (Far Rockaway) — the backstop excludes 116xx', () => {
    expect(isPremiumPayZone('100 Beach 20th St, Far Rockaway, NY 11691')).toBe(false)
  })

  it('does NOT flag core NYC (Manhattan / Brooklyn) as premium', () => {
    expect(isPremiumPayZone('350 5th Ave, New York, NY 10118')).toBe(false)
    expect(isPremiumPayZone('200 Kent Ave, Brooklyn, NY 11249')).toBe(false)
  })
})

describe('effectiveCleanerRate', () => {
  it('pays the flat premium rate in a premium zone, overriding a LOWER base rate', () => {
    expect(effectiveCleanerRate(20, '123 Washington St, Hoboken, NJ')).toBe(REGION_PREMIUM_RATE)
    expect(REGION_PREMIUM_RATE).toBe(35)
  })

  it('pays the flat premium rate in a premium zone, overriding a HIGHER base rate', () => {
    // Worker who normally bills $50 is still capped/floored to the flat $35 for
    // a premium-region job (it is a flat regional rate, not a max()).
    expect(effectiveCleanerRate(50, '20 Front St, Hempstead, NY 11550')).toBe(35)
  })

  it('passes the base rate through unchanged outside premium zones', () => {
    expect(effectiveCleanerRate(42, '350 5th Ave, New York, NY 10118')).toBe(42)
    expect(effectiveCleanerRate(25, null)).toBe(25)
    expect(effectiveCleanerRate(25, '')).toBe(25)
  })
})
