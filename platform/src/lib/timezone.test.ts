import { describe, it, expect } from 'vitest'
import { zipToTimezone } from './timezone'

/**
 * zipToTimezone maps a ZIP's 3-digit prefix to a US IANA zone with hard
 * numeric thresholds (<400 ET, <800 CT, <900 MT, else PT) and an ET fallback
 * for unparseable input. Every assertion pins an exact zone at/around a
 * boundary, so shifting any threshold (or flipping < to <=) fails the test.
 */
describe('zipToTimezone', () => {
  it('maps Eastern prefixes (<400) to America/New_York', () => {
    expect(zipToTimezone('10001')).toBe('America/New_York') // prefix 100
    expect(zipToTimezone('39901')).toBe('America/New_York') // prefix 399, last ET
  })

  it('maps Central prefixes (400..799) to America/Chicago', () => {
    expect(zipToTimezone('40000')).toBe('America/Chicago') // prefix 400, first CT
    expect(zipToTimezone('60601')).toBe('America/Chicago') // Chicago proper
    expect(zipToTimezone('79999')).toBe('America/Chicago') // prefix 799, last CT
  })

  it('maps Mountain prefixes (800..899) to America/Denver', () => {
    expect(zipToTimezone('80001')).toBe('America/Denver') // prefix 800, first MT
    expect(zipToTimezone('89999')).toBe('America/Denver') // prefix 899, last MT
  })

  it('maps Pacific prefixes (>=900) to America/Los_Angeles', () => {
    expect(zipToTimezone('90001')).toBe('America/Los_Angeles') // prefix 900, first PT
    expect(zipToTimezone('99999')).toBe('America/Los_Angeles')
  })

  it('falls back to America/New_York for unparseable / empty input', () => {
    expect(zipToTimezone('')).toBe('America/New_York')
    expect(zipToTimezone(null)).toBe('America/New_York')
    expect(zipToTimezone(undefined)).toBe('America/New_York')
    expect(zipToTimezone('abc')).toBe('America/New_York')
  })
})
