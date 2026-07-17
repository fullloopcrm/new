/**
 * POST /api/dashboard/schedules/import — booking_team_members lead-sync gap.
 *
 * A row with a resolved staff_name match created a booking with
 * bookings.team_member_id set, but never inserted a booking_team_members row.
 * GET /api/bookings/:id/team and closeout-summary both source the lead from
 * booking_team_members, not bookings.team_member_id, so an imported,
 * staff-assigned booking showed as unassigned in the admin Team panel and
 * closeout payout attribution. Same booking_team_members-sync gap fixed at
 * every other bookings.team_member_id write site this session.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

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
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId, role: 'owner' }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from './route'

const TENANT_A = 'tenant-A'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = TENANT_A
  h.seq = 0
  h.store = {
    clients: [{ id: 'client-A1', tenant_id: TENANT_A, name: 'Ann Owner', phone: '5551234567' }],
    team_members: [{ id: 'tm-1', tenant_id: TENANT_A, name: 'Sam Staff' }],
    bookings: [],
    recurring_schedules: [],
    booking_team_members: [],
  }
})

describe('POST /api/dashboard/schedules/import — booking_team_members lead sync', () => {
  it('creates a booking_team_members lead row for an imported booking with a resolved staff match', async () => {
    const res = await POST(postReq({
      rows: [{ client_phone: '5551234567', staff_name: 'Sam Staff', start: '2026-08-01T10:00:00Z' }],
    }))
    const json = await res.json()
    expect(json.importedBookings).toBe(1)

    const created = h.store.bookings.find((b) => b.client_id === 'client-A1')
    expect(created?.team_member_id).toBe('tm-1')

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === created?.id && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe('tm-1')
    expect(leadRows[0].tenant_id).toBe(TENANT_A)
  })

  it('an imported row with no staff match creates no booking_team_members row', async () => {
    const res = await POST(postReq({
      rows: [{ client_phone: '5551234567', start: '2026-08-01T10:00:00Z' }],
    }))
    const json = await res.json()
    expect(json.importedBookings).toBe(1)
    expect(h.store.booking_team_members.length).toBe(0)
  })
})
