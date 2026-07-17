/**
 * GET /api/cron/late-check-in — naive-ET/true-UTC bug on the LATE CHECK-IN
 * query (see recurring.ts's nowNaiveET header).
 *
 * start_time is naive-ET. The old tenMinAgo/todayStart cutoffs were built
 * from a true-UTC `now`, so both the instant-cutoff filter (`lte`) and the
 * day-boundary filter (`gte`) silently misread the naive-ET column as UTC.
 * This test pins the clock to a moment where the UTC calendar day has
 * already rolled over but the ET calendar day has not (10pm EDT = 2am UTC
 * the next day) -- exactly the window where the old UTC-built `todayStart`
 * diverges from the true ET midnight and drops a legitimately-late booking
 * from earlier that ET evening.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * resolve-date-timezone.test.ts) to simulate Vercel's actual runtime, since
 * this sandbox's own local TZ (America/New_York) would otherwise make the
 * OLD `setHours()`-based code accidentally compute the right ET boundary by
 * coincidence, masking the bug this test exists to catch.
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
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: {}, timing: {} })),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/late-check-in', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 2am UTC on the 17th = 10pm EDT on the 16th -- the ET calendar day is still
// the 16th even though the UTC calendar day has already become the 17th.
const NOW = new Date('2026-07-17T02:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', status: 'active', telnyx_api_key: null, telnyx_phone: null, owner_phone: null, phone: null }],
    bookings: [],
    notifications: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/late-check-in — day-boundary + instant-cutoff fix', () => {
  it('flags a booking from earlier this ET evening (21:45 ET, 15 min before a 22:00 ET "now") as a late check-in', async () => {
    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', status: 'scheduled', check_in_time: null,
      start_time: '2026-07-16T21:45:00', team_member_id: null,
      clients: { name: 'Jane Doe', phone: '+15550001111' },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.late_check_ins).toBe(1)
    expect(h.store.notifications.some((n) => n.type === 'late_check_in' && n.booking_id === 'b1')).toBe(true)
  })

  it('does not flag a booking starting in the next few minutes (within the 10-min grace window)', async () => {
    h.store.bookings = [{
      id: 'b2', tenant_id: 'tenant-A', status: 'scheduled', check_in_time: null,
      start_time: '2026-07-16T21:58:00', team_member_id: null,
      clients: { name: 'Jane Doe', phone: '+15550001111' },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.late_check_ins).toBe(0)
  })
})
