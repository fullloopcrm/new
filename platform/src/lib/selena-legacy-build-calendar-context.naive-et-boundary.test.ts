import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * buildCalendarContext() feeds Selena's system prompt the "Today is ..." /
 * CALENDAR block it uses to resolve customer phrases like "this Wednesday"
 * or "tomorrow" into real dates. Every `toLocaleDateString` call was missing
 * `timeZone: 'America/New_York'` -- it read the SERVER's local calendar (UTC
 * on Vercel), which runs a full day ahead of ET for ~4-5h every evening
 * (8pm-midnight ET). During that window the AI's own calendar context was
 * silently off by a day.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5 -- UTC has
 * already rolled to Jan 6, ET has not.
 */
process.env.TZ = 'UTC'

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => ({}) } }))

import { buildCalendarContext } from './selena-legacy'

describe('buildCalendarContext — must anchor "today" and the calendar list to ET, not server-local (UTC)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('labels "today" as the real ET date (Jan 5), not the UTC date (Jan 6)', () => {
    const ctx = buildCalendarContext()
    expect(ctx).toContain('Today is Monday, January 5, 2026')
    expect(ctx).not.toContain('January 6, 2026')
  })

  it('maps the first calendar row to the real ET date, not the UTC date', () => {
    const ctx = buildCalendarContext()
    const firstRow = ctx.split('\n').find((l) => l.includes('= 2026-01'))
    expect(firstRow).toContain('= 2026-01-05')
  })
})
