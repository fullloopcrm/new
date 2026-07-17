import { describe, it, expect } from 'vitest'
import {
  generateRecurringDates,
  getRecurringDisplayName,
  formatRecurringLabel,
  formatRecurringFrequency,
  computeNaiveVisitWindow,
  nextOccurrenceDates,
  nowNaiveET,
  parseNaiveET,
  etToday,
  addCalendarDays,
  calendarDayOfWeek,
  formatNaiveET,
  etHour,
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

  it('month-end (Jan 31) falls back to each short month\'s LAST day WITHOUT permanently drifting the anchor day', () => {
    // Old behavior (pinned by a prior version of this test): chaining
    // setMonth() off the previous result let Feb's overflow (Feb 31 -> Mar 3)
    // become the new baseline forever -- Mar 3 -> Apr 3 -> May 3 -> ...,
    // silently and PERMANENTLY changing the client's recurring day from the
    // 31st to the 3rd, never returning to 31 even in a real 31-day month.
    // Fixed (matching monthly_weekday's per-month fallback below): each
    // month's anchor is recomputed fresh from the ORIGINAL day-of-month (31),
    // clamped to that month's own last day -- so a short month is a one-off
    // substitution, and the very next 31-day month resolves back to the 31st.
    const dates = generateRecurringDates({
      recurringType: 'monthly_date',
      startDate: noon(2026, 0, 31), // Jan 31 2026
      weeksToGenerate: 8,
    })
    expect(dates.map(ymd)).toEqual([
      '2026-01-31',
      '2026-02-28', // Feb has no 31st -> falls back to Feb's last day
      '2026-03-31', // back to the real 31st, not permanently pinned at 28/3
      '2026-04-30', // Apr has no 31st -> falls back
      '2026-05-31', // back to 31
      '2026-06-30', // Jun has no 31st -> falls back
      '2026-07-31', // back to 31
      '2026-08-31',
    ])
  })

  it('leap-day start (2028-02-29) advances without throwing, and resyncs to the 29th every leap-adjacent month', () => {
    const dates = generateRecurringDates({
      recurringType: 'monthly_date',
      startDate: noon(2028, 1, 29), // Feb 29 2028 (2028 is a leap year)
      weeksToGenerate: 4,
    })
    expect(dates.map(ymd)).toEqual(['2028-02-29', '2028-03-29', '2028-04-29', '2028-05-29'])
  })

  it('does not mutate the caller-supplied startDate (monthly_date branch has its own current-cloning path)', () => {
    const original = noon(2026, 0, 31)
    const snapshot = original.getTime()
    generateRecurringDates({ recurringType: 'monthly_date', startDate: original, weeksToGenerate: 6 })
    expect(original.getTime()).toBe(snapshot)
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

  it('5th-occurrence anchor falls back to the month\'s LAST occurrence when a later month has no 5th (does not spill into the following month)', () => {
    // May 29 2026 is a Friday, and May 2026 has 5 Fridays (1,8,15,22,29) -- a
    // valid "5th Friday" anchor. June 2026 has only 4 Fridays (5,12,19,26), no 5th.
    const dates = generateRecurringDates({
      recurringType: 'monthly_weekday',
      startDate: noon(2026, 4, 29), // May 29 2026
      weeksToGenerate: 3,
    })
    expect(ymd(dates[0])).toBe('2026-05-29')
    // June has no 5th Friday -- must resolve to June's LAST Friday (June 26),
    // never drift into July looking for a literal 5th occurrence.
    expect(dates[1].getMonth()).toBe(5) // June (0-indexed)
    expect(dates[1].getDay()).toBe(5) // Friday
    expect(ymd(dates[1])).toBe('2026-06-26')
    // July 2026 DOES have 5 Fridays (3,10,17,24,31) -- back to the real 5th.
    expect(ymd(dates[2])).toBe('2026-07-31')
  })

  it('anchor day-of-month 29-31 does not skip/duplicate a month via setMonth() overflow before the day is zeroed', () => {
    // Jan 29 2023 is a Sunday (5th Sunday of Jan), and 2023 is NOT a leap
    // year, so Feb 2023 has no 29th. The per-month anchor used to compute
    // setMonth() BEFORE zeroing the day-of-month to 1 -- so with the cursor
    // still sitting on day 29, advancing from Jan to Feb overflowed straight
    // past Feb (Feb 29 doesn't exist) into March 1. That made the i=1 "Feb"
    // slot actually resolve inside March, AND the i=2 "Mar" slot ALSO
    // resolved to the same March anchor -- Feb got silently skipped entirely
    // while March got a duplicate (identical) date pushed twice.
    const dates = generateRecurringDates({
      recurringType: 'monthly_weekday',
      startDate: noon(2023, 0, 29), // Sun Jan 29 2023
      weeksToGenerate: 4,
    })
    expect(dates.map(ymd)).toEqual(['2023-01-29', '2023-02-26', '2023-03-26', '2023-04-30'])
    // No two dates in the same month (the old bug's duplicate symptom), and
    // every month 1-4 (Jan-Apr) is represented exactly once.
    const months = dates.map((d) => d.getMonth())
    expect(new Set(months).size).toBe(months.length)
    expect(months).toEqual([0, 1, 2, 3])
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

  it('monthly_weekday (the real persisted RecurringType enum value, as opposed to ' +
    "BookingsAdmin.tsx's own 'monthly_day' repeat_type) renders the same Nth-weekday label", () => {
    expect(getRecurringDisplayName('monthly_weekday', '2026-01-12')).toBe('2nd Mon')
  })

  it('returns null for an unknown repeat type', () => {
    expect(getRecurringDisplayName('yearly', anyDate)).toBeNull()
    expect(getRecurringDisplayName('', anyDate)).toBeNull()
  })
})

describe('formatRecurringLabel', () => {
  it('formats a real enum value using the booking start_time datetime', () => {
    expect(formatRecurringLabel('monthly_weekday', '2026-01-12T09:00:00')).toBe('2nd Mon')
    expect(formatRecurringLabel('monthly_date', '2026-01-12T09:00:00')).toBe('Monthly')
    expect(formatRecurringLabel('weekly', '2026-01-12T09:00:00')).toBe('Weekly')
  })

  it('falls back to the raw value instead of rendering blank when unrecognized or dateless', () => {
    expect(formatRecurringLabel('triweekly', '')).toBe('triweekly')
    expect(formatRecurringLabel('some-legacy-value', '2026-01-12T09:00:00')).toBe('some-legacy-value')
  })

  it('returns empty string for no recurring type', () => {
    expect(formatRecurringLabel(null, '2026-01-12T09:00:00')).toBe('')
    expect(formatRecurringLabel(undefined, '2026-01-12T09:00:00')).toBe('')
  })
})

describe('formatRecurringFrequency', () => {
  it('formats known cadences without needing an occurrence date', () => {
    expect(formatRecurringFrequency('weekly')).toBe('Weekly')
    expect(formatRecurringFrequency('biweekly')).toBe('Bi-weekly')
    expect(formatRecurringFrequency('triweekly')).toBe('Tri-weekly')
    expect(formatRecurringFrequency('monthly_date')).toBe('Monthly')
    expect(formatRecurringFrequency('daily')).toBe('Daily')
    expect(formatRecurringFrequency('custom')).toBe('Custom')
  })

  it('collapses monthly_weekday to the same generic "Monthly" label as monthly_date (no date available to name the week/day), and falls back to the raw value only for truly unrecognized values', () => {
    expect(formatRecurringFrequency('monthly_weekday')).toBe('Monthly')
    expect(formatRecurringFrequency('some-legacy-value')).toBe('some-legacy-value')
  })

  it('returns empty string for no recurring type', () => {
    expect(formatRecurringFrequency(null)).toBe('')
    expect(formatRecurringFrequency(undefined)).toBe('')
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

describe('parseNaiveET — inverse of nowNaiveET', () => {
  // dates.ts's parseTimestamp() forces UTC on any naive timestamp -- correct
  // for check_in_time/check_out_time (written via `new Date().toISOString()`,
  // genuinely UTC) but WRONG for start_time/end_time (naive-ET, per
  // computeNaiveVisitWindow). parseNaiveET is the correct converse.
  it('round-trips with nowNaiveET back to (approximately) the current instant', () => {
    const before = Date.now()
    const naive = nowNaiveET()
    const parsed = parseNaiveET(naive)
    const after = Date.now()
    // A few ms of drift between capturing `before`/`after` and the string
    // round-trip (which only has second precision) is expected.
    expect(parsed.getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(parsed.getTime()).toBeLessThanOrEqual(after + 1000)
  })

  it('an offset naive-ET string parses back to the same real instant nowNaiveET(offset) would format', () => {
    const offsetMs = 3 * 60 * 60 * 1000 // 3h ahead
    const naive = nowNaiveET(offsetMs)
    const parsed = parseNaiveET(naive)
    expect(Math.abs(parsed.getTime() - (Date.now() + offsetMs))).toBeLessThan(1500)
  })

  it('interprets a naive string as EDT (UTC-4) in summer', () => {
    // 2026-07-17 14:00 ET (July -> EDT, UTC-4) == 18:00 UTC.
    const d = parseNaiveET('2026-07-17T14:00:00')
    expect(d.toISOString()).toBe('2026-07-17T18:00:00.000Z')
  })

  it('interprets a naive string as EST (UTC-5) in winter', () => {
    // 2026-01-17 14:00 ET (January -> EST, UTC-5) == 19:00 UTC.
    const d = parseNaiveET('2026-01-17T14:00:00')
    expect(d.toISOString()).toBe('2026-01-17T19:00:00.000Z')
  })

  it('differs from a naive-as-UTC (dates.ts parseTimestamp-style) reading by exactly the ET/UTC gap', () => {
    // Guards the exact mistake this helper exists to avoid: treating a
    // naive-ET string as if it were already UTC.
    const naive = '2026-07-17T14:00:00'
    const correct = parseNaiveET(naive)
    const misreadAsUtc = new Date(`${naive}Z`)
    expect(correct.getTime() - misreadAsUtc.getTime()).toBe(4 * 60 * 60 * 1000)
  })
})

describe('etToday / addCalendarDays / calendarDayOfWeek / formatNaiveET — day-boundary counterpart of nowNaiveET', () => {
  // bookings/stats and team-portal/earnings built day/week/month/year range
  // boundaries with `new Date(now.getFullYear(), now.getMonth(), now.getDate())`
  // -- the SERVER's local (UTC on Vercel) calendar, not the ET calendar
  // start_time/end_time actually live in. These helpers build the boundary
  // directly in ET instead.

  it('etToday matches the date portion of nowNaiveET', () => {
    const today = etToday()
    const expected = nowNaiveET().slice(0, 10)
    expect(formatNaiveET(today)).toBe(`${expected}T00:00:00`)
  })

  it('addCalendarDays rolls over month/year boundaries correctly', () => {
    expect(addCalendarDays({ year: 2026, month: 0, day: 31 }, 1)).toEqual({ year: 2026, month: 1, day: 1 })
    expect(addCalendarDays({ year: 2026, month: 11, day: 31 }, 1)).toEqual({ year: 2027, month: 0, day: 1 })
    // Day 0 of next month = last day of this month (used for month-end boundaries).
    expect(addCalendarDays({ year: 2026, month: 1, day: 1 }, -1)).toEqual({ year: 2026, month: 0, day: 31 })
  })

  it('addCalendarDays is unaffected by DST (pure calendar math, no real instant read back)', () => {
    // 2026-03-08 is the US spring-forward date; a naive 24h-based approach
    // could slip by an hour here, but this is component-based, not instant-based.
    expect(addCalendarDays({ year: 2026, month: 2, day: 7 }, 1)).toEqual({ year: 2026, month: 2, day: 8 })
  })

  it('calendarDayOfWeek matches known dates', () => {
    // 2026-07-17 is a Friday.
    expect(calendarDayOfWeek({ year: 2026, month: 6, day: 17 })).toBe(5)
    // 2026-01-01 is a Thursday.
    expect(calendarDayOfWeek({ year: 2026, month: 0, day: 1 })).toBe(4)
  })

  it('formatNaiveET pads month/day/time and is 0-indexed on month', () => {
    expect(formatNaiveET({ year: 2026, month: 0, day: 5 }, 9, 5, 0)).toBe('2026-01-05T09:05:00')
  })

  it('formatNaiveET(etToday()) round-trips (via parseNaiveET) to real midnight in America/New_York, not midnight UTC', () => {
    // Guards the exact mistake this helper class exists to avoid: building
    // day/month boundaries from the server's local (UTC on Vercel) calendar
    // and filtering a naive-ET column with them.
    const midnightET = parseNaiveET(formatNaiveET(etToday()))
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', hour12: false,
    }).formatToParts(midnightET).find(p => p.type === 'hour')?.value
    expect(hour === '00' || hour === '24').toBe(true)
  })
})

describe('etHour — hour-gate counterpart of etToday', () => {
  // Cron gates like `now.getHours() === 8` intending "8am ET" actually read
  // the SERVER's local hour (UTC on Vercel), silently firing at 8am UTC
  // (3-4am ET) instead. etHour() reads the true ET wall-clock hour instead.

  it('reads the ET hour, not the UTC hour, across the DST gap (EDT, UTC-4)', () => {
    // 17:00 UTC on a July date = 1pm EDT.
    expect(etHour(new Date('2026-07-17T17:00:00.000Z'))).toBe(13)
  })

  it('reads the ET hour, not the UTC hour, in EST (UTC-5)', () => {
    // 18:00 UTC on a January date = 1pm EST.
    expect(etHour(new Date('2026-01-17T18:00:00.000Z'))).toBe(13)
  })

  it('rolls to the correct ET calendar hour across a UTC midnight (UTC day already tomorrow, ET still today)', () => {
    // 2am UTC on the 17th = 10pm EDT on the 16th.
    expect(etHour(new Date('2026-07-17T02:00:00.000Z'))).toBe(22)
  })

  it('returns 0, not 24, for ET midnight', () => {
    // 4am UTC on the 17th = midnight EDT on the 17th.
    expect(etHour(new Date('2026-07-17T04:00:00.000Z'))).toBe(0)
  })
})
