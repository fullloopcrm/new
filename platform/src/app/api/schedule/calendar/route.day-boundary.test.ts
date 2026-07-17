/**
 * GET /api/schedule/calendar — the operator calendar's month-grid boundary
 * and future/past comparisons were built from the SERVER's local calendar
 * (UTC on Vercel) and from `new Date(startStr)` reinterpreting a naive-ET
 * timestamp as if it were UTC, instead of going through recurring.ts's
 * etToday()/parseNaiveET() -- the same day-boundary/now-cutoff bug class
 * fixed elsewhere this session (see recurring.ts's etHour()/nowNaiveET()
 * headers).
 *
 * Two concrete failures this fixes:
 * 1. With no `month` query param, the endpoint defaulted to `new Date()`
 *    read via server-local getters to pick "the current month" -- late at
 *    night ET but already past midnight UTC, this silently rolled the grid
 *    to next month while it's still "today" in ET.
 * 2. `firstUpcoming`/the in-progress elapsed-hours calc compared
 *    `new Date(startStr).getTime()` (naive-ET reinterpreted as UTC, so
 *    under-stated by the ET/UTC gap) against the real current instant --
 *    any booking within that gap of "now" silently read as already past.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * confirmations/route.day-boundary.test.ts) to simulate Vercel's actual
 * runtime -- this sandbox's own local TZ (America/New_York) would otherwise
 * make the OLD code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }),
}))

import { GET } from './route'

function req(): NextRequest {
  return new NextRequest('http://localhost/api/schedule/calendar')
}

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  h.seq = 0
  h.store = { bookings: [], team_members: [] }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/schedule/calendar — ET day-boundary fix', () => {
  it('keeps a late-ET-night booking in the ET-current month, not the UTC-rolled-over next month', async () => {
    // 11pm EDT July 31 == 3am UTC Aug 1 -- still "today" in ET, already
    // "tomorrow" (and next month) on the server's UTC clock.
    vi.setSystemTime(new Date('2026-08-01T03:00:00.000Z'))
    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', team_member_id: null, status: 'scheduled',
      start_time: '2026-07-31T10:00:00', end_time: '2026-07-31T12:00:00',
      price: 20000, payment_status: 'unpaid', service_type: 'Cleaning',
      clients: { name: 'Jane Doe' },
    }]

    const res = await GET(req())
    const json = await res.json()

    expect(json.month).toBe('2026-07')
    const julyDays = json.grid.days.map((d: { date: string }) => d.date)
    expect(julyDays).toContain('2026-07-31')
    const day = json.grid.days.find((d: { date: string }) => d.date === '2026-07-31')
    expect(day.jobs_count).toBe(1)
    expect(json.stats.today_total).toBe(1)
  })

  it('flags a booking 1 real hour from now as upcoming, not already past', async () => {
    // 2pm EDT == 18:00 UTC "now"; booking is 3pm EDT (naive-ET) == 19:00 UTC true instant.
    vi.setSystemTime(new Date('2026-07-31T18:00:00.000Z'))
    h.store.bookings = [{
      id: 'b2', tenant_id: 'tenant-A', team_member_id: null, status: 'scheduled',
      start_time: '2026-07-31T15:00:00', end_time: '2026-07-31T17:00:00',
      price: 20000, payment_status: 'unpaid', service_type: 'Cleaning',
      clients: { name: 'Jane Doe' },
    }]

    const res = await GET(req())
    const json = await res.json()

    expect(json.stats.first_upcoming).not.toBeNull()
    expect(json.stats.first_upcoming.client).toBe('Jane Doe')
  })
})
