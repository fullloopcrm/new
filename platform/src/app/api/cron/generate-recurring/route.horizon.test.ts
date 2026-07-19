import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * cron/generate-recurring — widened generation horizon (nycmaid ref d307903c,
 * ported P1/W2). Previously this cron stopped generating new bookings for a
 * schedule once its latest booking was >= 4 weeks out, which is why later
 * months looked hollow on the dashboard even for a standing weekly/monthly
 * client. Now it keeps generating through the end of next year.
 */

process.env.CRON_SECRET = 'test-cron-secret'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ smart_recurring_assign: false })),
}))
vi.mock('@/lib/client-properties', () => ({ getBookingAddress: vi.fn(async () => null) }))
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: vi.fn(async () => []),
  pickBestTeam: vi.fn(() => ({ lead: null, extras: [], short: 0 })),
}))
vi.mock('@/lib/day-availability', () => ({
  worksScheduledDay: () => true,
  slotWithinHours: () => true,
}))
vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))

// Real @/lib/recurring — this suite exists specifically to prove the real
// generateRecurringDates + iterationsToHorizon combination actually reaches
// the widened horizon, not a mocked stand-in.
import { GET, iterationsToHorizon } from './route'

const TENANT = 'tid-a'

function cronReq(): Request {
  return new Request('http://t/api/cron/generate-recurring', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

function baseSchedule(id: string) {
  return {
    id, tenant_id: TENANT, client_id: 'c-1', property_id: null, team_member_id: null,
    recurring_type: 'weekly', day_of_week: 1, preferred_time: '09:00', duration_hours: 2,
    hourly_rate: 50, pay_rate: 20, notes: null, special_instructions: null,
    status: 'active', service_type_id: null,
  }
}

function horizonDate(): Date {
  return new Date(new Date().getFullYear() + 1, 11, 31)
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    tenants: [{ id: TENANT, status: 'active' }],
    recurring_schedules: [],
    bookings: [],
  })
  holder.from = h.from
})

describe('iterationsToHorizon (pure)', () => {
  it('gives enough weekly iterations to actually reach a ~70-day horizon', () => {
    const start = new Date()
    const horizon = new Date(start.getTime() + 70 * 86400000)
    const n = iterationsToHorizon('weekly', start, horizon)
    // weekly steps 7 days/iteration — need at least 70/7 = 10 to not undershoot.
    expect(n).toBeGreaterThanOrEqual(10)
  })

  it('gives enough monthly iterations to actually reach a ~2-year horizon', () => {
    const start = new Date()
    const horizon = new Date(start.getTime() + 730 * 86400000)
    const n = iterationsToHorizon('monthly_date', start, horizon)
    // monthly_date steps ~1 month/iteration — need at least ~24 to cover 2 years.
    expect(n).toBeGreaterThanOrEqual(24)
  })
})

describe('cron/generate-recurring — widened horizon (integration)', () => {
  it('WIDENED: still generates new bookings for a schedule whose latest booking is 10 weeks out (past the old 4-week cutoff)', async () => {
    const tenWeeksOut = new Date(Date.now() + 70 * 86400000)
    h.seed.recurring_schedules!.push(baseSchedule('rs-widened'))
    h.seed.bookings!.push({
      id: 'b-existing', tenant_id: TENANT, schedule_id: 'rs-widened',
      start_time: tenWeeksOut.toISOString(), status: 'scheduled',
    })

    const res = await GET(cronReq())
    expect(res.status).toBe(200)

    const inserted = h.capture.inserts.filter((i) => i.table === 'bookings')
      .flatMap((i) => i.rows).filter((r) => r.schedule_id === 'rs-widened')
    // Old 4-week-buffer logic would have `continue`d immediately here (0 new
    // rows) since the existing booking is already 10 weeks out.
    expect(inserted.length).toBeGreaterThan(0)
    for (const row of inserted) {
      expect(new Date(String(row.start_time)).getTime()).toBeLessThanOrEqual(horizonDate().getTime())
    }
  })

  it('STOPS AT HORIZON: a schedule already generated through the horizon gets zero new bookings, not an infinite/runaway backfill', async () => {
    const wayPastHorizon = new Date(horizonDate().getTime() + 400 * 86400000)
    h.seed.recurring_schedules!.push(baseSchedule('rs-at-horizon'))
    h.seed.bookings!.push({
      id: 'b-far-future', tenant_id: TENANT, schedule_id: 'rs-at-horizon',
      start_time: wayPastHorizon.toISOString(), status: 'scheduled',
    })

    const res = await GET(cronReq())
    expect(res.status).toBe(200)

    const inserted = h.capture.inserts.filter((i) => i.table === 'bookings')
      .flatMap((i) => i.rows).filter((r) => r.schedule_id === 'rs-at-horizon')
    expect(inserted.length).toBe(0)
  })
})
