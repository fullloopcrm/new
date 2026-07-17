import { describe, it, expect } from 'vitest'
import { generateRecurringDates, buildSeriesUpdateData } from './_recurring'

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

describe('generateRecurringDates — monthly_date (Nth day-of-month), month-end fallback', () => {
  it('holds the same day-of-month for months that have it', () => {
    const dates = generateRecurringDates('2026-01-15', true, 'monthly_date', 'after', 4, '', 1)
    expect(dates).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15'])
  })

  it('falls back to each short month\'s LAST day WITHOUT permanently drifting the anchor day', () => {
    // Old behavior: chaining setMonth() off the previous result let Feb's
    // overflow (Feb 31 -> Mar 3) become the new baseline forever -- Mar 3 ->
    // Apr 3 -> May 3 -> ..., permanently changing a client's real recurring
    // day from the 31st to the 3rd for every future visit, on the exact
    // dates array this form both previews AND submits to create the
    // schedule's real initial bookings.
    const dates = generateRecurringDates('2026-01-31', true, 'monthly_date', 'after', 8, '', 1)
    expect(dates).toEqual([
      '2026-01-31',
      '2026-02-28', // Feb has no 31st -> falls back to Feb's last day
      '2026-03-31', // back to the real 31st, not permanently pinned at 28/3
      '2026-04-30', // Apr has no 31st -> falls back
      '2026-05-31',
      '2026-06-30', // Jun has no 31st -> falls back
      '2026-07-31',
      '2026-08-31',
    ])
  })

  it('honors an on_date end bound without excluding the anchor', () => {
    const dates = generateRecurringDates('2026-01-31', true, 'monthly_date', 'on_date', 0, '2026-04-01', 1)
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })
})

describe('buildSeriesUpdateData — "apply to all future occurrences" batch payload', () => {
  it('writes the lead assignee under bookings\' real team_member_id column, not the nycmaid-era cleaner_id alias', () => {
    // bookings has never had a `cleaner_id` column (only legacy per-tenant
    // site booking tables ported in from nycmaid do). PUT /api/bookings/
    // batch-update spreads this object straight into `.update()` with no
    // field allowlist -- a `cleaner_id` key here 400s every row in the batch
    // with an unknown-column error, silently breaking the entire "apply to
    // all future" edit (price/notes/hours/lead reassignment all skipped via
    // the caller's early `if (!res.ok) return`) whenever the recurring
    // pattern itself wasn't also changed.
    const data = buildSeriesUpdateData({
      startTime: '2026-08-01T09:00:00',
      endTime: '2026-08-01T12:00:00',
      teamMemberId: 'tm-123',
      price: 20000,
      hourlyRate: 69,
      serviceType: 'Standard Cleaning',
      notes: null,
      recurringType: 'Weekly',
    })

    expect(data.team_member_id).toBe('tm-123')
    expect(data).not.toHaveProperty('cleaner_id')
  })

  it('passes through an explicit unassign (null) rather than dropping the key', () => {
    const data = buildSeriesUpdateData({
      startTime: '2026-08-01T09:00:00',
      endTime: '2026-08-01T12:00:00',
      teamMemberId: null,
      price: 20000,
      hourlyRate: 69,
      serviceType: 'Standard Cleaning',
      notes: null,
      recurringType: 'Weekly',
    })

    expect(data).toHaveProperty('team_member_id', null)
  })
})
