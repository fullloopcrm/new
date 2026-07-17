/**
 * GET /api/cron/generate-recurring -- team_size (billing multiplier) is
 * correctly stamped onto refilled occurrences (see route.team-size.test.ts),
 * but recurring_schedules had nowhere to persist WHICH team members the
 * extra crew slots actually are, only the headcount. POST /api/client/
 * recurring writes booking_team_members rows (lead + named extras) for the
 * INITIAL batch of bookings; this cron's refill (the bulk of a series'
 * lifetime) never wrote any at all -- the admin Team panel and closeout-
 * summary had no record of who the extra crew members were on any refilled
 * occurrence. This cron now reads schedule.extra_team_member_ids and stamps
 * matching booking_team_members rows onto every generated occurrence (see
 * 2026_07_17_recurring_schedules_extra_team_member_ids.sql).
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

const NOW = new Date('2026-08-01T12:00:00.000Z')

function baseSchedule(overrides: Record<string, unknown>) {
  return {
    id: 'sched-1', tenant_id: 'tenant-A', status: 'active',
    duration_hours: 2, recurring_type: 'weekly', day_of_week: null,
    team_member_id: 'tm-lead', property_id: null, service_type_id: null,
    client_id: 'client-1', hourly_rate: 90, pay_rate: null, notes: null,
    special_instructions: null, preferred_time: null, team_size: 2,
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
      start_time: '2026-07-25T10:00:00', price: 8500, team_size: 2,
    }],
    recurring_exceptions: [],
    booking_team_members: [],
    notifications: [],
    team_members: [{
      id: 'tm-lead', tenant_id: 'tenant-A', name: 'Lead Cleaner',
      working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      schedule: null, unavailable_dates: [],
    }],
  }
})

describe('GET /api/cron/generate-recurring -- extra_team_member_ids propagation', () => {
  it('creates booking_team_members rows (lead + extras) for every refilled occurrence', async () => {
    h.store.recurring_schedules = [baseSchedule({ extra_team_member_ids: ['tm-extra-1'] })]

    await GET(req() as never)

    const generated = h.store.bookings.filter((b) => b.id !== 'book-seed')
    expect(generated.length).toBeGreaterThan(0)

    for (const b of generated) {
      const rows = h.store.booking_team_members.filter((r) => r.booking_id === b.id)
      const lead = rows.find((r) => r.is_lead)
      const extra = rows.find((r) => !r.is_lead)
      expect(lead?.team_member_id).toBe('tm-lead')
      expect(extra?.team_member_id).toBe('tm-extra-1')
    }
  })

  it('creates zero booking_team_members rows when the schedule has no named extras (solo/lead-only, unchanged behavior)', async () => {
    h.store.recurring_schedules = [baseSchedule({ extra_team_member_ids: null, team_size: null })]

    await GET(req() as never)

    const generated = h.store.bookings.filter((b) => b.id !== 'book-seed')
    expect(generated.length).toBeGreaterThan(0)
    expect(h.store.booking_team_members.length).toBe(0)
  })
})
