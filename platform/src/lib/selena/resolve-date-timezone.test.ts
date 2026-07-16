import { describe, it, expect, afterEach, vi } from 'vitest'

/**
 * resolveDate/resolveRelativeDay compute "today" via `now.getDay()`, which
 * uses the PROCESS's implicit local timezone — not the America/New_York zone
 * the function is explicitly built for (the final toLocaleDateString call
 * already passes timeZone: 'America/New_York'). Vercel serverless functions
 * default to UTC, so for the multi-hour window every single day where UTC's
 * calendar date has already flipped ahead of Eastern's (roughly 8pm-midnight
 * ET), the OLD code computed the wrong "current weekday" and could resolve a
 * customer's "book me Friday" request to the wrong date — in the case tested
 * below, a full week later than the correct answer, not just off-by-one.
 *
 * Fixed by computing the current weekday via an explicit America/New_York
 * lookup (weekdayInET), matching the convention already used elsewhere in
 * this codebase (day-availability.ts's dateToWeekdayIndex).
 */

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => ({}) } }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: async () => [] }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: () => ({}) }))
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))

import { resolveDate, resolveRelativeDay, weekdayInET } from './core'

describe('resolveDate/resolveRelativeDay — timezone-safe weekday computation', () => {
  const realTZ = process.env.TZ

  afterEach(() => {
    if (realTZ === undefined) delete process.env.TZ
    else process.env.TZ = realTZ
    vi.useRealTimers()
  })

  // 2026-07-17T03:30:00Z = Fri 03:30 UTC, but Thu 23:30 America/New_York (EDT, UTC-4).
  const CROSS_MIDNIGHT_INSTANT = '2026-07-17T03:30:00Z'

  it('weekdayInET reports the ET weekday, not the process-local weekday', () => {
    process.env.TZ = 'UTC'
    const d = new Date(CROSS_MIDNIGHT_INSTANT)
    expect(d.getDay()).toBe(5) // UTC sees Friday
    expect(weekdayInET(d)).toBe(4) // ET is still Thursday
  })

  it('resolveDate("friday") resolves to tomorrow (ET), not a week later, under a UTC process TZ', () => {
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date(CROSS_MIDNIGHT_INSTANT))

    const result = resolveDate('friday')

    // Correct: ET "today" is Thursday 7/16, so the next Friday is 7/17 (tomorrow).
    expect(result).toBe('2026-07-17')
    // The bug this replaces would instead compute currentDay=Friday (UTC),
    // see daysAhead<=0, add a full week, and return '2026-07-23' — a week
    // late — proving this isn't a cosmetic off-by-one but a wrong-week bug.
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
