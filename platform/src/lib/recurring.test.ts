import { describe, it, expect } from 'vitest'
import {
  generateRecurringDates,
  getRecurringDisplayName,
  type RecurringType,
} from './recurring'

// Construct dates in LOCAL time (new Date(y, m, d)) and only ever read them
// back with local getters, so these assertions are timezone-independent.
const jan5_2026 = () => new Date(2026, 0, 5) // Monday, week-of-month 1

describe('generateRecurringDates — cadence + count', () => {
  it('daily: weeksToGenerate*7 consecutive days', () => {
    const out = generateRecurringDates({
      recurringType: 'daily',
      startDate: jan5_2026(),
      weeksToGenerate: 2,
    })
    expect(out).toHaveLength(14)
    expect(out[0].getTime()).toBe(jan5_2026().getTime())
    for (let i = 1; i < out.length; i++) {
      const gapDays = (out[i].getTime() - out[i - 1].getTime()) / 86_400_000
      expect(gapDays).toBe(1)
    }
  })

  it('weekly: one date per week, 7-day gaps', () => {
    const out = generateRecurringDates({
      recurringType: 'weekly',
      startDate: jan5_2026(),
      weeksToGenerate: 3,
    })
    expect(out).toHaveLength(3)
    for (let i = 1; i < out.length; i++) {
      const gapDays = (out[i].getTime() - out[i - 1].getTime()) / 86_400_000
      expect(gapDays).toBe(7)
    }
  })

  it('biweekly: 14-day gaps', () => {
    const out = generateRecurringDates({
      recurringType: 'biweekly',
      startDate: jan5_2026(),
      weeksToGenerate: 3,
    })
    expect(out).toHaveLength(3)
    for (let i = 1; i < out.length; i++) {
      const gapDays = (out[i].getTime() - out[i - 1].getTime()) / 86_400_000
      expect(gapDays).toBe(14)
    }
  })

  it('triweekly: 21-day gaps', () => {
    const out = generateRecurringDates({
      recurringType: 'triweekly',
      startDate: jan5_2026(),
      weeksToGenerate: 3,
    })
    expect(out).toHaveLength(3)
    for (let i = 1; i < out.length; i++) {
      const gapDays = (out[i].getTime() - out[i - 1].getTime()) / 86_400_000
      expect(gapDays).toBe(21)
    }
  })

  it('monthly_date: same day-of-month across consecutive months', () => {
    const out = generateRecurringDates({
      recurringType: 'monthly_date',
      startDate: jan5_2026(),
      weeksToGenerate: 4,
    })
    expect(out).toHaveLength(4)
    out.forEach((d, i) => {
      expect(d.getDate()).toBe(5)
      expect(d.getMonth()).toBe(i) // Jan(0), Feb(1), Mar(2), Apr(3)
    })
  })

  it('custom: emits only the start date (caller expands the rest)', () => {
    const out = generateRecurringDates({
      recurringType: 'custom',
      startDate: jan5_2026(),
      weeksToGenerate: 4,
    })
    expect(out).toHaveLength(1)
    expect(out[0].getTime()).toBe(jan5_2026().getTime())
  })
})

describe('generateRecurringDates — monthly_weekday', () => {
  it('keeps the same weekday and week-of-month across consecutive months', () => {
    const start = jan5_2026() // 1st Monday of January 2026
    const out = generateRecurringDates({
      recurringType: 'monthly_weekday',
      startDate: start,
      weeksToGenerate: 4,
    })
    expect(out).toHaveLength(4)
    // First element is exactly the start date.
    expect(out[0].getTime()).toBe(start.getTime())
    out.forEach((d, i) => {
      expect(d.getDay()).toBe(1) // still a Monday
      expect(Math.ceil(d.getDate() / 7)).toBe(1) // still the 1st week
      expect(d.getMonth()).toBe(i) // consecutive months Jan..Apr
    })
  })

  it('honors an explicit dayOfWeek override', () => {
    const start = jan5_2026() // week-of-month 1
    const out = generateRecurringDates({
      recurringType: 'monthly_weekday',
      startDate: start,
      dayOfWeek: 3, // Wednesday
      weeksToGenerate: 3,
    })
    // i>0 rows are recomputed against the override; the first Wednesday of
    // each subsequent month is week-of-month 1.
    out.slice(1).forEach((d) => {
      expect(d.getDay()).toBe(3)
      expect(Math.ceil(d.getDate() / 7)).toBe(1)
    })
  })
})

describe('generateRecurringDates — defaults, immutability, edge inputs', () => {
  it('defaults weeksToGenerate to 4 when omitted (weekly)', () => {
    const out = generateRecurringDates({
      recurringType: 'weekly',
      startDate: jan5_2026(),
    })
    expect(out).toHaveLength(4)
  })

  it('does not mutate the caller-supplied startDate', () => {
    const start = jan5_2026()
    const snapshot = start.getTime()
    generateRecurringDates({
      recurringType: 'daily',
      startDate: start,
      weeksToGenerate: 3,
    })
    expect(start.getTime()).toBe(snapshot)
  })

  it('returns independent Date objects, not aliases of one another', () => {
    const out = generateRecurringDates({
      recurringType: 'weekly',
      startDate: jan5_2026(),
      weeksToGenerate: 2,
    })
    out[0].setFullYear(1999)
    expect(out[1].getFullYear()).not.toBe(1999)
  })

  it('weeksToGenerate = 0 yields no dates', () => {
    const out = generateRecurringDates({
      recurringType: 'weekly',
      startDate: jan5_2026(),
      weeksToGenerate: 0,
    })
    expect(out).toHaveLength(0)
  })

  it('an unknown recurringType falls through to an empty array', () => {
    const out = generateRecurringDates({
      recurringType: 'nope' as RecurringType,
      startDate: jan5_2026(),
      weeksToGenerate: 4,
    })
    expect(out).toHaveLength(0)
  })
})

describe('getRecurringDisplayName', () => {
  it('returns null for an empty start date', () => {
    expect(getRecurringDisplayName('weekly', '')).toBeNull()
  })

  it('maps the simple cadences to their labels', () => {
    const start = '2026-01-05'
    expect(getRecurringDisplayName('daily', start)).toBe('Daily')
    expect(getRecurringDisplayName('weekly', start)).toBe('Weekly')
    expect(getRecurringDisplayName('biweekly', start)).toBe('Bi-weekly')
    expect(getRecurringDisplayName('triweekly', start)).toBe('Tri-weekly')
    expect(getRecurringDisplayName('monthly_date', start)).toBe('Monthly')
    expect(getRecurringDisplayName('custom', start)).toBe('Custom')
  })

  it('monthly_day renders "<nth> <weekday>" from the start date', () => {
    // 2026-01-05 is the 1st Monday (parsed at T12:00:00 local).
    expect(getRecurringDisplayName('monthly_day', '2026-01-05')).toBe('1st Mon')
    // 2026-01-20 is a Tuesday in the 3rd week (ceil(20/7)=3).
    expect(getRecurringDisplayName('monthly_day', '2026-01-20')).toBe('3rd Tue')
  })

  it('returns null for an unrecognized repeat type', () => {
    expect(getRecurringDisplayName('yearly', '2026-01-05')).toBeNull()
  })
})
