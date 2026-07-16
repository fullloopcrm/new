import { describe, it, expect } from 'vitest'
import {
  generateRecurringDates,
  getRecurringDisplayName,
  computeNaiveVisitWindow,
  nextOccurrenceDates,
  type RecurringType,
} from './recurring'

/**
 * recurring.ts — recurring date generation for scheduling. Load-bearing: these
 * dates become real bookings on real calendars, so an off-by-one or a silently
 * dropped occurrence mis-schedules a paying customer.
 *
 * generateRecurringDates works on local `Date` objects and advances via
 * setDate/setMonth (calendar-field math, not absolute-ms), which is DST-robust
 * for the DATE component. To keep assertions deterministic in any timezone we
 * anchor starts at NOON (dodging the DST transition hour) and assert on the
 * calendar components (year/month/day) rather than raw timestamps.
 *
 * Runner TZ here is America/New_York (spring-forward 2026-03-08, fall-back
 * 2026-11-01); the DST cases deliberately straddle those boundaries.
 */

// Local YYYY-MM-DD for a Date's calendar fields (TZ-independent for the date).
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Whole-day gap between two dates by calendar (rounds away DST 23/25h days).
function dayGap(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}
// Noon-anchored start so setDate math never trips over the DST hour.
function noon(year: number, monthIdx: number, day: number): Date {
  return new Date(year, monthIdx, day, 12, 0, 0, 0)
}

describe('generateRecurringDates — counts per type', () => {
  const start = noon(2026, 0, 5) // Mon Jan 5 2026, noon

  it('daily generates weeksToGenerate * 7 consecutive days', () => {
    const dates = generateRecurringDates({ recurringType: 'daily', startDate: start, weeksToGenerate: 2 })
    expect(dates).toHaveLength(14)
    for (let i = 1; i < dates.length; i++) {
      expect(dayGap(dates[i - 1], dates[i])).toBe(1)
    }
    expect(ymd(dates[0])).toBe('2026-01-05')
    expect(ymd(dates[13])).toBe('2026-01-18')
  })

  it('weekly generates weeksToGenerate dates, 7 days apart', () => {
    const dates = generateRecurringDates({ recurringType: 'weekly', startDate: start, weeksToGenerate: 4 })
    expect(dates).toHaveLength(4)
    for (let i = 1; i < dates.length; i++) expect(dayGap(dates[i - 1], dates[i])).toBe(7)
    expect(dates.map(ymd)).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'])
  })

  it('biweekly steps 14 days', () => {
    const dates = generateRecurringDates({ recurringType: 'biweekly', startDate: start, weeksToGenerate: 3 })
    expect(dates).toHaveLength(3)
    for (let i = 1; i < dates.length; i++) expect(dayGap(dates[i - 1], dates[i])).toBe(14)
    expect(dates.map(ymd)).toEqual(['2026-01-05', '2026-01-19', '2026-02-02'])
  })

  it('triweekly steps 21 days', () => {
    const dates = generateRecurringDates({ recurringType: 'triweekly', startDate: start, weeksToGenerate: 3 })
    expect(dates).toHaveLength(3)
    for (let i = 1; i < dates.length; i++) expect(dayGap(dates[i - 1], dates[i])).toBe(21)
    expect(dates.map(ymd)).toEqual(['2026-01-05', '2026-01-26', '2026-02-16'])
  })

  it('custom returns exactly the start date', () => {
    const dates = generateRecurringDates({ recurringType: 'custom', startDate: start, weeksToGenerate: 4 })
    expect(dates).toHaveLength(1)
    expect(ymd(dates[0])).toBe('2026-01-05')
  })

  it('defaults weeksToGenerate to 4 when omitted', () => {
    const dates = generateRecurringDates({ recurringType: 'weekly', startDate: start })
    expect(dates).toHaveLength(4)
  })

  it('weeksToGenerate = 0 yields no dates', () => {
    const dates = generateRecurringDates({ recurringType: 'weekly', startDate: start, weeksToGenerate: 0 })
    expect(dates).toEqual([])
  })

  it('does not mutate the caller-supplied startDate', () => {
    const original = noon(2026, 0, 5)
    const snapshot = original.getTime()
    generateRecurringDates({ recurringType: 'daily', startDate: original, weeksToGenerate: 4 })
    expect(original.getTime()).toBe(snapshot)
  })

  it('returns fresh Date instances (not aliases of the internal cursor)', () => {
    const dates = generateRecurringDates({ recurringType: 'weekly', startDate: start, weeksToGenerate: 2 })
    expect(dates[0]).not.toBe(dates[1])
    dates[0].setFullYear(1999)
    expect(dates[1].getFullYear()).toBe(2026) // mutating one must not touch another
  })
})

