import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/team-portal/jobs/reassign — checked-in guard (P1/W2 fresh-ground,
 * same root cause as jobs/release's checked-in guard).
 *
 * BUG: reassign unconditionally moved a booking to a new team_member_id with
 * NO check on whether the CURRENT assignee had already checked in. A manager
 * reassigning a job that's already underway (real scenario: crew member hurt
 * mid-shift, sent home, someone else finishes it) would hand the new
 * assignee a booking with check_in_time still stamped from the PREVIOUS
 * member. checkin/route.ts rejects ANY existing check_in_time regardless of
 * who set it, so the new assignee could never check themselves in, and a
 * checkout without ever checking in computes hours off the wrong worker's
 * stale timestamp.
 *
 * FIX: reassign now 409s if the booking has a check_in_time, directing the
 * caller to the admin reset flow (bookings/[id]/reset already clears
 * check_in_time for exactly this reason) before reassigning.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: vi.fn(async () => ({
    auth: { id: 'lead-1', tid: TENANT, role: 'manager' },
    error: null,
  })),
  scopedMemberIds: vi.fn(async () => ['tm-old', 'tm-new']),
}))
vi.mock('@/lib/push', () => ({ sendPushToTeamMember: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-in-progress', tenant_id: TENANT, team_member_id: 'tm-old', start_time: '2026-08-01T10:00:00Z', check_in_time: '2026-08-01T10:05:00Z', clients: { name: 'Client A' } },
      { id: 'bk-not-started', tenant_id: TENANT, team_member_id: 'tm-old', start_time: '2026-08-01T10:00:00Z', check_in_time: null, clients: { name: 'Client B' } },
    ],
    team_members: [{ id: 'tm-new', tenant_id: TENANT, pay_rate: 25 }],
  }
}

function req(bookingId: string, toMemberId: string) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify({ booking_id: bookingId, to_member_id: toMemberId }) }))
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('team-portal/jobs/reassign POST — checked-in guard', () => {
  it('BLOCKED: reassigning an already-checked-in job 409s, booking untouched', async () => {
    const res = await req('bk-in-progress', 'tm-new')
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already checked in/i)

    const untouched = h.seed.bookings.find((b) => b.id === 'bk-in-progress')
    expect(untouched?.team_member_id).toBe('tm-old')
    expect(untouched?.check_in_time).toBe('2026-08-01T10:05:00Z')
  })

  it('CONTROL: reassigning a not-yet-checked-in job still works', async () => {
    const res = await req('bk-not-started', 'tm-new')
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd?.values.team_member_id).toBe('tm-new')
  })
})
