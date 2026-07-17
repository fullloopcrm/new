/**
 * GET /api/cron/daily-summary — day-boundary counterpart of the naive-ET/
 * true-UTC bug fixed across this session (see recurring.ts's nowNaiveET
 * header).
 *
 * start_time is naive-ET; the ADMIN DAILY SUMMARY section's today/tomorrow/
 * weekEnd boundaries used to be built from `new Date(now); setHours(0,0,0,0)`
 * -- the SERVER's local (UTC on Vercel) calendar, not ET -- silently shifting
 * every cutoff by the ET/UTC gap (4-5h). payment_date is a genuine
 * timestamptz (written via `new Date().toISOString()`), so its
 * yesterday/today boundary correctly stays true-UTC and is untouched here.
 *
 * Pins the clock to 10pm EDT (2am UTC the next day) and forces
 * `process.env.TZ = 'UTC'` (same technique as
 * resolve-date-timezone.test.ts) to simulate Vercel's actual runtime --
 * this sandbox's own local TZ (America/New_York) would otherwise make the
 * OLD `setHours()`-based code accidentally compute a mostly-right ET
 * boundary by coincidence, masking the bug this test exists to catch.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { GET } from './route'
import { notify } from '@/lib/notify'

function req(): Request {
  return new Request('http://localhost/api/cron/daily-summary', {
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
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-cron-secret'
  h.seq = 0
  // team_members and recurring_schedules stay empty so this test exercises
  // only the ADMIN DAILY SUMMARY section (the other two sections' loops are
  // no-ops on an empty array).
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'k', status: 'active' }],
    team_members: [],
    bookings: [],
    recurring_schedules: [],
    notifications: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/daily-summary — day-boundary fix', () => {
  it('counts a booking from earlier this ET evening (21:55 ET, 5 min before a 22:00 ET "now") in todaysJobs', async () => {
    h.store.bookings = [
      { id: 'b1', tenant_id: 'tenant-A', status: 'scheduled', start_time: '2026-07-16T21:55:00' },
    ]

    await GET(req() as never)

    const call = vi.mocked(notify).mock.calls.find(([arg]) => arg.type === 'daily_summary' && arg.recipientType === 'admin')
    expect(call?.[0].metadata?.todaysJobs).toBe(1)
  })

  it('excludes a booking starting tomorrow (10am ET on the 17th) from todaysJobs but includes it in the week count', async () => {
    h.store.bookings = [
      { id: 'b2', tenant_id: 'tenant-A', status: 'scheduled', start_time: '2026-07-17T10:00:00' },
    ]

    await GET(req() as never)

    const call = vi.mocked(notify).mock.calls.find(([arg]) => arg.type === 'daily_summary' && arg.recipientType === 'admin')
    expect(call?.[0].metadata?.todaysJobs).toBe(0)
    expect(call?.[0].metadata?.upcomingSchedules).toBe(1)
  })

  it('excludes a booking 10 days out (ET) from the week count', async () => {
    h.store.bookings = [
      { id: 'b3', tenant_id: 'tenant-A', status: 'scheduled', start_time: '2026-07-27T10:00:00' },
    ]

    await GET(req() as never)

    const call = vi.mocked(notify).mock.calls.find(([arg]) => arg.type === 'daily_summary' && arg.recipientType === 'admin')
    expect(call?.[0].metadata?.upcomingSchedules).toBe(0)
  })
})
