import { describe, it, expect } from 'vitest'
import {
  dayTokenToIndex,
  dateToWeekdayIndex,
  worksOnDay,
  scheduleHasAnyDay,
  getDaySchedule,
  worksScheduledDay,
  timeTo24h,
  normalizeWorkingHours,
  hoursWindowForDate,
  slotWithinHours,
} from './day-availability'

/**
 * Team-member availability helpers. Working_days/schedule exist in BOTH numeric
 * ("0".."6", 24h) and day-name ("Sun".."Sat", 12h) historical formats; every
 * matcher must agree on both. Weekday indices below are pinned to ground truth
 * computed in America/New_York (the zone dateToWeekdayIndex hard-codes):
 *   2026-03-09 = Mon(1)   2026-03-10 = Tue(2)   2026-03-13 = Fri(5)   2026-03-15 = Sun(0)
 */

describe('dayTokenToIndex', () => {
  it('accepts numeric tokens 0-6', () => {
    expect(dayTokenToIndex('0')).toBe(0)
    expect(dayTokenToIndex('6')).toBe(6)
  })
  it('accepts day-name tokens (any length/case)', () => {
    expect(dayTokenToIndex('Sun')).toBe(0)
    expect(dayTokenToIndex('sunday')).toBe(0)
    expect(dayTokenToIndex('MON')).toBe(1)
    expect(dayTokenToIndex('Wed')).toBe(3)
    expect(dayTokenToIndex('sat')).toBe(6)
  })
  it('returns null for out-of-range / unrecognized tokens', () => {
    expect(dayTokenToIndex('7')).toBeNull()
    expect(dayTokenToIndex('xyz')).toBeNull()
  })
})

describe('dateToWeekdayIndex', () => {
  it('maps a YYYY-MM-DD to its NY weekday index', () => {
    expect(dateToWeekdayIndex('2026-03-09')).toBe(1) // Mon
    expect(dateToWeekdayIndex('2026-03-13')).toBe(5) // Fri
    expect(dateToWeekdayIndex('2026-03-15')).toBe(0) // Sun
  })
})

describe('worksOnDay', () => {
  it('matches numeric working_days against the date weekday', () => {
    expect(worksOnDay(['1', '3', '5'], '2026-03-13')).toBe(true)  // Fri included
    expect(worksOnDay(['1', '3', '5'], '2026-03-10')).toBe(false) // Tue not included
  })
  it('matches day-name working_days too', () => {
    expect(worksOnDay(['Mon', 'Wed', 'Fri'], '2026-03-13')).toBe(true)
    expect(worksOnDay(['Mon', 'Wed', 'Fri'], '2026-03-15')).toBe(false) // Sun
  })
  it('returns null when unset, empty, or all-unrecognized', () => {
    expect(worksOnDay(null, '2026-03-13')).toBeNull()
    expect(worksOnDay([], '2026-03-13')).toBeNull()
    expect(worksOnDay(['xyz'], '2026-03-13')).toBeNull()
  })
})

describe('scheduleHasAnyDay', () => {
  it('is true only when at least one entry is non-null', () => {
    expect(scheduleHasAnyDay({ '0': { start: '08:00', end: '17:00' } })).toBe(true)
  })
  it('is false for all-null / empty / missing schedules', () => {
    expect(scheduleHasAnyDay({ '0': null, '1': null })).toBe(false)
    expect(scheduleHasAnyDay({})).toBe(false)
    expect(scheduleHasAnyDay(null)).toBe(false)
  })
})

describe('getDaySchedule', () => {
  it('finds an entry by numeric key for the date weekday', () => {
    expect(getDaySchedule({ '5': { start: '09:00', end: '17:00' } }, '2026-03-13'))
      .toEqual({ start: '09:00', end: '17:00' })
  })
  it('finds an entry by day-name key', () => {
    expect(getDaySchedule({ Fri: { start: '10:00', end: '14:00' } }, '2026-03-13'))
      .toEqual({ start: '10:00', end: '14:00' })
  })
  it('returns null for an explicit day-off entry, undefined when absent', () => {
    expect(getDaySchedule({ '5': null }, '2026-03-13')).toBeNull()      // present, day off
    expect(getDaySchedule({ '1': { start: '09:00', end: '17:00' } }, '2026-03-13'))
      .toBeUndefined()                                                   // no Fri key
  })
})

