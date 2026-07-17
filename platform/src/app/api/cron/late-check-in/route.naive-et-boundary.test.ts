/**
 * bookings.start_time is stored naive-ET (no tz). The "late check-in" query
 * bounded it with `tenMinAgo.toISOString()` (a real UTC instant) and
 * `todayStart` built from `new Date(now); .setHours(0,0,0,0)` (the SERVER's
 * local calendar -- UTC on Vercel) then `.toISOString()`. Both are UTC
 * clock digits compared against an ET-naive column.
 *
 * During the evening ET/UTC-day-crossover window, UTC has already rolled to
 * the next calendar day while ET has not. `todayStart` then requires
 * `start_time >= <tomorrow's UTC date> 00:00:00`, which no naive-ET
 * timestamp dated "today" (ET) can satisfy -- so the cron silently finds
 * zero late-check-in candidates and pages nobody, for ~4-5h every evening,
 * even for a booking that is obviously and unambiguously late.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * A booking started at 6pm ET the same day (90 min ago, unchecked-in) must
 * still be caught.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.TZ = 'UTC'
process.env.CRON_SECRET = 'test-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    comms: { team_late_alert: { sms: false }, owner_late_alert: { sms: false } },
  })),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/late-check-in — naive-ET boundary, not server-local/UTC', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
    fake._seed('tenants', [
      { id: 'tenant-A', name: 'Acme', status: 'active', telnyx_api_key: null, telnyx_phone: null, owner_phone: null, phone: null },
    ])
    fake._seed('bookings', [
      {
        id: 'booking-late',
        tenant_id: 'tenant-A',
        status: 'scheduled',
        check_in_time: null,
        start_time: '2026-01-05T18:00:00', // naive ET, 6pm -- 90 min ago
        team_member_id: 'member-1',
        clients: { name: 'Jane Doe', phone: '+15551234567' },
        team_members: { name: 'Bob', phone: '+15557654321' },
      },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still catches an obviously-late unchecked-in booking during the evening ET/UTC crossover', async () => {
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.late_check_ins).toBe(1)
  })
})
