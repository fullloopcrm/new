import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * cron/generate-recurring — terminated-crew guard (P1/W2 fresh-ground, gap #12
 * closed: "Recurring-schedule assignment (admin/recurring-schedules* + the
 * generate-recurring cron) has no terminated-crew check").
 *
 * BUG (fixed here): HR termination never touches team_members.status/active
 * (deliberate — see hr.ts) and this weekly cron writes straight into
 * `bookings` via supabaseAdmin, bypassing POST /api/bookings' own
 * terminated-crew guard (which only runs on THAT route, not on a direct
 * table write). Every recurring schedule still pointed at a fired member's
 * team_member_id would keep auto-generating them onto brand-new FUTURE
 * bookings, every week, forever, with zero warning -- same bug class already
 * fixed on the primary/project booking flows (53e83ee4), just never reached
 * on this write path since it materializes bookings itself instead of going
 * through the guarded route.
 *
 * FIX: binary-lock path (smart_recurring_assign OFF, the default) now checks
 * getTerminatedTeamMemberIds before honoring schedule.team_member_id, same as
 * the existing day-off/outside-hours checks -- falls back to UNASSIGNED +
 * flagged instead of a false standing assignment. The smart-assign path (ON)
 * inherits the same guard for free via scoreTeamForBooking's own terminated
 * filter (tested separately in smart-schedule.terminated-crew-guard.test.ts).
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
// Deterministic: always generate exactly one occurrence on the cron's own
// computed start date, so the test doesn't depend on wall-clock timing.
vi.mock('@/lib/recurring', () => ({
  generateRecurringDates: ({ startDate }: { startDate: Date }) => [startDate],
}))

import { GET } from './route'

const CTX_TENANT = 'tid-a'

function seed() {
  return {
    recurring_schedules: [
      {
        id: 'rs-terminated', tenant_id: CTX_TENANT, client_id: 'c-a', property_id: null,
        team_member_id: 'tm-terminated', recurring_type: 'weekly', day_of_week: 1,
        preferred_time: '09:00', duration_hours: 2, hourly_rate: 50, pay_rate: 20,
        notes: null, special_instructions: null, status: 'active', service_type_id: null,
      },
      {
        id: 'rs-active', tenant_id: CTX_TENANT, client_id: 'c-a', property_id: null,
        team_member_id: 'tm-active', recurring_type: 'weekly', day_of_week: 1,
        preferred_time: '09:00', duration_hours: 2, hourly_rate: 50, pay_rate: 20,
        notes: null, special_instructions: null, status: 'active', service_type_id: null,
      },
    ],
    bookings: [] as Record<string, unknown>[],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT, name: 'Let Go Larry', working_days: null, schedule: null, unavailable_dates: null },
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Active Amy', working_days: null, schedule: null, unavailable_dates: null },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
  }
}

function cronReq(): Request {
  return new Request('http://t/api/cron/generate-recurring', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('cron/generate-recurring — terminated-crew guard (binary-lock path)', () => {
  it('BLOCKED: a terminated member\'s schedule generates the booking UNASSIGNED, flagged, not silently reassigned to them', async () => {
    const res = await GET(cronReq())
    expect(res.status).toBe(200)

    const inserted = h.capture.inserts.filter((i) => i.table === 'bookings')
    const terminatedRow = inserted.flatMap((i) => i.rows).find((r) => r.schedule_id === 'rs-terminated')
    expect(terminatedRow).toBeDefined()
    expect(terminatedRow!.team_member_id).toBeNull()
    expect(String(terminatedRow!.notes)).toMatch(/no longer employed/i)
  })

  it('CONTROL: an active member\'s schedule still auto-assigns them normally', async () => {
    const res = await GET(cronReq())
    expect(res.status).toBe(200)

    const inserted = h.capture.inserts.filter((i) => i.table === 'bookings')
    const activeRow = inserted.flatMap((i) => i.rows).find((r) => r.schedule_id === 'rs-active')
    expect(activeRow).toBeDefined()
    expect(activeRow!.team_member_id).toBe('tm-active')
  })

  it('WRONG-TENANT PROBE: a same-id team member terminated only in ANOTHER tenant does not block this tenant\'s schedule', async () => {
    // A different tenant's hr_employee_profiles row happens to reference the
    // same team_member_id (ids aren't tenant-namespaced) -- getTerminatedTeamMemberIds
    // must scope by (tenant_id, team_member_id), not just team_member_id, or a
    // termination in Tenant B would wrongly freeze Tenant A's own active member.
    h.seed.hr_employee_profiles.push({
      id: 'p3', tenant_id: 'tid-OTHER', team_member_id: 'tm-active', hr_status: 'terminated',
    })
    const res = await GET(cronReq())
    expect(res.status).toBe(200)
    const inserted = h.capture.inserts.filter((i) => i.table === 'bookings')
    const activeRow = inserted.flatMap((i) => i.rows).find((r) => r.schedule_id === 'rs-active')
    expect(activeRow!.team_member_id).toBe('tm-active')
  })
})
