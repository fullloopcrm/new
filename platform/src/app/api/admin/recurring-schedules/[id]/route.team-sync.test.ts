import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT /api/admin/recurring-schedules/:id — booking_team_members lead-sync gap.
 *
 * Changing a schedule's team member bulk-reassigns bookings.team_member_id
 * on every future scheduled/pending/confirmed booking for that schedule, but
 * never touched booking_team_members. GET /api/bookings/:id/team and
 * closeout-summary both source the LEAD from booking_team_members (falling
 * back to bookings.team_member_id only when no booking_team_members rows
 * exist at all — never true here, every series occurrence is created with a
 * lead row). So a schedule-level reassignment left the admin Team panel and
 * closeout payout attribution pointed at the OLD member on every future
 * occurrence — same booking_team_members-sync gap already fixed across
 * every other team_member_id write site this session.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))

import { PUT } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', status: 'active', team_member_id: 'tm-old' },
    ],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2099-01-01T10:00:00', team_member_id: 'tm-old' },
      { id: 'book-A2', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'confirmed', start_time: '2099-01-02T10:00:00', team_member_id: 'tm-old' },
    ],
    booking_team_members: [
      { id: 'btm-1', tenant_id: 'tenant-A', booking_id: 'book-A1', team_member_id: 'tm-old', is_lead: true, position: 1 },
      { id: 'btm-2', tenant_id: 'tenant-A', booking_id: 'book-A2', team_member_id: 'tm-old', is_lead: true, position: 1 },
    ],
    team_members: [
      { id: 'tm-new', tenant_id: 'tenant-A', name: 'New Sam A' },
    ],
  }
})

describe('PUT /api/admin/recurring-schedules/:id — booking_team_members lead sync', () => {
  it('replaces the stale lead row on EVERY future booking touched by the bulk reassign', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-new' }), params('sched-A1'))
    expect(res.status).toBe(200)

    for (const bookingId of ['book-A1', 'book-A2']) {
      const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === bookingId && r.is_lead)
      expect(leadRows.length).toBe(1)
      expect(leadRows[0].team_member_id).toBe('tm-new')
      expect(leadRows[0].tenant_id).toBe('tenant-A')
    }
    expect(h.store.booking_team_members.find((r) => r.team_member_id === 'tm-old')).toBeUndefined()
  })

  it('unassigning (team_member_id: null) deletes stale lead rows without inserting new ones', async () => {
    const res = await PUT(putReq({ team_member_id: null }), params('sched-A1'))
    expect(res.status).toBe(200)

    for (const bookingId of ['book-A1', 'book-A2']) {
      const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === bookingId && r.is_lead)
      expect(leadRows.length).toBe(0)
    }
  })

  it('a schedule edit that never touches team_member_id leaves booking_team_members untouched', async () => {
    const res = await PUT(putReq({ notes: 'just a note' }), params('sched-A1'))
    expect(res.status).toBe(200)

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-A1' && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe('tm-old')
  })
})
