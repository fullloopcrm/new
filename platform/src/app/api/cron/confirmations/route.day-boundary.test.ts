/**
 * GET /api/cron/confirmations — CLIENT DAY-BEFORE CONFIRMATION's hour-gate +
 * day-boundary bug (see recurring.ts's etHour() and etToday() headers).
 *
 * `now.getHours() === 13` intending "1pm ET" actually reads the SERVER's
 * local hour (UTC on Vercel) -- at a true 1pm EDT instant (17:00 UTC), the
 * old gate never matched, so this feature silently never fired at the
 * intended time. The tomorrowStart/tomorrowEnd window was also built from
 * the server's UTC calendar rather than ET, the same day-boundary bug fixed
 * elsewhere this session.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * resolve-date-timezone.test.ts) to simulate Vercel's actual runtime --
 * this sandbox's own local TZ (America/New_York) would otherwise make the
 * OLD code accidentally behave correctly by coincidence.
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
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: {}, timing: {} })),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/confirmations', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

// 1pm EDT (17:00 UTC) -- the true ET hour this feature is meant to fire at.
const NOW = new Date('2026-07-17T17:00:00.000Z')
const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }],
    bookings: [],
    notifications: [],
  }
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('GET /api/cron/confirmations — client day-before hour-gate + day-boundary fix', () => {
  it('sends the day-before confirmation at a true 1pm ET instant for a booking tomorrow (ET)', async () => {
    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', status: 'scheduled',
      start_time: '2026-07-18T14:00:00',
      clients: { name: 'Jane Doe', phone: '+15550001111' },
      team_members: null,
    }]

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.results.some((r: { type: string; recipient: string }) => r.type === 'client_confirm' && r.recipient === 'Jane Doe')).toBe(true)
  })
})
