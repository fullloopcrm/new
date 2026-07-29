import { describe, it, expect } from 'vitest'
import {
  generateRecurringDates,
  nextOccurrenceDates,
  getRecurringDisplayName,
  generateInitialBatchDates,
  buildSeriesUpdateData,
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

  it('an unknown recurringType falls through to an empty array', () => {
    const dates = generateRecurringDates({ recurringType: 'nope' as RecurringType, startDate: start, weeksToGenerate: 4 })
    expect(dates).toHaveLength(0)
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

describe('generateRecurringDates — daysOfWeek (multi-visit-per-cycle)', () => {
  it('weekly Mon+Thu produces two dates per week, in order', () => {
    const start = noon(2026, 0, 5) // Mon Jan 5
    const dates = generateRecurringDates({
      recurringType: 'weekly', startDate: start, daysOfWeek: [1, 4], weeksToGenerate: 2,
    })
    expect(dates.map(ymd)).toEqual(['2026-01-05', '2026-01-08', '2026-01-12', '2026-01-15'])
  })

  it('drops a daysOfWeek entry earlier in the week than the anchor date', () => {
    const start = noon(2026, 0, 7) // Wed Jan 7 -- Monday of that week already passed
    const dates = generateRecurringDates({
      recurringType: 'weekly', startDate: start, daysOfWeek: [1, 3, 5], weeksToGenerate: 1,
    })
    expect(dates.map(ymd)).toEqual(['2026-01-07', '2026-01-09']) // Wed, Fri only -- not the earlier Monday
  })

  it('biweekly with multiple days steps a full fortnight between cycles', () => {
    const start = noon(2026, 0, 6) // Tue Jan 6
    const dates = generateRecurringDates({
      recurringType: 'biweekly', startDate: start, daysOfWeek: [2, 5], weeksToGenerate: 2,
    })
    expect(dates.map(ymd)).toEqual(['2026-01-06', '2026-01-09', '2026-01-20', '2026-01-23'])
  })

  it('a single-entry daysOfWeek behaves the same as plain dayOfWeek', () => {
    const start = noon(2026, 0, 5)
    const multi = generateRecurringDates({ recurringType: 'weekly', startDate: start, daysOfWeek: [1], weeksToGenerate: 3 })
    const single = generateRecurringDates({ recurringType: 'weekly', startDate: start, weeksToGenerate: 3 })
    expect(multi.map(ymd)).toEqual(single.map(ymd))
  })

  it('nextOccurrenceDates drops the already-materialized last occurrence, multi-day', () => {
    const lastOccurrence = noon(2026, 0, 8) // Thu Jan 8, the later of that week's Mon+Thu pair
    const dates = nextOccurrenceDates({
      recurringType: 'weekly', lastOccurrence, daysOfWeek: [1, 4], count: 2,
    })
    // Next real occurrences after Jan 8 are the following week's Mon+Thu, then the week after's
    expect(dates.map(ymd)).toEqual(['2026-01-12', '2026-01-15', '2026-01-19', '2026-01-22'])
  })

  it('empty daysOfWeek array falls back to single-day dayOfWeek semantics', () => {
    const start = noon(2026, 0, 5)
    const dates = generateRecurringDates({ recurringType: 'weekly', startDate: start, daysOfWeek: [], weeksToGenerate: 2 })
    expect(dates.map(ymd)).toEqual(['2026-01-05', '2026-01-12'])
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

  it('month-end (Jan 31) clamps to each month\'s last day instead of drifting via setMonth overflow', () => {
    // Recomputed fresh off the ORIGINAL day-of-month every iteration (clamped
    // to that month's last day when the target day doesn't exist), instead of
    // chaining setMonth() off the previous (possibly-already-overflowed)
    // date. The old chained version let one short month permanently shift
    // the day-of-month forward for every later month (Jan 31 -> Feb 31
    // overflow -> Mar 3 -> stabilizing at day 3 forever, never returning to
    // 31 even in 31-day months) -- a silent permanent drift of the client's
    // whole recurring day, not a one-month hiccup.
    const dates = generateRecurringDates({
      recurringType: 'monthly_date',
      startDate: noon(2026, 0, 31), // Jan 31 2026
      weeksToGenerate: 4,
    })
    // Jan31 -> Feb28 (clamped, 2026 not a leap year) -> Mar31 (back to 31) -> Apr30 (clamped).
    expect(dates.map(ymd)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
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

/**
 * generateInitialBatchDates — the admin New/Edit Booking UI's "repeat end"
 * (never/after N/on date)-aware initial-occurrence-batch generator. Ported
 * from the retired dashboard/bookings/_recurring.ts's generateRecurringDates
 * (deleted; see docs/RECURRING-REBUILD-DESIGN.md) as part of making this
 * module the single source of truth for recurring-type semantics.
 *
 * Every expected value below was cross-validated 1:1 against the retired
 * file's own generateRecurringDates for the same inputs before that file was
 * deleted (58-case matrix across all 6 UI-facing types x 3 start dates x 3
 * repeat-end modes, plus targeted edge cases) -- these are not independently
 * re-derived, they're the confirmed-matching output frozen into assertions.
 */
describe('generateInitialBatchDates — repeat-end semantics (never/after/on_date)', () => {
  it('after N: daily returns exactly N consecutive days', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'daily', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 5, repeatEndDate: '',
    })
    expect(dates).toEqual(['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'])
  })

  it('after N: weekly returns exactly N dates, 7 days apart', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'weekly', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 5, repeatEndDate: '',
    })
    expect(dates).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26', '2026-02-02'])
  })

  it('after N: biweekly returns exactly N dates, 14 days apart', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'biweekly', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 4, repeatEndDate: '',
    })
    expect(dates).toEqual(['2026-01-05', '2026-01-19', '2026-02-02', '2026-02-16'])
  })

  it('after N: triweekly returns exactly N dates, 21 days apart', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'triweekly', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 3, repeatEndDate: '',
    })
    expect(dates).toEqual(['2026-01-05', '2026-01-26', '2026-02-16'])
  })

  it('after N: monthly_date returns exactly N dates, same day-of-month', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'monthly_date', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 4, repeatEndDate: '',
    })
    expect(dates).toEqual(['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'])
  })

  it('after N: monthly_weekday (admin UI "monthly_day") returns exactly N dates, includes the anchor month', () => {
    // 2026-01-13 = 2nd Tuesday of January.
    const dates = generateInitialBatchDates({
      recurringType: 'monthly_weekday', startDate: '2026-01-13', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 3, repeatEndDate: '',
    })
    expect(dates).toEqual(['2026-01-13', '2026-02-10', '2026-03-10'])
  })

  it('after N: custom converts customIntervalWeeks to a day-step (3 weeks = 21 days)', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'custom', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 3, repeatEndDate: '', customIntervalWeeks: 3,
    })
    expect(dates).toEqual(['2026-01-05', '2026-01-26', '2026-02-16'])
  })

  it('never: bounds an open-ended weekly series to the end of next calendar year', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'weekly', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'never', repeatEndCount: 10, repeatEndDate: '',
    })
    expect(dates[0]).toBe('2026-01-05')
    expect(dates[dates.length - 1] <= '2027-12-31').toBe(true)
    // Last generated date must be within one interval of the cutoff (the
    // next occurrence past it is what got excluded).
    expect(dates.length).toBeGreaterThan(100) // ~104 weeks between 2026-01-05 and 2027-12-31
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true)
    }
  })

  it('on_date: truncates a weekly series at the chosen end date (inclusive)', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'weekly', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'on_date', repeatEndCount: 10, repeatEndDate: '2026-02-01',
    })
    // 2026-02-02 (the next weekly date) is past the 2026-02-01 cutoff.
    expect(dates).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'])
  })

  it('on_date with no date chosen yet: falls back to count-only bounding (matches retired generator)', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'weekly', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'on_date', repeatEndCount: 10, repeatEndDate: '',
    })
    expect(dates).toHaveLength(500)
  })

  it('monthly_date from a day-31 anchor avoids the retired generator\'s chained setMonth() drift bug', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'monthly_date', startDate: '2026-03-31', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 5, repeatEndDate: '',
    })
    // Returns to the real day-31 in every month that has one, instead of
    // permanently drifting to day-1 after the first short month.
    expect(dates).toEqual(['2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31'])
  })

  it('monthly_weekday from a "3rd Saturday" anchor includes its own anchor-month occurrence (afdb66214-class regression)', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'monthly_weekday', startDate: '2026-08-15', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 3, repeatEndDate: '',
    })
    expect(dates[0]).toBe('2026-08-15')
    expect(dates).toEqual(['2026-08-15', '2026-09-19', '2026-10-17'])
  })

  it('repeatEnabled=false returns just the start date, matching the retired generator', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'weekly', startDate: '2026-01-05', repeatEnabled: false,
      repeatEnd: 'never', repeatEndCount: 10, repeatEndDate: '',
    })
    expect(dates).toEqual(['2026-01-05'])
  })

  it('empty startDate returns [\'\'], matching the retired generator', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'weekly', startDate: '', repeatEnabled: true,
      repeatEnd: 'never', repeatEndCount: 10, repeatEndDate: '',
    })
    expect(dates).toEqual([''])
  })

  it('after 0 occurrences returns an empty array', () => {
    const dates = generateInitialBatchDates({
      recurringType: 'weekly', startDate: '2026-01-05', repeatEnabled: true,
      repeatEnd: 'after', repeatEndCount: 0, repeatEndDate: '',
    })
    expect(dates).toEqual([])
  })
})

