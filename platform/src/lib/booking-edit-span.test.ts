import { describe, it, expect } from 'vitest'
import { computeEditedSpan } from './booking-edit-span'

describe('computeEditedSpan', () => {
  it('preserves a multi-day span when only an unrelated field (e.g. price/notes/status) is saved', () => {
    // A 30-day project span booking: 2026-08-01T09:00 -> 2026-08-30T17:00.
    // The edit modal always reloads start_date/start_time/hours from the
    // booking itself, so saving with no changes must reproduce the exact
    // same start_time AND must not collapse end_time onto the start day.
    const result = computeEditedSpan(
      '2026-08-01T09:00:00',
      '2026-08-30T17:00:00',
      '2026-08-01',
      '09:00',
      2, // whatever the time-of-day-derived "hours" field happens to be
    )
    expect(result.start_time).toBe('2026-08-01T09:00:00')
    expect(result.end_time).toBe('2026-08-30T17:00:00')
  })

  it('shifts a multi-day span by the same delta when the start date/time is moved', () => {
    // Admin reschedules the project's start by +2 days -- the whole span
    // should shift with it, keeping the original 29-day length intact.
    const result = computeEditedSpan(
      '2026-08-01T09:00:00',
      '2026-08-30T17:00:00',
      '2026-08-03',
      '09:00',
      2,
    )
    expect(result.start_time).toBe('2026-08-03T09:00:00')
    expect(result.end_time).toBe('2026-09-01T17:00:00')
  })

  it('still recomputes end_time from hours for an ordinary same-day booking', () => {
    const result = computeEditedSpan(
      '2026-08-01T09:00:00',
      '2026-08-01T11:00:00',
      '2026-08-01',
      '10:00',
      3,
    )
    expect(result.start_time).toBe('2026-08-01T10:00:00')
    expect(result.end_time).toBe('2026-08-01T13:00:00')
  })

  it('handles a start-time shift that crosses midnight without breaking the multi-day span', () => {
    const result = computeEditedSpan(
      '2026-08-01T22:00:00',
      '2026-08-05T06:00:00',
      '2026-08-01',
      '23:30',
      2,
    )
    // start moved 22:00 -> 23:30 (+90 min); end shifts by the same 90 min.
    expect(result.start_time).toBe('2026-08-01T23:30:00')
    expect(result.end_time).toBe('2026-08-05T07:30:00')
  })
})
