import { describe, it, expect } from 'vitest'
import { generateRecurringDates, getRecurringDisplayName } from './_recurring'

// Focused coverage for the 'weekly_days' addition to this file's positional-args
// generateRecurringDates (the client-side duplicate of lib/recurring.ts's
// generateRecurringDates, used by CreateBookingForm/BookingsAdmin/EditBookingForm
// to compute the initial batch + regenerate previews). See src/lib/recurring.test.ts
// for the equivalent coverage of the canonical server-side implementation.

describe('generateRecurringDates (dashboard) — weekly_days', () => {
  it('emits one date per selected weekday, every week, in chronological order', () => {
    // Mon Jan 5 2026 is a Monday -- Mon/Wed/Fri, "never" end (open-ended cap).
    const dates = generateRecurringDates(
      '2026-01-05', true, 'weekly_days', 'never', 10, '', 3,
      [1, 3, 5]
    )
    expect(dates.slice(0, 6)).toEqual([
      '2026-01-05', '2026-01-07', '2026-01-09',
      '2026-01-12', '2026-01-14', '2026-01-16',
    ])
  })

  it('respects "after N occurrences"', () => {
    const dates = generateRecurringDates(
      '2026-01-05', true, 'weekly_days', 'after', 4, '', 3,
      [1, 3, 5]
    )
    expect(dates).toEqual(['2026-01-05', '2026-01-07', '2026-01-09', '2026-01-12'])
  })

  it('respects an explicit end date, excluding anything past it', () => {
    const dates = generateRecurringDates(
      '2026-01-05', true, 'weekly_days', 'on_date', 10, '2026-01-10', 3,
      [1, 3, 5]
    )
    expect(dates).toEqual(['2026-01-05', '2026-01-07', '2026-01-09'])
  })

  it('drops this week\'s selected days that fall before the anchor', () => {
    const dates = generateRecurringDates(
      '2026-01-07', true, 'weekly_days', 'after', 2, '', 3, // Wed Jan 7
      [1, 3, 5]
    )
    expect(dates).toEqual(['2026-01-07', '2026-01-09'])
  })

  it('falls back to the anchor\'s own weekday when daysOfWeek is omitted or empty', () => {
    const omitted = generateRecurringDates('2026-01-05', true, 'weekly_days', 'after', 3, '', 3)
    const empty = generateRecurringDates('2026-01-05', true, 'weekly_days', 'after', 3, '', 3, [])
    const expected = ['2026-01-05', '2026-01-12', '2026-01-19'] // same as plain 'weekly'
    expect(omitted).toEqual(expected)
    expect(empty).toEqual(expected)
  })

  it('returns [startDate] when repeat is disabled, same as every other type', () => {
    expect(generateRecurringDates('2026-01-05', false, 'weekly_days', 'never', 10, '', 3, [1, 3, 5]))
      .toEqual(['2026-01-05'])
  })
})

describe('getRecurringDisplayName (dashboard) — weekly_days', () => {
  it('formats selected days sorted, slash-joined, regardless of input order', () => {
    expect(getRecurringDisplayName('weekly_days', '2026-01-12', [5, 1, 3])).toBe('Mon/Wed/Fri')
  })

  it('falls back to the start date\'s own day name when no days array is given', () => {
    expect(getRecurringDisplayName('weekly_days', '2026-01-12')).toBe('Mon') // Jan 12 2026 is a Monday
    expect(getRecurringDisplayName('weekly_days', '2026-01-12', [])).toBe('Mon')
  })
})
