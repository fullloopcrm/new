import { describe, it, expect } from 'vitest'
import { generateRecurringDates } from './_recurring'

/**
 * BookingsAdmin.tsx's client-side date generator -- drives BOTH the "next 4
 * bookings" preview shown in the create/edit form AND the real dates array
 * sent to /api/admin/recurring-schedules (initialDates) / /api/bookings/batch
 * for the actual initial booking rows. Not a preview-only helper.
 */

describe('generateRecurringDates — monthly_day (Nth weekday of month)', () => {
  it('includes the anchor date itself as the first occurrence', () => {
    // Previously the anchor month's own occurrence was silently dropped by a
    // midnight-vs-noon Date comparison (`new Date(year,month,targetDate)` at
    // midnight compared LESS than `start` at noon on the exact same calendar
    // day) -- every monthly_day schedule's real first visit vanished, and
    // since the initial-batch cutoff is only 6 weeks out, the schedule was
    // frequently created with ZERO initial bookings.
    const dates = generateRecurringDates('2026-01-12', true, 'monthly_day', 'never', 0, '', 1)
    expect(dates[0]).toBe('2026-01-12')
  })

  it('repeats on the same week-of-month and weekday for months that have it', () => {
    // 2nd Monday: Jan 12, Feb 9, Mar 9, Apr 13 (2026).
    const dates = generateRecurringDates('2026-01-12', true, 'monthly_day', 'after', 4, '', 1)
    expect(dates).toEqual(['2026-01-12', '2026-02-09', '2026-03-09', '2026-04-13'])
  })

  it('falls back to the month\'s last occurrence when a target month has no 5th', () => {
    // May 29 2026 is the 5th Friday of May. June 2026 has only 4 Fridays
    // (5/12/19/26) -- old behavior silently SKIPPED June (and every other
    // non-5th-Friday month) instead of substituting a date, so a customer
    // signed up for "every month" got visits roughly once a quarter.
    const dates = generateRecurringDates('2026-05-29', true, 'monthly_day', 'after', 6, '', 1)
    expect(dates).toEqual([
      '2026-05-29',
      '2026-06-26',
      '2026-07-31',
      '2026-08-28',
      '2026-09-25',
      '2026-10-30',
    ])
  })

  it('honors an on_date end bound without excluding the anchor', () => {
    const dates = generateRecurringDates('2026-01-12', true, 'monthly_day', 'on_date', 0, '2026-03-01', 1)
    expect(dates).toEqual(['2026-01-12', '2026-02-09'])
  })
})
