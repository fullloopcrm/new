import { describe, it, expect } from 'vitest'
import { validateSqftTiers, resolveSqftTierPriceCents } from './sqft-pricing'

describe('validateSqftTiers', () => {
  it('accepts null/undefined as "no tiers configured yet"', () => {
    expect(validateSqftTiers(null)).toEqual({ tiers: null, error: null })
    expect(validateSqftTiers(undefined)).toEqual({ tiers: null, error: null })
  })

  it('accepts an empty array as "no tiers configured yet"', () => {
    expect(validateSqftTiers([])).toEqual({ tiers: null, error: null })
  })

  it('rejects a non-array', () => {
    expect(validateSqftTiers({ max_sqft: 5000, price_cents: 5500 }).error).toMatch(/must be an array/)
  })

  it('accepts an ascending list ending in a null catch-all tier', () => {
    const input = [
      { max_sqft: 5000, price_cents: 5500 },
      { max_sqft: 10000, price_cents: 7500 },
      { max_sqft: null, price_cents: 9500 },
    ]
    expect(validateSqftTiers(input)).toEqual({ tiers: input, error: null })
  })

  it('accepts a list with no catch-all (every tier bounded)', () => {
    const input = [{ max_sqft: 5000, price_cents: 5500 }, { max_sqft: 10000, price_cents: 7500 }]
    expect(validateSqftTiers(input)).toEqual({ tiers: input, error: null })
  })

  it('rejects a null max_sqft on a non-last tier', () => {
    const input = [{ max_sqft: null, price_cents: 5500 }, { max_sqft: 10000, price_cents: 7500 }]
    expect(validateSqftTiers(input).error).toMatch(/catch-all/)
  })

  it('rejects non-ascending max_sqft', () => {
    const input = [{ max_sqft: 10000, price_cents: 7500 }, { max_sqft: 5000, price_cents: 5500 }]
    expect(validateSqftTiers(input).error).toMatch(/greater than the previous/)
  })

  it('rejects a repeated max_sqft (not strictly increasing)', () => {
    const input = [{ max_sqft: 5000, price_cents: 5500 }, { max_sqft: 5000, price_cents: 7500 }]
    expect(validateSqftTiers(input).error).toMatch(/greater than the previous/)
  })

  it('rejects a zero or negative max_sqft', () => {
    expect(validateSqftTiers([{ max_sqft: 0, price_cents: 100 }]).error).toMatch(/positive integer/)
    expect(validateSqftTiers([{ max_sqft: -100, price_cents: 100 }]).error).toMatch(/positive integer/)
  })

  it('rejects a non-integer max_sqft', () => {
    expect(validateSqftTiers([{ max_sqft: 500.5, price_cents: 100 }]).error).toMatch(/positive integer/)
  })

  it('rejects a negative price_cents', () => {
    expect(validateSqftTiers([{ max_sqft: 5000, price_cents: -1 }]).error).toMatch(/non-negative integer/)
  })

  it('rejects a non-integer price_cents (fractional cents)', () => {
    expect(validateSqftTiers([{ max_sqft: 5000, price_cents: 55.5 }]).error).toMatch(/non-negative integer/)
  })

  it('rejects more than 20 tiers', () => {
    const input = Array.from({ length: 21 }, (_, i) => ({ max_sqft: (i + 1) * 1000, price_cents: 100 }))
    expect(validateSqftTiers(input).error).toMatch(/at most 20/)
  })

  it('rejects a non-object tier entry', () => {
    expect(validateSqftTiers([5000]).error).toMatch(/must be an object/)
  })
})

describe('resolveSqftTierPriceCents', () => {
  const tiers = [
    { max_sqft: 5000, price_cents: 5500 },
    { max_sqft: 10000, price_cents: 7500 },
    { max_sqft: null, price_cents: 9500 },
  ]

  it('returns null when no tiers are configured', () => {
    expect(resolveSqftTierPriceCents(null, 4000)).toBeNull()
    expect(resolveSqftTierPriceCents([], 4000)).toBeNull()
  })

  it('returns null when the property sqft is unknown', () => {
    expect(resolveSqftTierPriceCents(tiers, null)).toBeNull()
    expect(resolveSqftTierPriceCents(tiers, undefined)).toBeNull()
  })

  it('returns null for a non-positive sqft (bad data, not a real lot size)', () => {
    expect(resolveSqftTierPriceCents(tiers, 0)).toBeNull()
    expect(resolveSqftTierPriceCents(tiers, -500)).toBeNull()
  })

  it('picks the first tier the sqft fits within', () => {
    expect(resolveSqftTierPriceCents(tiers, 2000)).toBe(5500)
    expect(resolveSqftTierPriceCents(tiers, 5000)).toBe(5500) // exact boundary is inclusive
  })

  it('picks the next tier just above a boundary', () => {
    expect(resolveSqftTierPriceCents(tiers, 5001)).toBe(7500)
    expect(resolveSqftTierPriceCents(tiers, 10000)).toBe(7500)
  })

  it('falls into the catch-all tier for anything larger than the last bounded tier', () => {
    expect(resolveSqftTierPriceCents(tiers, 10001)).toBe(9500)
    expect(resolveSqftTierPriceCents(tiers, 1_000_000)).toBe(9500)
  })

  it('charges the top tier price when there is no catch-all and sqft exceeds every bound', () => {
    const noCatchAll = [{ max_sqft: 5000, price_cents: 5500 }, { max_sqft: 10000, price_cents: 7500 }]
    expect(resolveSqftTierPriceCents(noCatchAll, 50000)).toBe(7500)
  })

  it('a single catch-all-only tier prices everything the same', () => {
    expect(resolveSqftTierPriceCents([{ max_sqft: null, price_cents: 6000 }], 1)).toBe(6000)
    expect(resolveSqftTierPriceCents([{ max_sqft: null, price_cents: 6000 }], 999999)).toBe(6000)
  })
})
