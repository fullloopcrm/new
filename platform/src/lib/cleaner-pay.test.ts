import { describe, it, expect } from 'vitest'
import { isPremiumPayZone, effectiveCleanerRate, REGION_PREMIUM_RATE } from './cleaner-pay'

/**
 * Regional worker pay: a flat $35/hr in NJ / Long Island / Westchester premium
 * zones, regardless of the worker's base rate. The most load-bearing bit is the
 * Long Island ZIP backstop — guessZoneFromAddress misses towns like Hempstead
 * (11550) and Long Beach (11561) because it only matches the words
 * Nassau/Suffolk/Long Island, so cleaner-pay adds a ZIP regex on top. These
 * tests fail if that backstop or the premium-zone set is removed.
 */
describe('isPremiumPayZone', () => {
  it('is false for null/empty address', () => {
    expect(isPremiumPayZone(null)).toBe(false)
    expect(isPremiumPayZone(undefined)).toBe(false)
    expect(isPremiumPayZone('')).toBe(false)
  })

  it('is true for a Hudson-waterfront NJ address (nj_hudson zone)', () => {
    expect(isPremiumPayZone('123 Washington St, Hoboken, NJ 07030')).toBe(true)
  })

  it('is true for inland NJ (nj_other zone)', () => {
    expect(isPremiumPayZone('50 Main St, Teaneck, NJ')).toBe(true)
  })

  it('is true for Westchester (word match)', () => {
    expect(isPremiumPayZone('10 Elm Ave, Yonkers, NY')).toBe(true)
  })

  it('is true for Long Island via the ZIP backstop even when the words are absent', () => {
    // Hempstead 11550 — guessZoneFromAddress returns null here (no LI keyword),
    // so ONLY the LONG_ISLAND_ZIP regex can catch it.
    expect(isPremiumPayZone('90 Front St, Hempstead, NY 11550')).toBe(true)
    // Long Beach 11561 — same story.
    expect(isPremiumPayZone('1 Shore Rd, Long Beach, NY 11561')).toBe(true)
  })

  it('is FALSE for Queens ZIPs the LI backstop deliberately excludes (116xx / 114xx)', () => {
    // Far Rockaway 11691 (116xx) and 114xx are Queens, not the LI premium zone.
    expect(isPremiumPayZone('12-34 Beach 20th St, Far Rockaway, NY 11691')).toBe(false)
    expect(isPremiumPayZone('100 Union Tpke, Queens, NY 11040')).toBe(false)
  })

  it('is false for a plain Manhattan address (no premium)', () => {
    expect(isPremiumPayZone('200 W 57th St, New York, NY 10019')).toBe(false)
  })
})

describe('effectiveCleanerRate', () => {
  it('returns the flat premium rate in a premium zone, ignoring base rate', () => {
    expect(effectiveCleanerRate(28, 'Hoboken, NJ')).toBe(REGION_PREMIUM_RATE)
    expect(effectiveCleanerRate(28, 'Hoboken, NJ')).toBe(35)
    // Even a higher base rate is overridden DOWN to the flat 35 in-region.
    expect(effectiveCleanerRate(50, '90 Front St, Hempstead, NY 11550')).toBe(35)
  })

  it('returns the worker base rate outside premium zones', () => {
    expect(effectiveCleanerRate(28, '200 W 57th St, New York, NY 10019')).toBe(28)
    expect(effectiveCleanerRate(42, null)).toBe(42)
  })
})
