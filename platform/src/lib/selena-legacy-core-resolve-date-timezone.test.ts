import { describe, it, expect, afterEach, vi } from 'vitest'

/**
 * Same timezone bug as src/lib/selena/core.ts's resolveDate/resolveRelativeDay
 * (see selena/resolve-date-timezone.test.ts for the full writeup): `now.getDay()`
 * used the process's implicit local timezone instead of the explicit `timezone`
 * param this function otherwise threads through consistently, so on a UTC-default
 * runtime (Vercel) it silently mis-resolved "today" for hours every day.
 */

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => ({}) } }))

import { resolveDate, resolveRelativeDay, weekdayInTz } from './selena-legacy-core'

describe('selena-legacy-core resolveDate/resolveRelativeDay — timezone-safe weekday computation', () => {
  const realTZ = process.env.TZ

  afterEach(() => {
    if (realTZ === undefined) delete process.env.TZ
    else process.env.TZ = realTZ
    vi.useRealTimers()
  })

  // 2026-07-17T03:30:00Z = Fri 03:30 UTC, but Thu 23:30 America/New_York (EDT, UTC-4).
  const CROSS_MIDNIGHT_INSTANT = '2026-07-17T03:30:00Z'

  it('weekdayInTz reports the target-timezone weekday, not the process-local weekday', () => {
    process.env.TZ = 'UTC'
    const d = new Date(CROSS_MIDNIGHT_INSTANT)
    expect(d.getDay()).toBe(5) // UTC sees Friday
    expect(weekdayInTz(d, 'America/New_York')).toBe(4) // ET is still Thursday
  })

  it('resolveDate("friday") resolves to tomorrow (ET), not a week later, under a UTC process TZ', () => {
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date(CROSS_MIDNIGHT_INSTANT))

    const result = resolveDate('friday')

    expect(result).toBe('2026-07-17')
    expect(result).not.toBe('2026-07-23')
  })

  it('resolveRelativeDay("today") resolves to the ET calendar date under a UTC process TZ', () => {
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date(CROSS_MIDNIGHT_INSTANT))

    const result = resolveRelativeDay('today')

    expect(result).toEqual({ day: 'Thursday', date: '2026-07-16' })
  })
})
