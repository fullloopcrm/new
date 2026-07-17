/**
 * PUT /api/bookings/batch-update — booking_team_members lead-sync gap.
 *
 * This route is the batch path behind BookingsAdmin.tsx's "apply to all
 * future occurrences" series edit (pattern-unchanged branch). It updates
 * bookings.team_member_id on every future booking in the series, but
 * BookingsAdmin.tsx's own booking_team_members sync call
 * (PUT /api/bookings/:id/team) only runs once, for the single booking being
 * edited — every OTHER future booking in the batch kept a stale
 * booking_team_members lead row. GET /api/bookings/:id/team and
 * closeout-summary both source the LEAD from booking_team_members (falling
 * back to bookings.team_member_id only when no booking_team_members rows
 * exist at all — never true here, every series occurrence is created with a
 * lead row). Same booking_team_members-sync gap already fixed across every
 * other team_member_id write site this session.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PUT } from './route'

const TENANT_A = 'tenant-A'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    bookings: [
      { id: 'book-1', tenant_id: TENANT_A, client_id: 'client-A1', team_member_id: 'tm-old', status: 'scheduled', start_time: '2026-08-01T09:00:00' },
      { id: 'book-2', tenant_id: TENANT_A, client_id: 'client-A1', team_member_id: 'tm-old', status: 'scheduled', start_time: '2026-08-08T09:00:00' },
    ],
    clients: [{ id: 'client-A1', tenant_id: TENANT_A, name: 'Pat A' }],
    team_members: [{ id: 'tm-old', tenant_id: TENANT_A, name: 'Sam Old' }, { id: 'tm-new', tenant_id: TENANT_A, name: 'Sam New' }],
    booking_team_members: [
      { id: 'btm-1', tenant_id: TENANT_A, booking_id: 'book-1', team_member_id: 'tm-old', is_lead: true, position: 1 },
      { id: 'btm-2', tenant_id: TENANT_A, booking_id: 'book-2', team_member_id: 'tm-old', is_lead: true, position: 1 },
    ],
  }
})

describe('PUT /api/bookings/batch-update — booking_team_members lead sync', () => {
  it('replaces the stale booking_team_members lead row for EVERY booking in the batch, not just one', async () => {
    const res = await PUT(putReq({
      updates: [
        { id: 'book-1', data: { team_member_id: 'tm-new' } },
        { id: 'book-2', data: { team_member_id: 'tm-new' } },
      ],
    }))
    expect(res.status).toBe(200)

    for (const bookingId of ['book-1', 'book-2']) {
      const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === bookingId && r.is_lead)
      expect(leadRows.length).toBe(1)
      expect(leadRows[0].team_member_id).toBe('tm-new')
      expect(leadRows[0].tenant_id).toBe(TENANT_A)
    }
    expect(h.store.booking_team_members.find((r) => r.team_member_id === 'tm-old')).toBeUndefined()
  })

  it('unassigning (team_member_id: null) deletes the stale lead row without inserting a new one', async () => {
    const res = await PUT(putReq({ updates: [{ id: 'book-1', data: { team_member_id: null } }] }))
    expect(res.status).toBe(200)

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows.length).toBe(0)
  })

  it('a batch update that never touches team_member_id leaves booking_team_members untouched', async () => {
    const res = await PUT(putReq({ updates: [{ id: 'book-1', data: { notes: 'reschedule note' } }] }))
    expect(res.status).toBe(200)

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe('tm-old')
  })
})
