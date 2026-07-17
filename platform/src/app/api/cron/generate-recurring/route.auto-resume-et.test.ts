/**
 * GET /api/cron/generate-recurring -- the NYC-Maid-scoped auto-resume block
 * compared recurring_schedules.paused_until (an ET calendar date, per
 * pause/route.ts's own `paused_until + 'T23:59:59'` naive-ET convention)
 * against a true-UTC calendar day (`new Date().toISOString().split('T')[0]`).
 * Since UTC's calendar day rolls over ~4-5h (the ET/UTC gap) before ET's real
 * midnight, a paused schedule could auto-resume up to 4-5h before the
 * client's chosen resume date actually arrived in real ET time.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * no-show-check/route.day-boundary.test.ts) to simulate Vercel's actual
 * runtime -- this sandbox's own local TZ (America/New_York) would otherwise
 * make the OLD buggy code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'

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
  return new Request('http://localhost/api/cron/generate-recurring', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 9:00 PM EDT July 17 -- already 1:00 AM UTC July 18 (UTC's calendar day has
// rolled over to the 18th, but the real ET calendar day is still the 17th).
const NOW = new Date('2026-07-18T01:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  process.env.CRON_SECRET = 'test-cron-secret'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h.seq = 0
  h.store = {
    recurring_schedules: [{
      id: 'sched-1', tenant_id: NYCMAID_TENANT_ID, status: 'paused',
      paused_until: '2026-07-18', duration_hours: 3, recurring_type: 'weekly',
      day_of_week: 5, team_member_id: null, property_id: null,
      service_type_id: null, client_id: 'client-1', hourly_rate: null,
      pay_rate: null, notes: null, special_instructions: null, preferred_time: null,
    }],
    // Far-future booking so this schedule's "already generated enough"
    // 4-weeks-out check short-circuits before the (unmocked) smart-schedule/
    // day-availability generation logic ever runs -- isolates this test to
    // just the auto-resume date comparison.
    bookings: [{ schedule_id: 'sched-1', tenant_id: NYCMAID_TENANT_ID, start_time: '2026-09-01T10:00:00' }],
    recurring_exceptions: [],
    notifications: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/generate-recurring -- auto-resume ET/UTC day-boundary fix', () => {
  it('does NOT auto-resume a schedule paused through the 18th while the real ET calendar date is still the 17th', async () => {
    await GET(req() as never)

    const schedule = h.store.recurring_schedules.find((s) => s.id === 'sched-1')
    expect(schedule?.status).toBe('paused')
    expect(schedule?.paused_until).toBe('2026-07-18')
  })
})
