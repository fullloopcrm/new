/**
 * GET /api/cron/generate-recurring -- team_size is a real billing multiplier
 * (closeout-summary, team-portal/checkout both do
 * Math.max(1, booking.team_size || 1)). POST /api/client/recurring lets a
 * client pick a lead + extras and stamps team_size onto its INITIAL batch of
 * bookings, but recurring_schedules never had anywhere to persist it -- this
 * cron's refill (everything past that initial ~6-week batch, i.e. the bulk
 * of a series' lifetime) built its insert from `schedule` alone, which had
 * no team_size to read, so every refilled occurrence silently reverted to
 * solo (see 2026_07_17_recurring_schedules_team_size.sql). This cron now
 * reads schedule.team_size and stamps it onto every generated occurrence.
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
      start_time: '2026-07-25T10:00:00', price: 8500, team_size: 3,
    }],
    recurring_exceptions: [],
    notifications: [],
  }
})

describe('GET /api/cron/generate-recurring -- team_size propagation', () => {
  it('stamps the schedule’s team_size onto every refilled occurrence instead of reverting to solo', async () => {
    h.store.recurring_schedules = [baseSchedule({ team_size: 3 })]

    await GET(req() as never)

    const generated = h.store.bookings.filter((b) => b.id !== 'book-seed')
    expect(generated.length).toBeGreaterThan(0)
    for (const b of generated) expect(b.team_size).toBe(3)
  })

  it('leaves team_size null (solo, same as every read site’s fallback) when the schedule never had a crew > 1', async () => {
    h.store.recurring_schedules = [baseSchedule({ team_size: null })]

    await GET(req() as never)

    const generated = h.store.bookings.filter((b) => b.id !== 'book-seed')
    expect(generated.length).toBeGreaterThan(0)
    for (const b of generated) expect(b.team_size).toBeNull()
  })
})
