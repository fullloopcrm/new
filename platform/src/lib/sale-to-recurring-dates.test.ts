/**
 * `computeInitialOccurrenceDates` — the initial ~6-week batch of occurrence
 * dates createSeriesAfterClaim (sale-to-recurring.ts) inserts when a quote
 * converts into a live recurring_schedules series.
 *
 * Previously this math was a flat interval-day loop (a hand-rolled
 * intervalDays() defaulting monthly_date/monthly_weekday to a bare 28-day
 * step) instead of reusing generateRecurringDates' calendar-correct
 * month/week-of-month stepping. 28 days != a calendar month, so a client
 * quoted for "the 15th of every month" got their 2nd visit on the 12th, not
 * the 15th -- and cron/generate-recurring anchors every future visit off
 * that already-wrong date, so the schedule never self-corrects.
 */
import { describe, it, expect } from 'vitest'
import { computeInitialOccurrenceDates } from './sale-to-recurring'

describe('computeInitialOccurrenceDates', () => {
  it('monthly_date holds the same day-of-month, not a flat 28-day step', () => {
    // Old buggy behavior would have produced ['2026-01-15', '2026-02-12'].
    const dates = computeInitialOccurrenceDates('monthly_date', '2026-01-15')
    expect(dates).toEqual(['2026-01-15', '2026-02-15'])
  })

  it('monthly_weekday holds the same week-of-month + weekday across months', () => {
    // Jan 12 2026 is the 2nd Monday of January; the 2nd Monday of February is Feb 9.
    const dates = computeInitialOccurrenceDates('monthly_weekday', '2026-01-12')
    expect(dates).toEqual(['2026-01-12', '2026-02-09'])
  })

  it('weekly still generates 7 dates across the 42-day horizon (parity with prior behavior)', () => {
    const dates = computeInitialOccurrenceDates('weekly', '2026-01-05')
    expect(dates).toEqual([
      '2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26',
      '2026-02-02', '2026-02-09', '2026-02-16',
    ])
  })

  it('biweekly still generates 4 dates across the 42-day horizon (parity with prior behavior)', () => {
    const dates = computeInitialOccurrenceDates('biweekly', '2026-01-05')
    expect(dates).toEqual(['2026-01-05', '2026-01-19', '2026-02-02', '2026-02-16'])
  })

  it('triweekly still generates 3 dates across the 42-day horizon (parity with prior behavior)', () => {
    const dates = computeInitialOccurrenceDates('triweekly', '2026-01-05')
    expect(dates).toEqual(['2026-01-05', '2026-01-26', '2026-02-16'])
  })
})
