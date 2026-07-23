import { describe, it, expect } from 'vitest'
import {
  getTenantTimezone,
  getLocalHour,
  getLocalMinuteOfDay,
  getTenantDayBoundaries,
  isTenantLocalHour,
  toTenantNaiveString,
  parseTenantNaiveString,
  tenantCalendarToday,
  addCalendarDays,
  formatCalendarNaive,
  getTenantNaiveDayBoundaries,
} from './tenant-time'

// 2026 US DST: EDT (UTC-4) runs Mar 8 - Nov 1. EST (UTC-5) otherwise.
// PDT (UTC-7) runs the same window; PST (UTC-8) otherwise.

describe('getTenantTimezone', () => {
  it('returns the tenant value when set', () => {
    expect(getTenantTimezone({ timezone: 'America/Chicago' })).toBe('America/Chicago')
  })
  it('defaults to America/New_York when unset, null, or missing', () => {
    expect(getTenantTimezone({ timezone: null })).toBe('America/New_York')
    expect(getTenantTimezone({})).toBe('America/New_York')
    expect(getTenantTimezone(null)).toBe('America/New_York')
    expect(getTenantTimezone(undefined)).toBe('America/New_York')
  })
})

describe('getLocalHour', () => {
  it('converts UTC to ET correctly across DST (EDT, summer)', () => {
    // 2026-07-22T12:00:00Z, July = EDT = UTC-4 -> 8am local
    expect(getLocalHour('America/New_York', new Date('2026-07-22T12:00:00Z'))).toBe(8)
  })
  it('converts UTC to ET correctly across DST (EST, winter)', () => {
    // 2026-01-15T12:00:00Z, January = EST = UTC-5 -> 7am local
    expect(getLocalHour('America/New_York', new Date('2026-01-15T12:00:00Z'))).toBe(7)
  })
  it('converts UTC to Pacific correctly', () => {
    // 2026-07-22T12:00:00Z, PDT = UTC-7 -> 5am local
    expect(getLocalHour('America/Los_Angeles', new Date('2026-07-22T12:00:00Z'))).toBe(5)
  })
  it('this is exactly the bug: server UTC hour would say 20 (8pm) at the instant the user actually saw a "Good Morning" email', () => {
    // The screenshot: email arrived 8:00 PM ET. That's 2026-07-23T00:00:00Z
    // (UTC midnight, the OLD cron's fixed schedule). At that instant, ET local
    // hour is 20 (8pm) -- proving the old `now.getHours()===8` (server/UTC)
    // gate was never aligned with "8am ET" at all.
    const utcMidnight = new Date('2026-07-23T00:00:00Z')
    expect(getLocalHour('America/New_York', utcMidnight)).toBe(20)
    expect(getLocalHour('America/New_York', utcMidnight)).not.toBe(8)
  })
})

describe('isTenantLocalHour', () => {
  it('is true only at the tenant-local target hour, not the UTC hour', () => {
    // 12:00Z is 8am EDT -> true for targetHour 8
    expect(isTenantLocalHour('America/New_York', 8, new Date('2026-07-22T12:00:00Z'))).toBe(true)
    // 13:00Z is 9am EDT -> false for targetHour 8
    expect(isTenantLocalHour('America/New_York', 8, new Date('2026-07-22T13:00:00Z'))).toBe(false)
  })
  it('fires at the correct UTC instant for a Pacific tenant, different from an Eastern tenant', () => {
    // 8am PDT = 15:00Z (UTC-7); 8am EDT = 12:00Z (UTC-4) -- same target hour,
    // different real UTC instants, proving each tenant is gated independently.
    const eightAmPacific = new Date('2026-07-22T15:00:00Z')
    expect(isTenantLocalHour('America/Los_Angeles', 8, eightAmPacific)).toBe(true)
    expect(isTenantLocalHour('America/New_York', 8, eightAmPacific)).toBe(false)
  })
})

describe('getLocalMinuteOfDay', () => {
  it('computes minute-of-day in tenant local time, not server UTC', () => {
    // 2026-07-22T13:30:00Z -> 9:30am EDT -> 9*60+30 = 570
    expect(getLocalMinuteOfDay('America/New_York', new Date('2026-07-22T13:30:00Z'))).toBe(570)
  })
})

