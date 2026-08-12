import { describe, it, expect } from 'vitest'
import {
  fmtTime,
  fmtMoney,
  ymd,
  ymdToday,
  addDays,
  addMonths,
  weekDatesFor,
  dayLabel,
  packEventsIntoLanes,
  type CalendarEvent,
} from './calendar-shared'

/**
 * Pure date-math + bucketing helpers shared by RichMonthView (Month view),
 * the time grid, and the popups. This repo has a documented history of
 * timezone/date-math bugs (naive wall-clock strings getting silently
 * re-interpreted as UTC and shifting a day) — these helpers are deliberately
 * written to work entirely in local Y/M/D components (never round-tripping
 * a naive string through `new Date(iso)` + a timeZone conversion), so the
 * tests lean hardest on month/year boundaries and short-month clamping,
 * where an off-by-one is most likely to surface.
 */

describe('ymd / ymdToday', () => {
  it('formats a Date as zero-padded YYYY-MM-DD', () => {
    expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(ymd(new Date(2026, 10, 30))).toBe('2026-11-30')
  })

  it('ymdToday matches ymd(new Date()) for "now"', () => {
    expect(ymdToday()).toBe(ymd(new Date()))
  })
})

describe('addDays', () => {
  it('adds within a month with no boundary crossing', () => {
    expect(addDays('2026-08-12', 3)).toBe('2026-08-15')
  })

  it('rolls forward across a month boundary', () => {
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02')
  })

  it('rolls forward across a year boundary', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('rolls backward across a month boundary with a negative delta', () => {
    expect(addDays('2026-09-01', -2)).toBe('2026-08-30')
  })

  it('rolls backward across a year boundary with a negative delta', () => {
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('handles the leap-day boundary in a leap year (2028)', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
  })

  it('skips Feb 29 in a non-leap year (2026)', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('does not off-by-one across the US spring-forward DST transition (2026-03-08)', () => {
    // Local Date components (y, m, d) roll over correctly regardless of the
    // lost clock hour, because addDays never constructs a specific
    // wall-clock time -- only Y/M/D. This guards against a regression that
    // would introduce time-of-day math here.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
  })

  it('does not off-by-one across the US fall-back DST transition (2026-11-01)', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  })

  it('zero delta returns the same date unchanged', () => {
    expect(addDays('2026-08-12', 0)).toBe('2026-08-12')
  })
})

describe('addMonths', () => {
  it('adds a month within the same year', () => {
    expect(addMonths('2026-06-15', 1)).toBe('2026-07-15')
  })

  it('rolls forward across a year boundary', () => {
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01')
  })

  it('rolls backward across a year boundary', () => {
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01')
  })

  it('clamps day-of-month when the target month is shorter (Jan 31 -> Feb)', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('clamps into a leap-year February correctly', () => {
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('does not clamp when the target month has enough days', () => {
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31')
  })
})

describe('weekDatesFor', () => {
  it('returns 7 consecutive Monday-start dates containing the input', () => {
    // 2026-08-12 is a Wednesday.
    const week = weekDatesFor('2026-08-12')
    expect(week).toEqual([
      '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13',
      '2026-08-14', '2026-08-15', '2026-08-16',
    ])
  })

  it('when the input IS the Monday, it is the first entry', () => {
    const week = weekDatesFor('2026-08-10')
    expect(week[0]).toBe('2026-08-10')
    expect(week).toHaveLength(7)
  })

  it('when the input is a Sunday, it is the last entry (week does not roll into the next week)', () => {
    const week = weekDatesFor('2026-08-16')
    expect(week[6]).toBe('2026-08-16')
    expect(week[0]).toBe('2026-08-10')
  })

  it('handles a week that spans a month boundary', () => {
    // 2026-08-31 is a Monday.
    const week = weekDatesFor('2026-09-02')
    expect(week[0]).toBe('2026-08-31')
    expect(week).toContain('2026-09-02')
    expect(week[6]).toBe('2026-09-06')
  })
})

describe('dayLabel', () => {
  it('formats using noon local time so DST/UTC edge cases cannot shift the day', () => {
    expect(dayLabel('2026-08-12')).toBe('Wed, Aug 12')
  })

  it('reflects the actual day-of-week for a date near a DST transition', () => {
    // 2026-03-08 is a Sunday (US spring-forward day).
    expect(dayLabel('2026-03-08')).toBe('Sun, Mar 8')
  })
})

describe('fmtTime', () => {
  it('formats morning/afternoon 12-hour time with a/p suffix, omitting :00', () => {
    expect(fmtTime('2026-08-12T09:00:00')).toBe('9a')
    expect(fmtTime('2026-08-12T13:00:00')).toBe('1p')
  })

  it('includes minutes when not on the hour', () => {
    expect(fmtTime('2026-08-12T09:30:00')).toBe('9:30a')
  })

  it('maps midnight and noon correctly (12-hour wraparound)', () => {
    expect(fmtTime('2026-08-12T00:00:00')).toBe('12a')
    expect(fmtTime('2026-08-12T12:00:00')).toBe('12p')
  })
})

describe('fmtMoney', () => {
  it('converts cents to a rounded dollar string with thousands separators', () => {
    expect(fmtMoney(13800)).toBe('$138')
    expect(fmtMoney(150099)).toBe('$1,501')
  })

  it('rounds to the nearest dollar', () => {
    expect(fmtMoney(150)).toBe('$2') // 1.50 rounds to 2 (banker's-vs-half-up not our concern here)
    expect(fmtMoney(149)).toBe('$1')
  })
})

function ev(id: string, start: string, end: string | null): CalendarEvent {
  return {
    id, start, end, client: 'Client', team_member_id: null, team_member_name: null,
    status: 'scheduled', payment_status: null, service_type: null, price_cents: 0,
    conflict: false, tight: false,
  }
}

describe('packEventsIntoLanes', () => {
  it('gives non-overlapping events their own single-lane group', () => {
    const laned = packEventsIntoLanes([
      ev('a', '2026-08-12T09:00:00', '2026-08-12T10:00:00'),
      ev('b', '2026-08-12T11:00:00', '2026-08-12T12:00:00'),
    ])
    expect(laned.find((e) => e.id === 'a')!.lane).toBe(0)
    expect(laned.find((e) => e.id === 'b')!.lane).toBe(0)
    expect(laned.find((e) => e.id === 'a')!.lanesInGroup).toBe(1)
    expect(laned.find((e) => e.id === 'b')!.lanesInGroup).toBe(1)
  })

  it('assigns overlapping events to different lanes within the same group', () => {
    const laned = packEventsIntoLanes([
      ev('a', '2026-08-12T09:00:00', '2026-08-12T10:30:00'),
      ev('b', '2026-08-12T10:00:00', '2026-08-12T11:00:00'),
    ])
    const a = laned.find((e) => e.id === 'a')!
    const b = laned.find((e) => e.id === 'b')!
    expect(a.lane).not.toBe(b.lane)
    expect(a.lanesInGroup).toBe(2)
    expect(b.lanesInGroup).toBe(2)
  })

  it('reuses a freed lane once an earlier event ends', () => {
    const laned = packEventsIntoLanes([
      ev('a', '2026-08-12T09:00:00', '2026-08-12T10:00:00'),
      ev('b', '2026-08-12T09:00:00', '2026-08-12T10:00:00'),
      // starts after both a and b have ended -- should reuse lane 0, not lane 2.
      ev('c', '2026-08-12T10:00:00', '2026-08-12T11:00:00'),
    ])
    expect(laned.find((e) => e.id === 'c')!.lane).toBe(0)
  })

  it('gives an event with no end time a fallback duration instead of collapsing to zero-length', () => {
    const laned = packEventsIntoLanes([ev('a', '2026-08-12T09:00:00', null)], 180)
    const a = laned.find((e) => e.id === 'a')!
    expect(a.endMin - a.startMin).toBe(180)
  })

  it('keeps unrelated clusters (a gap between them) from inflating each other\'s lane count', () => {
    const laned = packEventsIntoLanes([
      ev('a', '2026-08-12T09:00:00', '2026-08-12T10:00:00'),
      ev('b', '2026-08-12T09:00:00', '2026-08-12T10:00:00'),
      // Separate cluster, far later in the day, single event -- must not
      // inherit lanesInGroup=2 from the earlier two-lane cluster.
      ev('c', '2026-08-12T15:00:00', '2026-08-12T16:00:00'),
    ])
    expect(laned.find((e) => e.id === 'c')!.lanesInGroup).toBe(1)
  })
})
