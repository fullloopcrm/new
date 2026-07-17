import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * checkAvailability()'s same-day gate compared the caller's ET calendar
 * `date` against `today` built via `new Date().toLocaleDateString('en-CA')`
 * with NO `timeZone` option -- that reads the SERVER's local calendar (UTC
 * on Vercel), which runs a full day ahead of ET for ~4-5h every evening
 * (8pm-midnight ET). During that window a genuine same-day (ET) booking
 * request silently bypassed the "same-day bookings require confirmation"
 * gate entirely (server thought "today" was already tomorrow).
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5 -- UTC has
 * already rolled to Jan 6, ET has not.
 */
process.env.TZ = 'UTC'

function chain() {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    then: (resolve: (v: { data: unknown; error: null }) => unknown) => resolve({ data: [], error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => chain() } }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ open_365: true }) }))

import { checkAvailability } from './availability'

describe('checkAvailability — same-day gate must use ET calendar day, not server-local (UTC)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('flags a request for the real ET "today" as same-day, despite the server UTC clock already reading tomorrow', async () => {
    const result = await checkAvailability('tenant-a', '2026-01-05', 2)
    // Pre-fix: `today` computed as '2026-01-06' (UTC calendar day) never
    // equals '2026-01-05', so this fell through to the normal slot logic
    // instead of gating as same-day.
    expect(result.sameDay).toBe(true)
  })
})
