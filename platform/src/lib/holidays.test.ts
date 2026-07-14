import { describe, it, expect } from 'vitest'
import { isHoliday, filterHolidays, getAllHolidays } from './holidays'

/**
 * US federal/commercial holiday calendar. Pure date math with no I/O, but the
 * public API is anchored to `new Date().getFullYear()` (current + next year are
 * cached), so these tests derive the year at runtime instead of hardcoding it —
 * they stay green in any calendar year. Floating holidays (MLK, Memorial, etc.)
 * are asserted by PROPERTY (right weekday + right week-of-month) rather than a
 * hand-computed date, so the test can't drift and still fix-proofs the
 * nthWeekday/lastWeekday logic: break either and the weekday/week assertion trips.
 */

const YEAR = new Date().getFullYear()

// Weekday of a YYYY-MM-DD string, read at noon to dodge any TZ/DST edge.
function weekdayOf(date: string): number {
  return new Date(date + 'T12:00:00').getDay()
}
function dayOfMonth(date: string): number {
  return parseInt(date.slice(8, 10), 10)
}
function findHoliday(name: string): string {
  const h = getAllHolidays().find((x) => x.name === name)
  if (!h) throw new Error(`holiday not found: ${name}`)
  return h.date
}

const MON = 1
const THU = 4
const FRI = 5

describe('isHoliday — fixed-date federal holidays', () => {
  it.each([
    [`${YEAR}-01-01`, "New Year's Day"],
    [`${YEAR}-07-04`, 'Independence Day'],
    [`${YEAR}-12-24`, 'Christmas Eve'],
    [`${YEAR}-12-25`, 'Christmas Day'],
    [`${YEAR}-12-31`, "New Year's Eve"],
  ])('%s -> %s', (date, name) => {
    expect(isHoliday(date)).toBe(name)
  })

  it('returns null for an ordinary business day (March has no holidays)', () => {
    expect(isHoliday(`${YEAR}-03-17`)).toBeNull()
    expect(isHoliday(`${YEAR}-06-16`)).toBeNull()
  })

  it('covers next year too (current + next are cached)', () => {
    expect(isHoliday(`${YEAR + 1}-07-04`)).toBe('Independence Day')
    expect(isHoliday(`${YEAR + 1}-12-25`)).toBe('Christmas Day')
  })

  it('returns null for a year outside the cached window', () => {
    expect(isHoliday(`${YEAR + 5}-01-01`)).toBeNull()
  })

  it('returns null for garbage / empty input', () => {
    expect(isHoliday('')).toBeNull()
    expect(isHoliday('not-a-date')).toBeNull()
  })
})

describe('floating holidays — computed by weekday and week-of-month', () => {
  it('MLK Day is the 3rd Monday of January', () => {
    const d = findHoliday('MLK Day')
    expect(d.startsWith(`${YEAR}-01-`)).toBe(true)
    expect(weekdayOf(d)).toBe(MON)
    expect(dayOfMonth(d)).toBeGreaterThanOrEqual(15)
    expect(dayOfMonth(d)).toBeLessThanOrEqual(21)
  })

  it("Presidents' Day is the 3rd Monday of February", () => {
    const d = findHoliday("Presidents' Day")
    expect(d.startsWith(`${YEAR}-02-`)).toBe(true)
    expect(weekdayOf(d)).toBe(MON)
    expect(dayOfMonth(d)).toBeGreaterThanOrEqual(15)
    expect(dayOfMonth(d)).toBeLessThanOrEqual(21)
  })

  it('Memorial Day is the LAST Monday of May', () => {
    const d = findHoliday('Memorial Day')
    expect(d.startsWith(`${YEAR}-05-`)).toBe(true)
    expect(weekdayOf(d)).toBe(MON)
    expect(dayOfMonth(d)).toBeGreaterThanOrEqual(25) // last Monday is always >= 25
  })

  it('Labor Day is the 1st Monday of September', () => {
    const d = findHoliday('Labor Day')
    expect(d.startsWith(`${YEAR}-09-`)).toBe(true)
    expect(weekdayOf(d)).toBe(MON)
    expect(dayOfMonth(d)).toBeLessThanOrEqual(7)
  })

  it('Thanksgiving is the 4th Thursday of November', () => {
    const d = findHoliday('Thanksgiving')
    expect(d.startsWith(`${YEAR}-11-`)).toBe(true)
    expect(weekdayOf(d)).toBe(THU)
    expect(dayOfMonth(d)).toBeGreaterThanOrEqual(22)
    expect(dayOfMonth(d)).toBeLessThanOrEqual(28)
  })

  it('Day After Thanksgiving is the Friday immediately after Thanksgiving', () => {
    const thx = findHoliday('Thanksgiving')
    const day = findHoliday('Day After Thanksgiving')
    expect(weekdayOf(day)).toBe(FRI)
    // exactly one day later
    const next = new Date(thx + 'T12:00:00')
    next.setDate(next.getDate() + 1)
    const expected = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
    expect(day).toBe(expected)
  })
})

describe('filterHolidays', () => {
  it('drops holidays and keeps ordinary dates, preserving input order', () => {
    const input = [`${YEAR}-03-17`, `${YEAR}-07-04`, `${YEAR}-06-16`, `${YEAR}-12-25`]
    expect(filterHolidays(input)).toEqual([`${YEAR}-03-17`, `${YEAR}-06-16`])
  })

  it('returns a new array and does not mutate the input', () => {
    const input = [`${YEAR}-07-04`, `${YEAR}-03-17`]
    const out = filterHolidays(input)
    expect(out).not.toBe(input)
    expect(input).toHaveLength(2) // untouched
  })

  it('handles an empty array', () => {
    expect(filterHolidays([])).toEqual([])
  })
})

describe('getAllHolidays', () => {
  const all = getAllHolidays()

  it('returns 11 holidays per year for the current and next year (22 total)', () => {
    expect(all).toHaveLength(22)
  })

  it('every entry is a well-formed YYYY-MM-DD date with a name', () => {
    for (const h of all) {
      expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(h.name.length).toBeGreaterThan(0)
    }
  })

  it('is ordered ascending by date across both years', () => {
    const dates = all.map((h) => h.date)
    const sorted = [...dates].sort((a, b) => a.localeCompare(b))
    expect(dates).toEqual(sorted)
  })

  it('spans exactly the current and next year', () => {
    const years = new Set(all.map((h) => h.date.slice(0, 4)))
    expect([...years].sort()).toEqual([String(YEAR), String(YEAR + 1)])
  })
})
