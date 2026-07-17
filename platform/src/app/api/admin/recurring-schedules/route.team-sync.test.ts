/**
 * POST /api/admin/recurring-schedules -- when the admin assigns a team member
 * at series-creation time, every generated booking gets team_member_id set,
 * but GET /api/bookings/:id/team and closeout-summary source the lead from
 * booking_team_members, not bookings.team_member_id. No booking_team_members
 * row was ever created for the initial batch, so a brand-new schedule with a
 * real assignee showed every one of its bookings as unassigned in the admin
 * Team panel and closeout payout attribution. Same booking_team_members-sync
 * gap fixed at every other bookings.team_member_id write site this session.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeSupabaseFake(h), supabase: makeSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))
vi.mock('@/lib/tokens', () => ({ generateToken: () => `tok-${(h.seq += 1)}` }))

import { POST } from './route'

const TENANT = 'tenant-A'

const req = (body: unknown) =>
  new Request('http://x/api/admin/recurring-schedules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.tenantId = TENANT
  h.seq = 0
  h.store = {
    clients: [{ id: 'client-A', tenant_id: TENANT, name: 'Acme Client' }],
    team_members: [{ id: 'tm-1', tenant_id: TENANT, name: 'Lead Tech' }],
    client_properties: [],
    recurring_schedules: [],
    bookings: [],
    booking_team_members: [],
  }
})

describe('POST /api/admin/recurring-schedules -- booking_team_members sync', () => {
  it('creates a lead booking_team_members row for every generated booking when team_member_id is set', async () => {
    const res = await POST(req({
      client_id: 'client-A',
      team_member_id: 'tm-1',
      recurring_type: 'weekly',
      start_date: '2026-08-03',
      preferred_time: '10:00',
      duration_hours: 3,
      dates: ['2026-08-03', '2026-08-10'],
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.bookings_created).toBe(2)

    const rows = h.store.booking_team_members
    expect(rows.length).toBe(2)
    for (const row of rows) {
      expect(row.team_member_id).toBe('tm-1')
      expect(row.is_lead).toBe(true)
      expect(row.tenant_id).toBe(TENANT)
    }
    const bookingIds = new Set((h.store.bookings).map((b) => b.id))
    expect(new Set(rows.map((r) => r.booking_id))).toEqual(bookingIds)
  })

  it('creates no booking_team_members rows when no team_member_id is given', async () => {
    const res = await POST(req({
      client_id: 'client-A',
      recurring_type: 'weekly',
      start_date: '2026-08-03',
      preferred_time: '10:00',
      duration_hours: 3,
      dates: ['2026-08-03', '2026-08-10'],
    }))
    expect(res.status).toBe(200)
    expect(h.store.booking_team_members.length).toBe(0)
  })
})
