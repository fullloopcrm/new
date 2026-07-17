import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/schedule-issues/fix — booking_team_members lead-sync gap.
 *
 * The 'day_off' fix plan unassigns a booking by nulling
 * bookings.team_member_id, but never touched booking_team_members. GET
 * /api/bookings/:id/team and closeout-summary both source the LEAD from
 * booking_team_members (falling back to bookings.team_member_id only when no
 * booking_team_members rows exist at all — never true here, every one of
 * these bookings was created with a lead row). So resolving a 'day_off'
 * issue left the admin Team panel still showing the now-unavailable member
 * as assigned — same booking_team_members-sync gap already fixed across
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
vi.mock('@/lib/tenant-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant-query')>()
  return { ...actual, getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: {}, role: 'manager' }) }
})

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    schedule_issues: [
      { id: 'iss-A1', tenant_id: 'tenant-A', type: 'day_off', message: 'day off', booking_id: 'book-A1', team_member_id: 'tm-1', status: 'open' },
    ],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', start_time: '2026-01-01T09:00', end_time: '2026-01-01T11:00', price: 100, hourly_rate: 50, team_member_id: 'tm-1', status: 'confirmed' },
    ],
    booking_team_members: [
      { id: 'btm-1', tenant_id: 'tenant-A', booking_id: 'book-A1', team_member_id: 'tm-1', is_lead: true, position: 1 },
    ],
  }
})

describe("POST /api/admin/schedule-issues/fix — 'day_off' booking_team_members sync", () => {
  it('deletes the stale lead row when unassigning for a day-off conflict', async () => {
    const res = await POST(postReq({ id: 'iss-A1', apply: true }))
    expect(res.status).toBe(200)

    expect(h.store.bookings[0].team_member_id).toBeNull()
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-A1' && r.is_lead)
    expect(leadRows.length).toBe(0)
  })
})
