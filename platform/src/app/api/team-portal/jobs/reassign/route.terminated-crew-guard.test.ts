import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/team-portal/jobs/reassign — terminated-crew guard (P1/W2
 * fresh-ground off the crew_id bypass fix: the job-session guard (86b797ad)
 * and this round's booking-route fixes all gate on hr_employee_profiles.
 * hr_status, but this self-service team-portal reassignment route only ever
 * checked `scopedMemberIds(auth).includes(to_member_id)` -- and
 * scopedMemberIds filters team_members.status for managers (a DIFFERENT
 * column) or reads raw crew_members rows for leads (unfiltered, same
 * staleness as the crew_id bug). Terminating someone
 * (PATCH /api/dashboard/hr/[id]) only ever writes hr_employee_profiles, so a
 * let-go crew member stayed "in scope" and reassignable from a teammate's
 * phone with zero warning.
 *
 * FIX: to_member_id now runs through getTerminatedTeamMemberIds before the
 * booking is updated.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: vi.fn(async () => ({
    auth: { id: 'lead-1', tid: TENANT, role: 'manager' },
    error: null,
  })),
  scopedMemberIds: vi.fn(async () => ['tm-terminated', 'tm-active']),
}))
vi.mock('@/lib/push', () => ({ sendPushToTeamMember: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: TENANT, team_member_id: 'tm-old', start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client A' } },
    ],
    team_members: [
      { id: 'tm-terminated', tenant_id: TENANT, pay_rate: 25 },
      { id: 'tm-active', tenant_id: TENANT, pay_rate: 25 },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
  }
}

function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('team-portal/jobs/reassign POST — terminated-crew guard', () => {
  it('BLOCKED: reassigning to a terminated (but still "in scope") member 400s, booking untouched', async () => {
    const res = await POST(req({ booking_id: 'bk-a', to_member_id: 'tm-terminated' }))
    expect(res.status).toBe(400)
    expect(h.capture.updates.find((u) => u.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: reassigning to an active member still works', async () => {
    const res = await POST(req({ booking_id: 'bk-a', to_member_id: 'tm-active' }))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd?.values.team_member_id).toBe('tm-active')
  })
})
