/**
 * POST /api/team-portal/jobs/claim — booking_team_members lead-sync gap.
 *
 * A member claiming an open job set bookings.team_member_id but never
 * touched booking_team_members. GET /api/bookings/:id/team and
 * closeout-summary both source the LEAD from booking_team_members, not
 * bookings.team_member_id -- a self-claimed job showed as unassigned in the
 * admin Team panel and closeout payout attribution despite having a real
 * assignee. Same booking_team_members-sync gap already fixed across every
 * other team_member_id write site this session, including this route's own
 * release sibling (which deletes this same row on the way out).
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

function req(bookingId: string): Request {
  const token = createToken(MEMBER, TENANT_A, 25, 'worker')
  return new Request('http://localhost/api/team-portal/jobs/claim', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId }),
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'book-1', tenant_id: TENANT_A, team_member_id: null, status: 'scheduled', start_time: '2026-07-20T14:00:00' },
    ],
    team_members: [
      { id: MEMBER, tenant_id: TENANT_A, status: 'active', pay_rate: 25 },
    ],
    booking_team_members: [],
  }
})

describe('POST /api/team-portal/jobs/claim — booking_team_members lead sync', () => {
  it('creates a lead booking_team_members row for the claiming member', async () => {
    const res = await POST(req('book-1'))
    expect(res.status).toBe(200)

    expect(h.store.bookings[0].team_member_id).toBe(MEMBER)
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe(MEMBER)
    expect(leadRows[0].tenant_id).toBe(TENANT_A)
  })

  it('overwrites a stale lead row rather than duplicating it if one somehow already exists', async () => {
    h.store.booking_team_members = [
      { id: 'btm-old', tenant_id: TENANT_A, booking_id: 'book-1', team_member_id: MEMBER, is_lead: false, position: 2 },
    ]
    const res = await POST(req('book-1'))
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1')
    expect(rows.length).toBe(1)
    expect(rows[0].is_lead).toBe(true)
    expect(rows[0].position).toBe(1)
  })
})