describe('buildSeriesUpdateData — ported unchanged from the retired _recurring.ts', () => {
  it('maps every field to its bookings-table column name', () => {
    const data = buildSeriesUpdateData({
      startTime: '2026-01-05T09:00:00',
      endTime: '2026-01-05T11:00:00',
      teamMemberId: 'tm-1',
      price: 15000,
      hourlyRate: 5000,
      serviceType: 'standard',
      notes: 'gate code 1234',
      recurringType: 'Weekly',
      discountPercent: 10,
    })
    expect(data).toEqual({
      start_time: '2026-01-05T09:00:00',
      end_time: '2026-01-05T11:00:00',
      team_member_id: 'tm-1',
      price: 15000,
      hourly_rate: 5000,
      service_type: 'standard',
      notes: 'gate code 1234',
      recurring_type: 'Weekly',
      discount_percent: 10,
    })
  })

  it('defaults discount_percent to null when discountPercent is omitted', () => {
    const data = buildSeriesUpdateData({
      startTime: '2026-01-05T09:00:00',
      endTime: '2026-01-05T11:00:00',
      teamMemberId: null,
      price: 15000,
      hourlyRate: null,
      serviceType: 'standard',
      notes: null,
      recurringType: null,
    })
    expect(data.discount_percent).toBeNull()
  })
})
