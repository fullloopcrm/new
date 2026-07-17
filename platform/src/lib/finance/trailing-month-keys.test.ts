/**
 * buildTrailingMonthKeys() -- shared "last N months" chart-skeleton builder
 * used by finance/revenue and admin/finance's monthly-trend endpoints.
 * See the file's own comment for the bug this guards: the old inline
 * per-route version mutated `new Date()` via setMonth(getMonth() - i),
 * which overflows into the following month whenever the anchor's
 * day-of-month (29-31) doesn't exist in the target month -- silently
 * skipping a month's key (dropping its real revenue from the chart) and
 * duplicating another.
 */
import { describe, it, expect } from 'vitest'
import { buildTrailingMonthKeys } from './trailing-month-keys'

describe('buildTrailingMonthKeys', () => {
  it('day-31 anchor produces 12 distinct, chronologically consecutive months with no skip/duplicate', () => {
    // Old behavior on Jul 31: stepping back to Feb/Apr/Jun/Sep/Nov (all
    // shorter than 31 days) overflowed into the next month, producing
    // duplicate keys and silently dropping Feb/Apr/Jun/Sep/Nov entirely.
    const keys = buildTrailingMonthKeys(12, new Date(2026, 6, 31)) // Jul 31 2026
    expect(keys).toEqual([
      'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26',
      'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26',
    ])
    expect(new Set(keys).size).toBe(12) // no duplicates
  })

  it('day-30 anchor is unaffected in months without a 30th (Feb) -- regression control for the same overflow class', () => {
    const keys = buildTrailingMonthKeys(12, new Date(2026, 2, 30)) // Mar 30 2026
    expect(keys).toContain('Feb 26')
    expect(new Set(keys).size).toBe(12)
  })

  it('day-29 anchor in a leap year is unaffected the following non-leap year (Feb 29 -> no Feb 29)', () => {
    const keys = buildTrailingMonthKeys(12, new Date(2028, 1, 29)) // Feb 29 2028 (leap)
    expect(new Set(keys).size).toBe(12)
    expect(keys[keys.length - 1]).toBe('Feb 28')
  })

  it('mid-month anchor (day 15) is trivially unaffected (regression control)', () => {
    const keys = buildTrailingMonthKeys(12, new Date(2026, 0, 15)) // Jan 15 2026
    expect(keys[keys.length - 1]).toBe('Jan 26')
    expect(keys[0]).toBe('Feb 25')
    expect(new Set(keys).size).toBe(12)
  })

  it('respects an arbitrary count', () => {
    const keys = buildTrailingMonthKeys(3, new Date(2026, 6, 31))
    expect(keys).toEqual(['May 26', 'Jun 26', 'Jul 26'])
  })
})
