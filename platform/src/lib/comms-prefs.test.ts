import { describe, it, expect } from 'vitest'
import { defaultCommTiming } from './comms-prefs'
import { COMM_TIMING } from './comms-registry'

describe('defaultCommTiming', () => {
  it('mirrors the registry defaults exactly', () => {
    expect(defaultCommTiming()).toEqual({
      reminder_days: [3, 1],
      reminder_hours_before: [2],
      review_delay_hours: 2,
      daily_summary_hour: 0,
      payment_reminder_hours: 24,
    })
  })

  it('array-typed defaults are copied per call, not shared by reference', () => {
    // Regression guard: defaultCommTiming() must return a fresh array each call.
    // Previously it returned `COMM_TIMING.reminder_days.default` directly, so every
    // caller got the SAME array object and mutating one "fresh" prefs object
    // corrupted the registry default for the rest of the process until restart.
    const a = defaultCommTiming()
    const b = defaultCommTiming()
    a.reminder_days.push(99)
    a.reminder_hours_before.push(99)
    expect(b.reminder_days).toEqual([3, 1])
    expect(b.reminder_hours_before).toEqual([2])
    expect(a.reminder_days).not.toBe(b.reminder_days)
    expect(a.reminder_hours_before).not.toBe(b.reminder_hours_before)
    expect(COMM_TIMING.reminder_days.default).toEqual([3, 1])
    expect(COMM_TIMING.reminder_hours_before.default).toEqual([2])
  })
})
