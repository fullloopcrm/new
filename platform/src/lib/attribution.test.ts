import { describe, it, expect } from 'vitest'
import { calculateConfidence } from './attribution'

/**
 * calculateConfidence turns "minutes since the website touch" into a 0-100
 * attribution score: full confidence for day 1, then -10 points per elapsed
 * day, hitting 0 at day 10+. Each assertion pins the exact score at a day
 * boundary, so shifting the decay rate or the caps fails the test.
 */
describe('calculateConfidence', () => {
  it('is 100 anywhere within the first 24h (day 0)', () => {
    expect(calculateConfidence(0)).toBe(100)
    expect(calculateConfidence(60)).toBe(100)
    expect(calculateConfidence(1439)).toBe(100) // last minute of day 0
  })

  it('drops 10 points per full elapsed day', () => {
    expect(calculateConfidence(1440)).toBe(90)      // day 1
    expect(calculateConfidence(2 * 1440)).toBe(80)  // day 2
    expect(calculateConfidence(9 * 1440)).toBe(10)  // day 9, last non-zero
  })

  it('is 0 at day 10 and beyond', () => {
    expect(calculateConfidence(10 * 1440)).toBe(0)
    expect(calculateConfidence(30 * 1440)).toBe(0)
  })

  it('treats non-positive elapsed time as full confidence', () => {
    expect(calculateConfidence(-5)).toBe(100)
  })
})
