/**
 * GET /api/cron/generate-recurring -- recurring_type 'custom' schedules used
 * to NEVER refill: generateRecurringDates' 'custom' case only ever echoed
 * its own anchor date with nothing to step by, so nextOccurrenceDates'
 * `.slice(1)` always returned zero dates, silently and permanently, with no
 * error and no admin-facing signal (see
 * 2026_07_17_recurring_schedules_custom_interval.sql). This cron now reads
 * the schedule's stored custom_interval_days and passes it through so a
 * 'custom' schedule refills exactly like every other recurring_type -- and
 * when that interval was never captured, notifies admin instead of quietly
 * going stale forever.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
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

// Fixed "now" far from any DST/ET-boundary edge.
const NOW = new Date('2026-08-01T12:00:00.000Z')

function baseSchedule(overrides: Record<string, unknown>) {
  return {
    id: 'sched-1', tenant_id: 'tenant-A', status: 'active',
    duration_hours: 2, recurring_type: 'custom', day_of_week: null,
    team_member_id: null, property_id: null, service_type_id: null,
    client_id: 'client-1', hourly_rate: 90, pay_rate: null, notes: null,
    special_instructions: null, preferred_time: null,
    ...overrides,
  }
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h.seq = 0
  h.store = {
    recurring_schedules: [],
    bookings: [{
      id: 'book-seed', schedule_id: 'sched-1', tenant_id: 'tenant-A',
      start_time: '2026-07-25T10:00:00', price: 8500,
    }],
    recurring_exceptions: [],
    notifications: [],
  }
})

describe('GET /api/cron/generate-recurring -- custom recurring_type refill', () => {
  it('refills at the stored custom_interval_days cadence instead of generating zero bookings', async () => {
    h.store.recurring_schedules = [baseSchedule({ custom_interval_days: 10 })]

    await GET(req() as never)

    const generated = h.store.bookings.filter((b) => b.id !== 'book-seed')
    expect(generated.length).toBeGreaterThan(0)
    const dates = generated.map((b) => String(b.start_time).slice(0, 10)).sort()
    // book-seed is 2026-07-25; a 10-day cadence lands the first refill on 08-04.
    expect(dates[0]).toBe('2026-08-04')
    expect(h.store.notifications.filter((n) => n.type === 'recurring_generation_conflict')).toHaveLength(0)
  })

  it('generates zero bookings and notifies admin when custom_interval_days was never captured, instead of silently staying quiet forever', async () => {
    h.store.recurring_schedules = [baseSchedule({ custom_interval_days: null })]

    await GET(req() as never)

    const generated = h.store.bookings.filter((b) => b.id !== 'book-seed')
    expect(generated).toHaveLength(0)
    const conflicts = h.store.notifications.filter((n) => n.type === 'recurring_generation_conflict')
    expect(conflicts).toHaveLength(1)
    expect(String(conflicts[0].message)).toContain('sched-1')
  })
})
