/**
 * GET /api/cron/daily-summary — recurring-expiration 30-day warning.
 *
 * The route's "RECURRING EXPIRATION CHECK" section finds each active
 * schedule's latest not-yet-serviced booking via
 * `.in('status', ['scheduled', 'pending'])`, while the sibling "TEAM MEMBER
 * 3-DAY LOOKAHEAD" section 60 lines above it queries the same bookings table
 * with `.in('status', ['scheduled', 'confirmed', 'pending'])` -- the same
 * stale-allowlist class already fixed across the recurring-schedules route
 * family (2c0e1a16, 524ce5b0). A schedule whose only remaining booking has
 * progressed to 'confirmed' was invisible to the expiration query: the fake's
 * `.order()`/`.limit()` are inert (real Postgres would've picked an EARLIER
 * scheduled/pending row if one existed, or nothing at all), so in production
 * a schedule with just one upcoming visit that's already confirmed never
 * warned the admin it was ending -- the notification silently never fired.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
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

const NOW = new Date('2026-07-16T08:00:00.000Z')
const inDays = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'k', status: 'active' }],
    team_members: [],
    bookings: [],
    recurring_schedules: [
      { id: 'sched-1', tenant_id: 'tenant-A', client_id: 'client-1', recurring_type: 'weekly', status: 'active', clients: { name: 'Jane Client' } },
    ],
    notifications: [],
  }
})

describe('GET /api/cron/daily-summary — recurring expiration 30-day warning', () => {
  it('warns when the schedule\'s only upcoming booking is already confirmed (not just scheduled/pending)', async () => {
    h.store.bookings = [
      { id: 'book-1', schedule_id: 'sched-1', status: 'confirmed', start_time: inDays(10) },
    ]

    await GET(req() as never)

    const expiringCalls = vi.mocked(notify).mock.calls.filter(([arg]) => arg.type === 'booking_reminder')
    expect(expiringCalls).toHaveLength(1)
    expect(h.store.notifications.some((n) => n.type === 'recurring_expiring')).toBe(true)
  })

  it('still warns for the plain scheduled/pending case (no regression)', async () => {
    h.store.bookings = [
      { id: 'book-1', schedule_id: 'sched-1', status: 'pending', start_time: inDays(5) },
    ]

    await GET(req() as never)

    expect(h.store.notifications.some((n) => n.type === 'recurring_expiring')).toBe(true)
  })

  it('does not warn when the last booking is more than 30 days out', async () => {
    h.store.bookings = [
      { id: 'book-1', schedule_id: 'sched-1', status: 'confirmed', start_time: inDays(60) },
    ]

    await GET(req() as never)

    expect(h.store.notifications.some((n) => n.type === 'recurring_expiring')).toBe(false)
  })

  it('does not warn for a cancelled last booking', async () => {
    h.store.bookings = [
      { id: 'book-1', schedule_id: 'sched-1', status: 'cancelled', start_time: inDays(10) },
    ]

    await GET(req() as never)

    expect(h.store.notifications.some((n) => n.type === 'recurring_expiring')).toBe(false)
  })
})
