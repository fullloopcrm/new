import { describe, it, expect } from 'vitest'
import { lastNMonths } from './dates'

describe('lastNMonths', () => {
  it('returns n distinct months, oldest first, ending on "now"\'s month', () => {
    const months = lastNMonths(6, new Date(2026, 5, 15)) // Jun 15, 2026
    expect(months.map((m) => m.label)).toEqual([
      'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26',
    ])
  })

  it('does not collide or drop a month when "now" is day 31 of a 31-day month', () => {
    // Regression: the old `d.setMonth(d.getMonth() - i)` pattern (mutating a
    // day-31 "now" in place) overflowed short target months, colliding two
    // different months onto the same label and silently dropping another
    // month's bucket from the map entirely (verified 5 of 12 keys collided
    // for a Jul 31 anchor before this fix).
    const months = lastNMonths(12, new Date(2026, 6, 31)) // Jul 31, 2026
    const labels = months.map((m) => m.label)
    expect(new Set(labels).size).toBe(12)
    expect(labels).toEqual([
      'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26',
      'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26',
    ])
  })

  it('does not collide when "now" is day 30 of a 30-day month', () => {
    const months = lastNMonths(12, new Date(2026, 3, 30)) // Apr 30, 2026
    expect(new Set(months.map((m) => m.label)).size).toBe(12)
  })

  it('each returned month is anchored at day 1 (safe to build monthStart/monthEnd from)', () => {
    const months = lastNMonths(3, new Date(2026, 0, 31)) // Jan 31, 2026
    for (const { year, month } of months) {
      const start = new Date(year, month, 1)
      expect(start.getMonth()).toBe(month)
    }
  })
})