describe('getTenantDayBoundaries', () => {
  it('keeps "today" as the tenant-local calendar day even when UTC has already rolled to tomorrow', () => {
    // 2026-07-23T02:00:00Z = 10:00 PM EDT on July 22 (still July 22 in ET,
    // already July 23 in UTC). todayStart must be July 22 midnight ET.
    const lateEveningEt = new Date('2026-07-23T02:00:00Z')
    const { todayStart } = getTenantDayBoundaries('America/New_York', lateEveningEt)
    expect(todayStart.toISOString()).toBe('2026-07-22T04:00:00.000Z') // midnight EDT = 04:00 UTC
  })
  it('produces boundaries 24h apart and today < tomorrow, yesterday < today', () => {
    const { todayStart, tomorrowStart, yesterdayStart, todayEnd } = getTenantDayBoundaries('America/New_York', new Date('2026-07-22T18:00:00Z'))
    expect(tomorrowStart.getTime() - todayStart.getTime()).toBe(24 * 60 * 60 * 1000)
    expect(todayStart.getTime() - yesterdayStart.getTime()).toBe(24 * 60 * 60 * 1000)
    expect(todayEnd.getTime()).toBe(tomorrowStart.getTime() - 1)
  })
  it('handles the winter (EST, UTC-5) offset correctly', () => {
    const janInstant = new Date('2026-01-15T18:00:00Z')
    const { todayStart } = getTenantDayBoundaries('America/New_York', janInstant)
    expect(todayStart.toISOString()).toBe('2026-01-15T05:00:00.000Z') // midnight EST = 05:00 UTC
  })
})

describe('toTenantNaiveString / parseTenantNaiveString round-trip', () => {
  it('formats a real instant as the tenant local wall-clock naive string', () => {
    // 2026-07-22T13:30:00Z -> 9:30am EDT
    expect(toTenantNaiveString('America/New_York', new Date('2026-07-22T13:30:00Z'))).toBe('2026-07-22T09:30:00')
  })
  it('parses a naive string back to the correct real UTC instant (EDT)', () => {
    const real = parseTenantNaiveString('2026-07-22T09:30:00', 'America/New_York')
    expect(real.toISOString()).toBe('2026-07-22T13:30:00.000Z')
  })
  it('parses a naive string back to the correct real UTC instant (EST, winter)', () => {
    const real = parseTenantNaiveString('2026-01-15T09:30:00', 'America/New_York')
    expect(real.toISOString()).toBe('2026-01-15T14:30:00.000Z') // EST = UTC-5
  })
  it('round-trips exactly: naive -> real instant -> naive', () => {
    const naive = '2026-07-22T14:05:22'
    const real = parseTenantNaiveString(naive, 'America/Chicago')
    const back = toTenantNaiveString('America/Chicago', real)
    expect(back).toBe(naive)
  })
  it('round-trips across a DST transition boundary without drifting a day', () => {
    // Spring-forward 2026: Mar 8, 2:00am local skips to 3:00am. A naive time
    // just before the transition must still round-trip cleanly.
    const naive = '2026-03-07T23:30:00'
    const real = parseTenantNaiveString(naive, 'America/New_York')
    const back = toTenantNaiveString('America/New_York', real)
    expect(back).toBe(naive)
  })
})

describe('tenantCalendarToday / addCalendarDays / formatCalendarNaive', () => {
  it('reads the tenant calendar day, not the UTC day, near a UTC midnight crossing', () => {
    // 2026-07-23T02:00:00Z is already July 23 in UTC but still July 22 in ET.
    const today = tenantCalendarToday('America/New_York', new Date('2026-07-23T02:00:00Z'))
    expect(today).toEqual({ year: 2026, month: 6, day: 22 }) // month is 0-indexed: 6 = July
  })
  it('addCalendarDays does pure calendar arithmetic including month rollover', () => {
    const day = { year: 2026, month: 6, day: 30 } // July 30
    expect(addCalendarDays(day, 1)).toEqual({ year: 2026, month: 6, day: 31 })
    expect(addCalendarDays(day, 2)).toEqual({ year: 2026, month: 7, day: 1 }) // rolls to August
    expect(addCalendarDays(day, -30)).toEqual({ year: 2026, month: 5, day: 30 }) // back to June
  })
  it('formatCalendarNaive zero-pads correctly', () => {
    expect(formatCalendarNaive({ year: 2026, month: 0, day: 5 })).toBe('2026-01-05T00:00:00')
    expect(formatCalendarNaive({ year: 2026, month: 11, day: 31 }, 23, 59, 59)).toBe('2026-12-31T23:59:59')
  })
})

describe('getTenantNaiveDayBoundaries', () => {
  it('produces naive strings usable for direct lexicographic comparison against the naive start_time column', () => {
    const b = getTenantNaiveDayBoundaries('America/New_York', new Date('2026-07-22T18:00:00Z'))
    expect(b.todayStartNaive < b.tomorrowStartNaive).toBe(true)
    expect(b.yesterdayStartNaive < b.todayStartNaive).toBe(true)
    expect(b.todayStartNaive).toBe('2026-07-22T00:00:00')
    expect(b.tomorrowStartNaive).toBe('2026-07-23T00:00:00')
    expect(b.yesterdayStartNaive).toBe('2026-07-21T00:00:00')
  })
  it('agrees with getTenantDayBoundaries on which calendar day "today" is, for the same instant', () => {
    const at = new Date('2026-07-23T02:00:00Z') // late evening ET, already tomorrow in UTC
    const naive = getTenantNaiveDayBoundaries('America/New_York', at)
    const real = getTenantDayBoundaries('America/New_York', at)
    expect(naive.todayStartNaive.slice(0, 10)).toBe('2026-07-22')
    expect(real.todayStart.toISOString().slice(0, 10)).toBe('2026-07-22')
  })
})
