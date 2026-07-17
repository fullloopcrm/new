/**
 * POST /api/team-portal/jobs/reassign — booking_team_members lead-sync gap.
 *
 * The route updated bookings.team_member_id (+ pay_rate/status) on a field
 * reassign but never touched booking_team_members. GET /api/bookings/:id/team
 * and closeout-summary both source the LEAD from booking_team_members
 * (falling back to bookings.team_member_id only when no booking_team_members
 * rows exist at all — never true here, every job reachable from the field
 * portal was created with a lead row). So a crew lead/manager reassigning a
 * job in the field left the admin Team panel and closeout payout attribution
 * pointed at the OLD member forever — same class already fixed for
 * cron/generate-recurring's refill, the regenerate route, and the admin
 * exception 'reassign' path.
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
vi.mock('@/lib/push', () => ({ sendPushToTeamMember: async () => {} }))

import { POST } from './route'
import { createToken } from '../../auth/token'

const TENANT_A = 'tenant-A'
const MANAGER = 'manager-1'
const OLD_LEAD = 'member-old'
const NEW_LEAD = 'member-new'

function req(body: unknown): Request {
  const token = createToken(MANAGER, TENANT_A, 25, 'manager')
  return new Request('http://localhost/api/team-portal/jobs/reassign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'book-1', tenant_id: TENANT_A, team_member_id: OLD_LEAD, status: 'confirmed', start_time: '2026-07-20T14:00:00' },
    ],
    team_members: [
      { id: MANAGER, tenant_id: TENANT_A, status: 'active', role: 'manager', pay_rate: 30 },
      { id: OLD_LEAD, tenant_id: TENANT_A, status: 'active', pay_rate: 22 },
      { id: NEW_LEAD, tenant_id: TENANT_A, status: 'active', pay_rate: 24 },
    ],
    booking_team_members: [
      { id: 'btm-1', tenant_id: TENANT_A, booking_id: 'book-1', team_member_id: OLD_LEAD, is_lead: true, position: 1 },
    ],
    tenants: [{ id: TENANT_A, selena_config: null }],
    crew_members: [],
  }
})

describe('POST /api/team-portal/jobs/reassign — booking_team_members lead sync', () => {
  it('replaces the stale booking_team_members lead row, not just bookings.team_member_id', async () => {
    const res = await POST(req({ booking_id: 'book-1', to_member_id: NEW_LEAD }))
    expect(res.status).toBe(200)

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe(NEW_LEAD)
    // booking_team_members.tenant_id is NOT NULL with no default — an upsert
    // that omits it passes this in-memory fake (which doesn't enforce NOT
    // NULL) but throws a constraint violation against the real DB.
    expect(leadRows[0].tenant_id).toBe(TENANT_A)
    expect(h.store.booking_team_members.find((r) => r.team_member_id === OLD_LEAD)).toBeUndefined()
  })
})
