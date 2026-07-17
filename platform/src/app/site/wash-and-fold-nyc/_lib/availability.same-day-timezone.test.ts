/**
 * checkAvailability()'s same-day gate compared `date` against
 * `new Date().toLocaleDateString('en-CA')` with no `timeZone` option — this
 * standalone per-tenant clone's own AI bot (`selena.ts`) already resolves
 * "today" in America/New_York (buildCalendarContext, and its
 * handleCreateBooking todayStr fixed by item (71)), but this sibling file's
 * own same-day gate, called by selena.ts's handleCheckAvailability tool, fell
 * through the same day-boundary bug shape: server-default (UTC on Vercel)
 * instead of the tenant's actual America/New_York zone. Worst case: during
 * the evening window before ET midnight (UTC already rolled to the next
 * day), a genuinely same-day request would NOT be flagged sameDay, skipping
 * the "requires confirmation" gate for exactly the emergency-call window it
 * exists to catch.
 *
 * TZ is explicitly stubbed to UTC (Vercel's actual runtime default) rather
 * than relying on the dev machine's own local zone: this sandbox's local TZ
 * is already America/New_York, which would make the pre-fix code pass this
 * exact scenario too (verified directly against item 70/71/72's own
 * methodology note) — a false-negative for mutation testing that this stub
 * closes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/app/site/wash-and-fold-nyc/_lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { checkAvailability } from './availability'

describe('wash-and-fold-nyc checkAvailability — same-day gate is computed in America/New_York, not the server default', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubEnv('TZ', 'UTC') })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

  it('flags sameDay for a date that is "today" in ET even though UTC has already rolled to the next calendar date', async () => {
    // 10:30pm EDT on July 17 = 2026-07-18T02:30:00Z -- UTC day is already July 18.
    vi.setSystemTime(new Date('2026-07-18T02:30:00.000Z'))

    const result = await checkAvailability('2026-07-17', 1)

    expect(result.sameDay).toBe(true)
    expect(result.slots).toEqual([])
  })

  it('does not flag sameDay for a genuinely future date under the same UTC-rolled clock', async () => {
    vi.setSystemTime(new Date('2026-07-18T02:30:00.000Z'))

    const result = await checkAvailability('2026-07-18', 1)

    expect(result.sameDay).toBeUndefined()
  })
})
