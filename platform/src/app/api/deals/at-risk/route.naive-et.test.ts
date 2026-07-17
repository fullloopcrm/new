/**
 * GET /api/deals/at-risk (the sales-outreach "workable client" feed) compared
 * bookings.start_time -- stored as naive ET wall-clock, not UTC, same
 * convention as everywhere else in this codebase -- via a raw `new Date()`
 * parse against a true-UTC `now`. That misreads the ET wall-clock numbers as
 * UTC, which UNDERSTATES the real instant by the ET/UTC gap (4-5h, since ET
 * runs behind UTC). Net effect: a booking genuinely still hours away in real
 * time reads as already in the past -- hiding it from `withUpcoming`, and
 * potentially surfacing that client in `workable` (reactivation outreach)
 * even though they already have a real upcoming booking.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * no-show-check/route.day-boundary.test.ts) to simulate Vercel's actual
 * runtime -- this sandbox's own local TZ (America/New_York) would otherwise
 * make the OLD buggy code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))

import { GET } from './route'

// 10:00am EDT (14:00 UTC).
const NOW = new Date('2026-07-17T14:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = { clients: [], bookings: [], deals: [] }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/deals/at-risk -- naive-ET vs true-UTC start_time comparison', () => {
  it('a booking genuinely 1h away in real ET time (11am ET) IS counted as upcoming, not misread as already past', async () => {
    // NOW is 10:00 AM EDT. Booking's naive-ET start_time is 11:00 AM ET --
    // true instant 15:00 UTC, genuinely 1h ahead of NOW (14:00 UTC). The old
    // bug misparsed "11:00:00" as 11:00 UTC (< 14:00 UTC), wrongly reading
    // this real near-future booking as already in the past.
    h.store.clients = [
      { id: 'client-A', tenant_id: 'tenant-A', name: 'Near-Future Booking Client', email: null, phone: null, address: null, status: 'active', created_at: '2026-01-01', do_not_service: false, last_outreach_at: null, outreach_count: 0, outreach_status: 'none' },
    ]
    h.store.bookings = [
      { client_id: 'client-A', tenant_id: 'tenant-A', start_time: '2026-07-17T11:00:00', status: 'scheduled', price: 20000 },
    ]
    h.store.deals = []

    const res = await GET()
    const json = await res.json()

    expect(json.withUpcoming.map((c: { id: string }) => c.id)).toContain('client-A')
    expect(json.workable.map((c: { id: string }) => c.id)).not.toContain('client-A')
  })

  it('a booking genuinely well in the past (yesterday ET) is correctly not upcoming (regression control)', async () => {
    h.store.clients = [
      { id: 'client-B', tenant_id: 'tenant-A', name: 'Past Booking Client', email: null, phone: null, address: null, status: 'active', created_at: '2026-01-01', do_not_service: false, last_outreach_at: null, outreach_count: 0, outreach_status: 'none' },
    ]
    h.store.bookings = [
      { client_id: 'client-B', tenant_id: 'tenant-A', start_time: '2026-07-16T09:00:00', status: 'completed', price: 20000 },
    ]
    h.store.deals = []

    const res = await GET()
    const json = await res.json()

    expect(json.workable.map((c: { id: string }) => c.id)).toContain('client-B')
    expect(json.withUpcoming.map((c: { id: string }) => c.id)).not.toContain('client-B')
  })
})
