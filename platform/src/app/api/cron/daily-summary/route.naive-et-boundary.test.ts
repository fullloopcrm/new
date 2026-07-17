import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * bookings.start_time/end_time are naive-ET TIMESTAMP columns (no tz) --
 * literally the ET wall-clock digits, nothing else. The admin "today's
 * jobs" / "this week" boundaries were built with `.setHours(0,0,0,0)` /
 * `.setDate()` off a real `new Date()` "now" and then `.toISOString()`'d --
 * server-local (UTC on Vercel), so "today" was the UTC calendar day, not
 * the ET one. During the ~8pm-midnight ET window (UTC already past
 * midnight, ET not yet), a booking scheduled for "today" in ET terms fell
 * OUTSIDE the computed [today, tomorrow) range and was missed from the
 * admin's daily summary counts entirely.
 *
 * Real time in this test: 2026-01-06T04:30:00Z = 11:30pm EST Jan 5 -- UTC
 * calendar day is already Jan 6; ET calendar day is still Jan 5.
 */
process.env.TZ = 'UTC' // pin server-local tz to match prod (Vercel)
process.env.CRON_SECRET = 'test-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return { supabaseAdmin: fake, __fake: fake }
})

const notifyCalls: { type: string; metadata?: Record<string, unknown> }[] = []
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async (args: { type: string; metadata?: Record<string, unknown> }) => {
    notifyCalls.push(args)
  }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/daily-summary — naive-ET boundary, not UTC calendar day', () => {
  beforeEach(() => {
    notifyCalls.length = 0
    fake._store.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T04:30:00.000Z')) // 11:30pm EST Jan 5
    fake._seed('tenants', [
      { id: 'tenant-A', name: 'Test Co', status: 'active', telnyx_api_key: null, telnyx_phone: null, resend_api_key: null },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("counts a booking scheduled for today (ET) in the admin summary's todaysJobs -- NOT tomorrow's UTC-calendar-day booking, which is what the pre-fix boundary counted instead", async () => {
    // Only a true-today-in-ET booking seeded. Pre-fix, the boundary was
    // shifted to UTC's calendar day (Jan 6, one day ahead of ET here), so
    // this booking fell outside [today, tomorrow) and todaysJobs read 0.
    fake._seed('bookings', [
      { id: 'booking-today-et', tenant_id: 'tenant-A', status: 'scheduled', start_time: '2026-01-05T08:00:00' },
    ])

    const res = await GET(req())
    expect(res.status).toBe(200)

    const adminSummary = notifyCalls.find((c) => c.type === 'daily_summary' && 'todaysJobs' in (c.metadata || {}))
    expect(adminSummary).toBeDefined()
    expect(adminSummary?.metadata?.todaysJobs).toBe(1)
  })

  it("includes today's (ET) booking in the 7-day upcoming count, which the pre-fix UTC-shifted boundary excluded", async () => {
    fake._seed('bookings', [
      { id: 'booking-today-et', tenant_id: 'tenant-A', status: 'scheduled', start_time: '2026-01-05T08:00:00' },
      { id: 'booking-tomorrow-et', tenant_id: 'tenant-A', status: 'scheduled', start_time: '2026-01-06T08:00:00' },
    ])

    const res = await GET(req())
    expect(res.status).toBe(200)

    const adminSummary = notifyCalls.find((c) => c.type === 'daily_summary' && 'todaysJobs' in (c.metadata || {}))
    expect(adminSummary).toBeDefined()
    // Both bookings (today + tomorrow ET) fall inside [today ET, +7 days).
    // Pre-fix, the UTC-shifted "today" boundary excluded the Jan-5 (ET)
    // booking, undercounting to 1.
    expect(adminSummary?.metadata?.upcomingSchedules).toBe(2)
  })
})