describe('generateRecurringDates — DST boundaries (America/New_York)', () => {
  it('daily across spring-forward (2026-03-08) keeps consecutive calendar days', () => {
    const start = noon(2026, 2, 6) // Fri Mar 6, two days before spring-forward
    const dates = generateRecurringDates({ recurringType: 'daily', startDate: start, weeksToGenerate: 1 })
    expect(dates.slice(0, 5).map(ymd)).toEqual([
      '2026-03-06',
      '2026-03-07',
      '2026-03-08', // clocks jump 02:00->03:00; the calendar day is intact
      '2026-03-09',
      '2026-03-10',
    ])
  })

  it('weekly straddling fall-back (2026-11-01) lands on the same weekday', () => {
    const start = noon(2026, 9, 26) // Mon Oct 26
    const dates = generateRecurringDates({ recurringType: 'weekly', startDate: start, weeksToGenerate: 3 })
    expect(dates.map(ymd)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09'])
    for (const d of dates) expect(d.getDay()).toBe(1) // still Monday across the DST change
  })
})

describe('generateRecurringDates — monthly_date (setMonth day-of-month math)', () => {
  it('holds the same day-of-month across months', () => {
    const dates = generateRecurringDates({
      recurringType: 'monthly_date',
      startDate: noon(2026, 0, 15), // 15th
      weeksToGenerate: 4,
    })
    expect(dates.map(ymd)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15'])
  })

  it('crosses a year boundary correctly', () => {
    const dates = generateRecurringDates({
      recurringType: 'monthly_date',
      startDate: noon(2026, 10, 10), // Nov 10 2026
      weeksToGenerate: 3,
    })
    expect(dates.map(ymd)).toEqual(['2026-11-10', '2026-12-10', '2027-01-10'])
  })

  it('month-end (Jan 31) overflows per JS Date semantics — pinned, not "fixed"', () => {
    // setMonth on a 31st rolls short months forward (Feb 31 -> Mar 3). This is a
    // known JS Date quirk the current impl inherits; assert the ACTUAL behavior
    // so a future change to it is a conscious, visible decision rather than a
    // silent scheduling shift.
    const dates = generateRecurringDates({
      recurringType: 'monthly_date',
      startDate: noon(2026, 0, 31), // Jan 31 2026
      weeksToGenerate: 4,
    })
    // Jan31 -> +1mo lands Mar 3 (Feb overflow) -> +1mo Apr 3 -> +1mo May 3.
    expect(dates.map(ymd)).toEqual(['2026-01-31', '2026-03-03', '2026-04-03', '2026-05-03'])
  })

  it('leap-day start (2028-02-29) advances without throwing', () => {
    const dates = generateRecurringDates({
      recurringType: 'monthly_date',
      startDate: noon(2028, 1, 29), // Feb 29 2028 (2028 is a leap year)
      weeksToGenerate: 2,
    })
    expect(ymd(dates[0])).toBe('2028-02-29')
    // Mar has 29 days available, so the 29th holds.
    expect(ymd(dates[1])).toBe('2028-03-29')
  })
})

describe('generateRecurringDates — monthly_weekday (nth weekday of month)', () => {
  it('repeats the same week-of-month and weekday (2nd Monday)', () => {
    // Jan 12 2026 is the 2nd Monday of January.
    const dates = generateRecurringDates({
      recurringType: 'monthly_weekday',
      startDate: noon(2026, 0, 12),
      weeksToGenerate: 3,
    })
    expect(dates).toHaveLength(3)
    for (const d of dates) {
      expect(d.getDay()).toBe(1) // Monday
      expect(Math.ceil(d.getDate() / 7)).toBe(2) // 2nd week
    }
    // 2nd Monday: Jan 12, Feb 9, Mar 9 (2026).
    expect(dates.map(ymd)).toEqual(['2026-01-12', '2026-02-09', '2026-03-09'])
  })

  it('honors an explicit dayOfWeek override', () => {
    // Start on a Monday but ask for the "same-week" FRIDAY (day 5).
    const dates = generateRecurringDates({
      recurringType: 'monthly_weekday',
      startDate: noon(2026, 0, 12), // week-of-month = 2
      dayOfWeek: 5,
      weeksToGenerate: 2,
    })
    // i=0 always pushes the raw start; the override only steers later months.
    expect(ymd(dates[0])).toBe('2026-01-12')
    expect(dates[1].getDay()).toBe(5) // Friday
    expect(Math.ceil(dates[1].getDate() / 7)).toBe(2) // 2nd Friday of Feb -> Feb 13
    expect(ymd(dates[1])).toBe('2026-02-13')
  })

  it('1st weekday of month resolves to the first occurrence', () => {
    // Sep 7 2026 is the 1st Monday (Labor Day).
    const dates = generateRecurringDates({
      recurringType: 'monthly_weekday',
      startDate: noon(2026, 8, 7),
      weeksToGenerate: 2,
    })
    expect(Math.ceil(dates[0].getDate() / 7)).toBe(1)
    expect(dates[1].getDay()).toBe(1)
    expect(Math.ceil(dates[1].getDate() / 7)).toBe(1) // 1st Monday of Oct -> Oct 5
    expect(ymd(dates[1])).toBe('2026-10-05')
  })
})

describe('getRecurringDisplayName', () => {
  const anyDate = '2026-01-12' // a 2nd Monday

  it('returns null for an empty start date', () => {
    expect(getRecurringDisplayName('weekly', '')).toBeNull()
  })

  it.each<[RecurringType | string, string]>([
    ['daily', 'Daily'],
    ['weekly', 'Weekly'],
    ['biweekly', 'Bi-weekly'],
    ['triweekly', 'Tri-weekly'],
    ['monthly_date', 'Monthly'],
    ['custom', 'Custom'],
  ])('maps %s -> %s', (type, label) => {
    expect(getRecurringDisplayName(type, anyDate)).toBe(label)
  })

  it('monthly_day renders "<Nth> <Day>" from the start date', () => {
    // Jan 12 2026 -> 2nd Monday.
    expect(getRecurringDisplayName('monthly_day', '2026-01-12')).toBe('2nd Mon')
    // Jan 5 2026 -> 1st Monday.
    expect(getRecurringDisplayName('monthly_day', '2026-01-05')).toBe('1st Mon')
    // Jan 29 2026 -> 5th Thursday.
    expect(getRecurringDisplayName('monthly_day', '2026-01-29')).toBe('5th Thu')
  })

  it('reads the date at noon so a UTC-negative TZ does not slip a day', () => {
    // If parsed as bare midnight-UTC, ET would render the prior day. Noon dodges it.
    expect(getRecurringDisplayName('monthly_day', '2026-03-02')).toBe('1st Mon')
  })

  it('returns null for an unknown repeat type', () => {
    expect(getRecurringDisplayName('yearly', anyDate)).toBeNull()
    expect(getRecurringDisplayName('', anyDate)).toBeNull()
  })
})

describe('computeNaiveVisitWindow', () => {
  it('same-day visit: end stays on the same date', () => {
    const w = computeNaiveVisitWindow('2026-08-01', 9, 0, 2)
    expect(w.startISO).toBe('2026-08-01T09:00:00')
    expect(w.endISO).toBe('2026-08-01T11:00:00')
  })

  it('midnight-crossing visit rolls the end onto the NEXT calendar date', () => {
    // Regression: the old `% 24` truncation wrapped 26:00 -> "02:00" on the
    // SAME date, producing an end_time before start_time instead of
    // advancing the date. 23:00 start + 3h duration must land 02:00 the
    // following day.
    const w = computeNaiveVisitWindow('2026-08-01', 23, 0, 3)
    expect(w.startISO).toBe('2026-08-01T23:00:00')
    expect(w.endISO).toBe('2026-08-02T02:00:00')
    expect(new Date(w.endISO + 'Z').getTime()).toBeGreaterThan(new Date(w.startISO + 'Z').getTime())
  })

  it('exactly-midnight end (24:00 total) rolls to 00:00 the next date', () => {
    const w = computeNaiveVisitWindow('2026-08-01', 22, 0, 2)
    expect(w.endISO).toBe('2026-08-02T00:00:00')
  })

  it('multi-day-spanning duration advances multiple calendar dates', () => {
    const w = computeNaiveVisitWindow('2026-08-01', 10, 0, 50) // 50h > 2 days
    expect(w.endISO).toBe('2026-08-03T12:00:00')
  })

  it('does not slip a date across a DST spring-forward boundary', () => {
    // 2026-03-08 is US spring-forward; a naive local Date +1 day could trip
    // on the missing hour. The noon-UTC anchor should be unaffected.
    const w = computeNaiveVisitWindow('2026-03-08', 23, 0, 2)
    expect(w.endISO).toBe('2026-03-09T01:00:00')
  })
})

describe('nextOccurrenceDates — cron refill anchoring (regression)', () => {
  // Regression: cron/generate-recurring used to anchor the refill batch on
  // lastOccurrence + 1 DAY (not + one interval), which — because
  // generateRecurringDates emits its startDate verbatim as dates[0] — made
  // the first (and every subsequent) refilled date land exactly 1 day after
  // the last real visit instead of a full interval later. A weekly Monday
  // series would refill onto Tuesday, then Wednesday next cycle, drifting
  // forever. nextOccurrenceDates anchors on lastOccurrence itself and drops
  // the echoed first result, so the interval math is never truncated.

  it('weekly: first new date is a full 7 days after the last occurrence, not 1', () => {
    const lastMonday = noon(2026, 0, 5) // Mon Jan 5 2026
    const dates = nextOccurrenceDates({ recurringType: 'weekly', lastOccurrence: lastMonday, count: 4 })
    expect(dates).toHaveLength(4)
    expect(dayGap(lastMonday, dates[0])).toBe(7)
    expect(dates.map(ymd)).toEqual(['2026-01-12', '2026-01-19', '2026-01-26', '2026-02-02'])
    for (const d of dates) expect(d.getDay()).toBe(1) // stays Monday forever, not drifting
  })

  it('biweekly: first new date is a full 14 days after the last occurrence', () => {
    const last = noon(2026, 0, 5) // Mon Jan 5 2026
    const dates = nextOccurrenceDates({ recurringType: 'biweekly', lastOccurrence: last, count: 3 })
    expect(dayGap(last, dates[0])).toBe(14)
    expect(dates.map(ymd)).toEqual(['2026-01-19', '2026-02-02', '2026-02-16'])
  })

  it('triweekly: first new date is a full 21 days after the last occurrence', () => {
    const last = noon(2026, 0, 5)
    const dates = nextOccurrenceDates({ recurringType: 'triweekly', lastOccurrence: last, count: 2 })
    expect(dayGap(last, dates[0])).toBe(21)
    expect(dates.map(ymd)).toEqual(['2026-01-26', '2026-02-16'])
  })

  it('monthly_weekday: preserves week-of-month + weekday across refills, not just the raw day', () => {
    // Jan 12 2026 is the 2nd Monday.
    const last = noon(2026, 0, 12)
    const dates = nextOccurrenceDates({ recurringType: 'monthly_weekday', lastOccurrence: last, dayOfWeek: 1, count: 2 })
    for (const d of dates) {
      expect(d.getDay()).toBe(1)
      expect(Math.ceil(d.getDate() / 7)).toBe(2)
    }
    expect(dates.map(ymd)).toEqual(['2026-02-09', '2026-03-09'])
  })

  it('defaults count to 4 when omitted', () => {
    const dates = nextOccurrenceDates({ recurringType: 'weekly', lastOccurrence: noon(2026, 0, 5) })
    expect(dates).toHaveLength(4)
  })
})
