/**
 * GET /api/cron/generate-recurring — heartbeat marker must survive the
 * zero-active-schedules early return.
 *
 * 3 separate consumers (admin/monitoring/status/route.ts,
 * cron/health-monitor/route.ts, lib/jefe/health.ts) treat the
 * `recurring_generated` notification as proof this weekly cron ran, alerting
 * (Telegram DM + dashboard red) if it's silent for 8 days. The route used to
 * write that marker only after looping over `schedules`, inside the branch
 * that only runs when `schedules.length > 0` — a `return` fired first when
 * zero tenants had an active recurring schedule. That's a fully legitimate
 * platform state, but it starved the marker forever, and all 3 consumers
 * would falsely report this cron as permanently dead — indistinguishable
 * from a real outage, re-alerting every 6h forever.
 *
 * Fix: write the marker unconditionally, before the early return, so it
 * proves "the cron executed on schedule" rather than "the cron executed AND
 * found a schedule to refill." Same bug class + fix shape as
 * email-monitor's tick (92e3192d).
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
  return new Request('http://localhost/api/cron/generate-recurring', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const NOW = new Date('2026-07-18T18:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  process.env.CRON_SECRET = 'test-cron-secret'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h.seq = 0
  h.store = {
    recurring_schedules: [],
    bookings: [],
    recurring_exceptions: [],
    notifications: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/generate-recurring heartbeat', () => {
  it('writes the health-monitor marker even when zero schedules are active', async () => {
    const res = await GET(req() as never)
    const body = await res.json()

    expect(body.generated).toBe(0)

    const marks = h.store.notifications.filter((n) => n.type === 'recurring_generated')
    expect(marks).toHaveLength(1)
  })

  it('still writes the marker when a schedule is refilled', async () => {
    h.store.recurring_schedules = [{
      id: 'sched-1', tenant_id: 'tenant-1', status: 'active',
      recurring_type: 'weekly', day_of_week: new Date(NOW).getUTCDay(),
      duration_hours: 2, team_member_id: null, property_id: null,
      service_type_id: null, client_id: 'client-1', hourly_rate: null,
      pay_rate: null, notes: null, special_instructions: null, preferred_time: null,
      extra_team_member_ids: null,
    }]

    await GET(req() as never)

    const marks = h.store.notifications.filter((n) => n.type === 'recurring_generated')
    expect(marks).toHaveLength(1)
  })
})
