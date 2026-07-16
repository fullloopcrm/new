/**
 * GET /api/cron/no-show-check SELECTed candidates by status IN
 * (scheduled/confirmed/pending), then flipped status to 'no_show' and fired
 * an admin notify() with no re-check that the row hadn't already been
 * claimed. This cron runs every 15 min — a slow run (or a manual
 * re-trigger) overlapping the next tick could see the same booking as
 * eligible on two invocations and both fire notify(), double-alerting the
 * admin. Fixed by repeating the status-IN condition on the UPDATE itself —
 * only the run whose UPDATE actually matches a row (status not already
 * flipped) proceeds to notify.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

function seedOverdueBooking() {
  const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 60 min ago, > 45 min grace
  fake._seed('bookings', [
    {
      id: 'booking-1',
      tenant_id: 'tenant-A',
      client_id: 'client-1',
      team_member_id: 'member-1',
      status: 'scheduled',
      check_in_time: null,
      start_time: startTime,
      clients: { name: 'Jane Doe' },
      team_members: { name: 'Bob' },
    },
  ])
}

describe('GET /api/cron/no-show-check — duplicate-notify guard', () => {
  beforeEach(() => {
    notifyCalls.length = 0
  })

  it('flips and notifies once for a normal single run', async () => {
    seedOverdueBooking()
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.flipped).toBe(1)
    expect(notifyCalls).toEqual(['booking-1'])
    expect(fake._all('bookings')[0].status).toBe('no_show')
  })

  it('does not double-notify when two overlapping cron invocations race the same booking', async () => {
    seedOverdueBooking()

    const [resA, resB] = await Promise.all([GET(req()), GET(req())])
    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()])

    expect(jsonA.flipped + jsonB.flipped).toBe(1)
    expect(notifyCalls).toEqual(['booking-1'])
    expect(fake._all('bookings')[0].status).toBe('no_show')
  })

  it('does not re-flip or re-notify on a subsequent run once already flipped', async () => {
    seedOverdueBooking()
    await GET(req())
    notifyCalls.length = 0

    const res = await GET(req())
    const json = await res.json()
    expect(json.flipped).toBe(0)
    expect(notifyCalls).toEqual([])
  })
})
