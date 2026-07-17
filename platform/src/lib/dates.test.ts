import { describe, it, expect } from 'vitest'
import { etYMD, etMidnightUtc } from './dates'

describe('etYMD', () => {
  it('reads the ET calendar day, not the UTC calendar day, during the evening offset window', () => {
    // 2026-01-06T00:30:00Z = 7:30pm EST Jan 5 -- UTC has already rolled to Jan 6.
    const { y, m, d } = etYMD(new Date('2026-01-06T00:30:00.000Z'))
    expect(`${y}-${m}-${d}`).toBe('2026-1-5')
  })
})

describe('etMidnightUtc', () => {
  it('returns the correct UTC instant for ET midnight under EST (UTC-5)', () => {
    // Jan 5 midnight EST = Jan 5 05:00 UTC.
    const instant = etMidnightUtc(2026, 1, 5)
    expect(instant.toISOString()).toBe('2026-01-05T05:00:00.000Z')
  })

  it('returns the correct UTC instant for ET midnight under EDT (UTC-4)', () => {
    // Jul 5 midnight EDT = Jul 5 04:00 UTC.
    const instant = etMidnightUtc(2026, 7, 5)
    expect(instant.toISOString()).toBe('2026-07-05T04:00:00.000Z')
  })

  it('round-trips back to the same ET calendar day', () => {
    const instant = etMidnightUtc(2026, 7, 5)
    const { y, m, d } = etYMD(instant)
    expect(`${y}-${m}-${d}`).toBe('2026-7-5')
  })
})
