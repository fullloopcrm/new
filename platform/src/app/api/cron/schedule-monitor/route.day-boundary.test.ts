/**
 * GET /api/cron/schedule-monitor — the main 14-day booking window (and the
 * no-show lower bound + stale-issue reconcile that reuse the same `todayStr`)
 * anchored `todayStr`/`endDateStr` on `new Date()` + getFullYear()/getMonth()/
 * getDate(), which read the SERVER's local calendar (UTC on Vercel), not ET --
 * bookings.start_time is naive-ET (see lib/recurring's nowNaiveET header).
 *
 * At a true ET-evening instant where UTC has already rolled to tomorrow
 * (~8pm-midnight ET), the old code computed todayStr as TOMORROW's date, so
 * `gte('start_time', todayStr + 'T00:00:00')` silently excluded the rest of
 * tonight's real (still-upcoming) bookings from the whole monitored window --
 * an unassigned booking later that same ET evening never got flagged.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * confirmations/route.day-boundary.test.ts) to simulate Vercel's actual
 * runtime -- this sandbox's own local TZ (America/New_York) would otherwise
 * make the OLD buggy code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/schedule-monitor', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  process.env.CRON_SECRET = 'test-cron-secret'
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', status: 'active' }],
    bookings: [],
    schedule_issues: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/schedule-monitor — booking window anchors on ET calendar day, not server-UTC', () => {
  it('flags an unassigned booking later THIS ET evening at a 9pm EDT instant (UTC already tomorrow)', async () => {
    // 2026-07-20 is a Monday. 9pm EDT July 20 = 01:00 UTC July 21 (Tuesday) --
    // the exact window where UTC has already rolled to Tuesday but it's still
    // Monday evening in ET. Booking is naive-ET 10pm THAT SAME Monday.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T01:00:00.000Z'))

    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', status: 'scheduled',
      start_time: '2026-07-20T22:00:00', end_time: '2026-07-20T23:00:00',
      team_member_id: null, price: null, hourly_rate: null, notes: null, recurring_type: null, actual_hours: null,
      clients: { id: 'client-1', name: 'Jane Doe', address: null },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    // Correct: the booking is inside today's (ET) window, so it gets flagged
    // 'unassigned'. The bug excluded it entirely (todayStr wrongly = tomorrow).
    expect(json.new_issues).toBe(1)
    expect(h.store.schedule_issues.some((i) => i.type === 'unassigned' && (i.booking_ids as string[]).includes('b1'))).toBe(true)
  })

  it('a booking mid-afternoon ET still gets flagged (regression control)', async () => {
    // 2026-07-15 is a Wednesday, 2pm EDT = 18:00 UTC -- well clear of any
    // day-boundary risk either way.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T18:00:00.000Z'))

    h.store.bookings = [{
      id: 'b2', tenant_id: 'tenant-A', client_id: 'client-1', status: 'scheduled',
      start_time: '2026-07-15T15:00:00', end_time: '2026-07-15T16:00:00',
      team_member_id: null, price: null, hourly_rate: null, notes: null, recurring_type: null, actual_hours: null,
      clients: { id: 'client-1', name: 'Jane Doe', address: null },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.new_issues).toBe(1)
  })
})
