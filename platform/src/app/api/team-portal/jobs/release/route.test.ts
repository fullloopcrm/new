/**
 * POST /api/team-portal/jobs/release — booking_team_members lead-sync gap.
 *
 * A member releasing their own job nulled bookings.team_member_id but never
 * touched booking_team_members. GET /api/bookings/:id/team and
 * closeout-summary both source the LEAD from booking_team_members (falling
 * back to bookings.team_member_id only when no booking_team_members rows
 * exist at all — never true here, every job reachable from the field portal
 * was created with a lead row). So a self-release left the admin Team panel
 * still showing the member who just released the job — same
 * booking_team_members-sync gap already fixed across every other
 * team_member_id write site this session.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from './route'
import { createToken } from '../../auth/token'

const TENANT_A = 'tenant-A'
const MEMBER = 'member-1'

function req(body: unknown): Request {
  const token = createToken(MEMBER, TENANT_A, 25, 'worker')
  return new Request('http://localhost/api/team-portal/jobs/release', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'book-1', tenant_id: TENANT_A, team_member_id: MEMBER, status: 'confirmed', start_time: '2026-07-20T14:00:00' },
    ],
    team_members: [
      { id: MEMBER, tenant_id: TENANT_A, status: 'active', role: 'worker' },
    ],
    booking_team_members: [
      { id: 'btm-1', tenant_id: TENANT_A, booking_id: 'book-1', team_member_id: MEMBER, is_lead: true, position: 1 },
    ],
  }
})

describe('POST /api/team-portal/jobs/release — booking_team_members lead sync', () => {
  it('deletes the stale booking_team_members lead row when a member releases their own job', async () => {
    const res = await POST(req({ booking_id: 'book-1' }))
    expect(res.status).toBe(200)

    expect(h.store.bookings[0].team_member_id).toBeNull()
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows.length).toBe(0)
  })
})
