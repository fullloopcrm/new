import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/dashboard/schedules/import — terminated-crew guard (P1/W2
 * fresh-ground).
 *
 * Same gap class as every other team_member_id assignment path already fixed
 * this session (POST /api/bookings, admin/recurring-schedules, the
 * generate-recurring cron, client/recurring, client/reschedule): a write path
 * that resolves a team_member_id and never checked hr_status. This route
 * raw-inserts bookings.team_member_id / recurring_schedules.team_member_id
 * straight past every guarded route (POST /api/bookings, admin/recurring-
 * schedules) via supabaseAdmin, matching staff purely by NAME against every
 * team_members row for the tenant with no HR filter — a bulk-onboarding
 * spreadsheet import naming an already-terminated employee (a stale export,
 * or a re-run after the tenant let someone go) would otherwise silently
 * assign real future/recurring appointments to them.
 *
 * FIX: staffByName's matched ids are checked against
 * getTerminatedTeamMemberIds before each row is built. A terminated match
 * still imports the appointment (never drop a real client's booking) but
 * unassigned, with a warning surfaced back to the operator instead of a
 * silent assignment.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    clients: [{ id: 'c1', tenant_id: A, name: 'Jane Client', phone: '2125551234' }],
    team_members: [
      { id: 'tm-terminated', tenant_id: A, name: 'Fired Fran' },
      { id: 'tm-active', tenant_id: A, name: 'Active Alex' },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: A, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: A, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    bookings: [],
    recurring_schedules: [],
  })
  holder.from = h.from
})

function post(rows: unknown[]) {
  return POST(new Request('http://t/api/dashboard/schedules/import', { method: 'POST', body: JSON.stringify({ rows }) }))
}

describe('schedules/import POST — terminated-crew guard', () => {
  it('BLOCKED: a one-time-booking row naming a terminated staff member imports unassigned, with a warning', async () => {
    const res = await post([
      { client_name: 'Jane Client', staff_name: 'Fired Fran', start: '2026-08-01T10:00:00Z', duration_hours: '2', service_type: 'Clean' },
    ])
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.importedBookings).toBe(1)
    expect(body.warnings).toEqual([
      'Row 1: staff "Fired Fran" is no longer active — imported unassigned',
    ])
    const ins = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(ins!.rows[0].team_member_id).toBeNull()
  })

  it('BLOCKED: a recurring-schedule row naming a terminated staff member imports unassigned, with a warning', async () => {
    const res = await post([
      { client_name: 'Jane Client', staff_name: 'Fired Fran', recurring_type: 'weekly', day_of_week: 'monday', preferred_time: '09:00' },
    ])
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.importedRecurring).toBe(1)
    expect(body.warnings.length).toBe(1)
    const ins = h.capture.inserts.find((i) => i.table === 'recurring_schedules')
    expect(ins!.rows[0].team_member_id).toBeNull()
  })

  it('CONTROL: an active staff member still imports assigned, with no warning', async () => {
    const res = await post([
      { client_name: 'Jane Client', staff_name: 'Active Alex', start: '2026-08-01T10:00:00Z', duration_hours: '2', service_type: 'Clean' },
    ])
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.importedBookings).toBe(1)
    expect(body.warnings).toEqual([])
    const ins = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(ins!.rows[0].team_member_id).toBe('tm-active')
  })
})
