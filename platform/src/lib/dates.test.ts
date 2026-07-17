import { describe, it, expect } from 'vitest'
import { etYMD, etMidnightUtc, toNaiveET, naiveETDayRange } from './dates'

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

describe('toNaiveET', () => {
  it('formats a UTC instant as naive ET wall-clock under EST (UTC-5)', () => {
    // 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
    expect(toNaiveET(new Date('2026-01-06T00:30:00.000Z'))).toBe('2026-01-05T19:30:00')
  })

  it('formats a UTC instant as naive ET wall-clock under EDT (UTC-4)', () => {
    // 2026-07-05T23:15:00Z = 7:15pm EDT Jul 5.
    expect(toNaiveET(new Date('2026-07-05T23:15:00.000Z'))).toBe('2026-07-05T19:15:00')
  })

  it('rolls to the correct ET calendar day when UTC has already advanced past midnight', () => {
    // Same instant as the first case: UTC is Jan 6, ET is still Jan 5.
    expect(toNaiveET(new Date('2026-01-06T04:59:00.000Z'))).toBe('2026-01-05T23:59:00')
  })
})

describe('naiveETDayRange', () => {
  it('returns today\'s naive-ET range for offset 0, using the ET calendar day not the UTC one', () => {
    // 2026-01-06T00:30:00Z = 7:30pm EST Jan 5 -- UTC has already rolled to Jan 6.
    const { start, end } = naiveETDayRange(new Date('2026-01-06T00:30:00.000Z'), 0)
    expect(start).toBe('2026-01-05T00:00:00')
    expect(end).toBe('2026-01-05T23:59:59')
  })

  it('returns tomorrow\'s naive-ET range for offset 1', () => {
    const { start, end } = naiveETDayRange(new Date('2026-01-06T00:30:00.000Z'), 1)
    expect(start).toBe('2026-01-06T00:00:00')
    expect(end).toBe('2026-01-06T23:59:59')
  })

  it('returns a past naive-ET range for a negative offset, crossing a month boundary', () => {
    const { start, end } = naiveETDayRange(new Date('2026-02-01T12:00:00.000Z'), -3)
    expect(start).toBe('2026-01-29T00:00:00')
    expect(end).toBe('2026-01-29T23:59:59')
  })
})
