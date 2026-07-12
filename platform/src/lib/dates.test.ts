import { describe, it, expect } from 'vitest'
import { parseLocalDate, parseTimestamp, formatET } from './dates'

/**
 * Date parsing helpers. Two real production bugs are guarded here:
 *   1. parseLocalDate must build a LOCAL date (calendar-component contract),
 *      never a UTC-midnight Date that shifts a day backward.
 *   2. parseTimestamp must treat a NAIVE Supabase timestamp as UTC (append 'Z')
 *      and must normalize a bare 2-digit offset ("+00") to "+00:00" — the latter
 *      is fully timezone-independent: revert it and Date returns Invalid Date.
 */
describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD to the same calendar day at local midnight', () => {
    const d = parseLocalDate('2026-03-13')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2) // March (0-indexed)
    expect(d.getDate()).toBe(13)
    // Built via new Date(y, m-1, d) → always local midnight, regardless of TZ.
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })
})

describe('parseTimestamp', () => {
  it('returns null for empty input', () => {
    expect(parseTimestamp(null)).toBeNull()
    expect(parseTimestamp(undefined)).toBeNull()
    expect(parseTimestamp('')).toBeNull()
  })

  it('treats a naive Postgres timestamp as UTC (appends Z)', () => {
    const d = parseTimestamp('2026-06-25 11:30:00')!
    expect(d).not.toBeNull()
    // Interpreted as UTC → its UTC hour is exactly the wall-clock hour given.
    expect(d.getUTCHours()).toBe(11)
    expect(d.getUTCMinutes()).toBe(30)
    // Must equal an explicit-UTC parse of the same instant.
    expect(d.getTime()).toBe(Date.parse('2026-06-25T11:30:00Z'))
  })

  it('normalizes a bare 2-digit offset "+00" to a parseable "+00:00"', () => {
    // Timezone-INDEPENDENT fix-proof: without the normalization, new Date("...+00")
    // is Invalid Date on V8 and getTime() is NaN.
    const d = parseTimestamp('2026-06-25T11:30:00+00')!
    expect(d).not.toBeNull()
    expect(Number.isNaN(d.getTime())).toBe(false)
    expect(d.getUTCHours()).toBe(11)
  })

  it('respects a real signed offset (-05:00) rather than forcing UTC', () => {
    const d = parseTimestamp('2026-06-25T11:30:00-05:00')!
    // 11:30 at -05:00 == 16:30 UTC.
    expect(d.getUTCHours()).toBe(16)
    expect(d.getUTCMinutes()).toBe(30)
  })

  it('respects a trailing Z', () => {
    const d = parseTimestamp('2026-06-25T11:30:00Z')!
    expect(d.getUTCHours()).toBe(11)
  })
})

describe('formatET', () => {
  it('renders an instant in America/New_York (15:00Z → 11:00 AM EDT)', () => {
    const out = formatET('2026-06-25T15:00:00Z', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    // June → EDT (UTC-4): 15:00Z = 11:00 AM. Explicit timeZone → TZ-independent.
    expect(out).toContain('11:00')
    expect(out).toContain('AM')
  })
})
