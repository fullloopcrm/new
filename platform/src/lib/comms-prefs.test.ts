import { describe, it, expect } from 'vitest'
import { defaultCommTiming, defaultCommPrefs, normalizePrefs } from './comms-prefs'
import { COMM_TIMING } from './comms-registry'

/**
 * Regression: defaultCommTiming() used to return COMM_TIMING's default array
 * instances directly. A caller mutating what it thought was a fresh object
 * (e.g. `timing.reminder_days.push(5)`) corrupted the process-wide registry
 * default for every tenant until restart.
 */
describe('defaultCommTiming', () => {
  it('returns array fields that are independent copies, not shared references', () => {
    const a = defaultCommTiming()
    const b = defaultCommTiming()

    expect(a.reminder_days).not.toBe(COMM_TIMING.reminder_days.default)
    expect(a.reminder_hours_before).not.toBe(COMM_TIMING.reminder_hours_before.default)
    expect(a.reminder_days).not.toBe(b.reminder_days)

    a.reminder_days.push(99)
    a.reminder_hours_before.push(99)

    expect(b.reminder_days).toEqual([3, 1])
    expect(b.reminder_hours_before).toEqual([2])
    expect(COMM_TIMING.reminder_days.default).toEqual([3, 1])
    expect(COMM_TIMING.reminder_hours_before.default).toEqual([2])
  })

  it('mutating one defaultCommPrefs() call does not leak into another', () => {
    const first = defaultCommPrefs()
    first.timing.reminder_days.push(7)

    const second = defaultCommPrefs()
    expect(second.timing.reminder_days).toEqual([3, 1])
  })
})

/**
 * Regression: normalizePrefs' timing-override loop used to branch on
 * Array.isArray(v) / typeof v === 'number' instead of the key's declared
 * `kind` in COMM_TIMING. A wrongly-typed array stored against a number-kind
 * key (e.g. review_delay_hours) was silently accepted instead of rejected,
 * and a stray number against a list-kind key was similarly mismatched.
 */
describe('normalizePrefs timing kind validation', () => {
  it('rejects an array stored against a number-kind key', () => {
    const prefs = normalizePrefs({
      timing: { review_delay_hours: [1, 2, 3] },
    })
    expect(prefs.timing.review_delay_hours).toBe(2) // falls back to default
  })

  it('rejects a number stored against a list-kind key', () => {
    const prefs = normalizePrefs({
      timing: { reminder_days: 5 },
    })
    expect(prefs.timing.reminder_days).toEqual([3, 1]) // falls back to default
  })

  it('accepts correctly-kinded overrides', () => {
    const prefs = normalizePrefs({
      timing: { review_delay_hours: 4, reminder_days: [2, 0] },
    })
    expect(prefs.timing.review_delay_hours).toBe(4)
    expect(prefs.timing.reminder_days).toEqual([2, 0])
  })
})
