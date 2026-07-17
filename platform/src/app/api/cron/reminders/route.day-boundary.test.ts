/**
 * GET /api/cron/reminders — DAY-BASED REMINDERS' hour-gate + day-boundary bug
 * (see recurring.ts's etHour() and etToday() headers).
 *
 * `now.getHours() === 8` intending "8am ET" actually reads the SERVER's local
 * hour (UTC on Vercel) -- at a true 8am EDT instant (12:00 UTC), the old gate
 * never matched, so day-based client reminders silently never fired at the
 * intended time. The target/targetEnd window was also built from the
 * server's UTC calendar rather than ET, the same day-boundary bug fixed
 * elsewhere this session -- both stacked on the same feature (day-based
 * reminders, thank-you email, unpaid-team alert, pending-booking alert,
 * 8pm ops recap, 9pm digest all shared the `now.getHours() === N` gate; only
 * the ones filtering naive-ET start_time/end_time columns also had the
 * window-boundary bug).
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * confirmations/route.day-boundary.test.ts) to simulate Vercel's actual
 * runtime -- this sandbox's own local TZ (America/New_York) would otherwise
 * make the OLD code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const notifyMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: {}, timing: { reminder_days: [], reminder_hours_before: [] } })),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/reminders', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 8am EDT (12:00 UTC) -- the true ET hour day-based reminders are meant to fire at.
const NOW = new Date('2026-07-17T12:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  notifyMock.mockClear()
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', status: 'active' }],
    bookings: [],
    notifications: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/reminders — day-based reminders hour-gate + day-boundary fix', () => {
  it('sends the 1-day-out reminder at a true 8am ET instant for a booking tomorrow (ET)', async () => {
    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', team_member_id: null, status: 'scheduled',
      start_time: '2026-07-18T14:00:00', end_time: '2026-07-18T16:00:00', service_type: 'Cleaning',
      clients: { name: 'Jane Doe', phone: '+15550001111', email: 'jane@example.com' },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.results.some((r: { type: string; booking_id: string }) => r.type === 'reminder_1day' && r.booking_id === 'b1')).toBe(true)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-A',
      type: 'booking_reminder',
      recipientId: 'client-1',
      bookingId: 'b1',
    }))
  })

  it('does not send the reminder at the same wall-clock hour on the server UTC clock when that is not 8am ET', async () => {
    // 8am UTC == 4am EDT -- the OLD bug's false-positive window. The fixed
    // gate must NOT fire here.
    vi.setSystemTime(new Date('2026-07-17T08:00:00.000Z'))
    h.store.bookings = [{
      id: 'b2', tenant_id: 'tenant-A', client_id: 'client-1', team_member_id: null, status: 'scheduled',
      start_time: '2026-07-18T14:00:00', end_time: '2026-07-18T16:00:00', service_type: 'Cleaning',
      clients: { name: 'Jane Doe', phone: '+15550001111', email: 'jane@example.com' },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.results.some((r: { type: string }) => r.type === 'reminder_1day')).toBe(false)
    expect(notifyMock).not.toHaveBeenCalled()
  })
})
