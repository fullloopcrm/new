/**
 * PUT /api/bookings/[id]/team — cross-tenant FK injection on lead_id/
 * extra_team_member_ids. Unlike the main PUT /api/bookings/[id] route (which
 * already verifies team_member_id belongs to the caller's tenant before
 * writing it), this multi-tech endpoint wrote caller-supplied team_member_id
 * values straight into bookings.team_member_id + booking_team_members with
 * zero ownership check. admin/bookings/[id]/closeout-summary embeds
 * team_members(id, name, phone, hourly_rate) off booking_team_members with no
 * further tenant filter, so a foreign team_member_id planted here would leak
 * that member's name/phone/hourly_rate back to the caller's tenant.
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
vi.mock('@/lib/notify-team', () => ({
  notifyTeamMember: vi.fn(async () => ({ teamMemberName: 'x', email: false, sms: false, inApp: true, quietHours: false })),
  formatDeliveryReport: () => 'delivered',
}))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))

import { PUT } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    bookings: [{ id: 'book-1', tenant_id: TENANT_A, team_member_id: null, team_size: 1, start_time: '2026-08-01T09:00:00' }],
    team_members: [
      { id: 'tm-A1', tenant_id: TENANT_A, name: 'Sam A' },
      { id: 'tm-A2', tenant_id: TENANT_A, name: 'Robin A' },
      { id: 'tm-B1', tenant_id: TENANT_B, name: 'Sam B (secret)', phone: '555-0100', hourly_rate: 40 },
    ],
    booking_team_members: [],
    tenants: [{ id: TENANT_A, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }],
  }
})

describe('PUT /api/bookings/[id]/team — cross-tenant FK injection', () => {
  it("rejects a lead_id belonging to another tenant instead of writing it", async () => {
    const res = await PUT(putReq({ lead_id: 'tm-B1', extra_team_member_ids: [], team_size: 1 }), params('book-1'))

    expect(res.status).toBe(400)
    expect(h.store.bookings[0].team_member_id).toBeNull()
    expect(h.store.booking_team_members).toHaveLength(0)
  })

  it("rejects an extra_team_member_ids entry belonging to another tenant", async () => {
    const res = await PUT(putReq({ lead_id: 'tm-A1', extra_team_member_ids: ['tm-B1'], team_size: 2 }), params('book-1'))

    expect(res.status).toBe(400)
    expect(h.store.bookings[0].team_member_id).toBeNull()
    expect(h.store.booking_team_members).toHaveLength(0)
  })

  it('accepts lead + extras that genuinely belong to the caller tenant', async () => {
    const res = await PUT(putReq({ lead_id: 'tm-A1', extra_team_member_ids: ['tm-A2'], team_size: 2 }), params('book-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.lead).toBe('tm-A1')
    expect(h.store.bookings[0].team_member_id).toBe('tm-A1')
    expect(h.store.booking_team_members.map((r) => r.team_member_id).sort()).toEqual(['tm-A1', 'tm-A2'])
  })
})
