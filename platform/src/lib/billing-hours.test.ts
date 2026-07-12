import { describe, it, expect } from 'vitest'
import { clientBilledHours, cleanerPaidHours } from './billing-hours'

/**
 * Half-hour billing rounding. The whole point of this module is that the client
 * and the cleaner use DIFFERENT grace windows (10 min vs 15 min), so the tests
 * pin the exact minute where the two rules diverge. Revert either grace constant
 * (or collapse them to one shared value) and an assertion below trips.
 */
describe('clientBilledHours — 10-minute grace', () => {
  it('bills 0 half-hours at exactly the grace edge (10 min)', () => {
    // 10 min is NOT past 10 → stays at 0.0
    expect(clientBilledHours(10)).toBe(0)
  })

  it('rounds up to 0.5 once past 10 min (11 min)', () => {
    expect(clientBilledHours(11)).toBe(0.5)
  })

  it('exact half-hour multiples do not round up (30 → 0.5, 60 → 1.0)', () => {
    expect(clientBilledHours(30)).toBe(0.5)
    expect(clientBilledHours(60)).toBe(1)
  })

  it('41 min → 1.0 (past the 10-min grace into the 2nd block)', () => {
    // 41 = one full 30 block + 11 remainder; 11 > 10 grace → round up
    expect(clientBilledHours(41)).toBe(1)
  })

  it('40 min → 0.5 (10 remainder is not PAST 10)', () => {
    expect(clientBilledHours(40)).toBe(0.5)
  })

  it('clamps negatives to 0', () => {
    expect(clientBilledHours(-5)).toBe(0)
  })
})

describe('cleanerPaidHours — 15-minute grace', () => {
  it('does NOT round up at 15 min (grace edge)', () => {
    expect(cleanerPaidHours(15)).toBe(0)
  })

  it('rounds up to 0.5 once past 15 min (16 min)', () => {
    expect(cleanerPaidHours(16)).toBe(0.5)
  })

  it('45 min → 0.5 (remainder 15 is not PAST 15)', () => {
    expect(cleanerPaidHours(45)).toBe(0.5)
  })

  it('46 min → 1.0 (remainder 16 rounds up)', () => {
    expect(cleanerPaidHours(46)).toBe(1)
  })
})

describe('client vs cleaner divergence', () => {
  it('at 41 min the client is billed 1.0h but the cleaner is paid 0.5h', () => {
    // The core reason the module exists: a few minutes over earns the client a
    // charge (past 10) but NOT the cleaner (not past 15). If the two grace
    // windows are ever collapsed, these two values become equal and this fails.
    expect(clientBilledHours(41)).toBe(1)
    expect(cleanerPaidHours(41)).toBe(0.5)
    expect(clientBilledHours(41)).not.toBe(cleanerPaidHours(41))
  })
})
