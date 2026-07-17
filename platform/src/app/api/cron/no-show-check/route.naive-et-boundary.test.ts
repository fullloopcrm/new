/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed
 * in. The cutoff/lower-bound were built with `new Date(...).toISOString()`,
 * a real UTC instant with a 'Z' suffix. Postgres drops the tz marker for a
 * `timestamp without time zone` column and compares the literal digits, so
 * the UTC clock digits were being read as if they were ET clock digits --
 * off by the whole EST/EDT offset on every single run (not just a daily
 * boundary window). Net effect: a booking that hadn't even started yet
 * (still hours in the future, ET) could be flipped to `no_show` immediately.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * A booking starting at 9pm ET the same evening (1.5h in the future, not
 * due for another 1.5h + the 45min grace) must NOT be flagged.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.CRON_SECRET = 'test-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return { supabaseAdmin: fake, __fake: fake }
})

const notifyCalls: string[] = []
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async ({ bookingId }: { bookingId: string }) => {
    notifyCalls.push(bookingId)
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/no-show-check — naive-ET boundary, not real UTC instant', () => {
  beforeEach(() => {
    notifyCalls.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
    fake._seed('bookings', [
      {
        id: 'booking-future',
        tenant_id: 'tenant-A',
        client_id: 'client-1',
        team_member_id: 'member-1',
        status: 'scheduled',
        check_in_time: null,
        start_time: '2026-01-05T21:00:00', // naive ET, 9pm -- 1.5h from "now"
        clients: { name: 'Jane Doe' },
        team_members: { name: 'Bob' },
      },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not flag a booking that has not started yet (ET) as a no-show', async () => {
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.flipped).toBe(0)
    expect(notifyCalls).toEqual([])
    expect(fake._all('bookings')[0].status).toBe('scheduled')
  })
})