describe('worksScheduledDay', () => {
  it('lets working_days win over schedule when it names any recognizable day', () => {
    // working_days says NOT Friday; schedule WOULD say Friday. working_days wins → false.
    expect(worksScheduledDay(['1'], { '5': { start: '09:00', end: '17:00' } }, '2026-03-13'))
      .toBe(false)
    expect(worksScheduledDay(['5'], null, '2026-03-13')).toBe(true)
  })
  it('falls back to schedule when working_days is unusable', () => {
    expect(worksScheduledDay([], { '5': { start: '09:00', end: '17:00' } }, '2026-03-13'))
      .toBe(true)
    expect(worksScheduledDay(null, { '1': { start: '09:00', end: '17:00' } }, '2026-03-13'))
      .toBe(false) // schedule configures Mon, date is Fri
  })
  it('is false when nothing is configured', () => {
    expect(worksScheduledDay(null, null, '2026-03-13')).toBe(false)
    expect(worksScheduledDay([], {}, '2026-03-13')).toBe(false)
  })
})

describe('timeTo24h', () => {
  it('normalizes 12h times, handling the AM/PM 12 edge cases', () => {
    expect(timeTo24h('9:00 AM')).toBe('09:00')
    expect(timeTo24h('12:00 AM')).toBe('00:00') // midnight
    expect(timeTo24h('12:00 PM')).toBe('12:00') // noon
    expect(timeTo24h('5:00 PM')).toBe('17:00')
  })
  it('passes valid 24h times through', () => {
    expect(timeTo24h('08:00')).toBe('08:00')
    expect(timeTo24h('23:59')).toBe('23:59')
  })
  it('returns null for unparseable / out-of-range / non-string input', () => {
    expect(timeTo24h('garbage')).toBeNull()
    expect(timeTo24h('25:00')).toBeNull()
    expect(timeTo24h(null)).toBeNull()
    expect(timeTo24h(42)).toBeNull()
  })
})

describe('normalizeWorkingHours', () => {
  it('reads schedule hours (12h) into the canonical 0-6 → 24h map', () => {
    const map = normalizeWorkingHours(null, { '1': { start: '9:00 AM', end: '5:00 PM' } })
    expect(map[1]).toEqual({ start: '09:00', end: '17:00' })
    expect(map[2]).toBeNull()
  })
  it('fills working_days-only days with the 08:00-17:00 default', () => {
    const map = normalizeWorkingHours(['3'], null)
    expect(map[3]).toEqual({ start: '08:00', end: '17:00' })
    expect(map[0]).toBeNull()
  })
  it('does not let working_days override a day the schedule already set', () => {
    const map = normalizeWorkingHours(['1'], { '1': { start: '10:00', end: '14:00' } })
    expect(map[1]).toEqual({ start: '10:00', end: '14:00' }) // schedule wins, not the default
  })
})

describe('hoursWindowForDate', () => {
  it('returns minutes-of-day window for a configured day', () => {
    expect(hoursWindowForDate({ '5': { start: '09:00', end: '17:00' } }, '2026-03-13'))
      .toEqual({ start: 540, end: 1020 }) // 9*60, 17*60
  })
  it('returns null when the day has no specific hours', () => {
    expect(hoursWindowForDate({ '1': { start: '09:00', end: '17:00' } }, '2026-03-13')).toBeNull()
  })
})

describe('slotWithinHours', () => {
  const sched = { '5': { start: '09:00', end: '17:00' } } // Fri 540..1020
  it('accepts a slot inside the window and rejects one outside', () => {
    expect(slotWithinHours(sched, '2026-03-13', 600, 660)).toBe(true)   // 10:00-11:00
    expect(slotWithinHours(sched, '2026-03-13', 500, 560)).toBe(false)  // starts before 09:00
    expect(slotWithinHours(sched, '2026-03-13', 1000, 1080)).toBe(false) // ends after 17:00
  })
  it('imposes no limit when the day has no configured hours', () => {
    expect(slotWithinHours(sched, '2026-03-10', 0, 1440)).toBe(true) // Tue: unconfigured
  })
})
