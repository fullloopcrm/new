/**
 * GET /api/cron/late-check-in — this cron never wrote its own liveness
 * marker. All 3 health-monitor consumers (admin/monitoring/status/route.ts,
 * cron/health-monitor/route.ts, lib/jefe/health.ts) instead keyed this
 * cron's liveness off the real `late_check_in` notification type — but that
 * type only gets written when an actual late check-in/check-out is
 * detected. Zero late events platform-wide for 7 days is a legitimate (good
 * ops!) state, not proof the cron is down, yet it would falsely and
 * permanently flag this cron as dead and re-alert every 6h forever.
 *
 * Fix: write a dedicated `late_check_in_tick` marker unconditionally on
 * every invocation (never reused for the real per-booking event, so the two
 * meanings stay separate), and repoint all 3 consumers at it. Same bug
 * class + fix shape as email-monitor's tick (92e3192d) and
 * generate-recurring's marker (this session).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({ fake: null as FakeSupabase | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

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

// Same fixture moment as the claim-before-send-race test: 2am UTC on the
// 17th = 10pm EDT on the 16th, satisfying both the ET-instant and
// ET-day-boundary filters for a booking that started 21:45 ET.
const NOW = new Date('2026-07-17T02:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/late-check-in heartbeat', () => {
  it('writes the health-monitor tick even when there are zero active tenants (and so zero possible late events)', async () => {
    h.fake = createFakeSupabase({ tenants: [], bookings: [], notifications: [] })

    const res = await GET(req())
    const body = await res.json()

    expect(body.late_check_ins).toBe(0)
    expect(body.late_check_outs).toBe(0)

    const ticks = h.fake!._all('notifications').filter((n) => n.type === 'late_check_in_tick')
    expect(ticks).toHaveLength(1)
  })

  it('writes the tick as a distinct type from the real late_check_in event when one fires', async () => {
    h.fake = createFakeSupabase({
      tenants: [{
        id: 'tenant-A', name: 'Acme Cleaning', status: 'active',
        telnyx_api_key: 'key', telnyx_phone: '+15551234567',
        owner_phone: '+15550009999', phone: null,
      }],
      bookings: [{
        id: 'b1', tenant_id: 'tenant-A', status: 'scheduled', check_in_time: null,
        start_time: '2026-07-16T21:45:00', team_member_id: 'tm-1',
        clients: { name: 'Jane Doe', phone: '+15550001111' },
        team_members: { name: 'Cleaner Cathy', phone: '+15559998888' },
      }],
      notifications: [],
    })
    h.fake._addUniqueConstraint('notifications', 'booking_id')

    await GET(req())

    const ticks = h.fake!._all('notifications').filter((n) => n.type === 'late_check_in_tick')
    const events = h.fake!._all('notifications').filter((n) => n.type === 'late_check_in')
    expect(ticks).toHaveLength(1)
    expect(events).toHaveLength(1)
  })
})
