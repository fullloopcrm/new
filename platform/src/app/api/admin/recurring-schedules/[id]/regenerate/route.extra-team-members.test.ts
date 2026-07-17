import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/recurring-schedules/:id/regenerate — this route already
 * carries the schedule's team_size (billing multiplier) forward onto every
 * regenerated occurrence (route.test.ts), but recurring_schedules had
 * nowhere to persist WHICH team members the extra crew slots actually are,
 * only the headcount. POST /api/client/recurring writes booking_team_members
 * rows (lead + named extras) for the initial batch; this route's pattern-
 * edit regeneration never wrote any at all, leaving the admin Team panel and
 * closeout-summary blind to who the extra crew members were on any
 * regenerated series. See
 * 2026_07_17_recurring_schedules_extra_team_member_ids.sql.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { POST } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const baseBody = {
  dates: ['2026-08-15', '2026-08-22'],
  preferred_time: '9:00 am',
  duration_hours: 2,
  from_date: '2026-08-01T00:00:00',
  team_member_id: 'tm-lead',
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', client_id: 'client-A1', property_id: 'prop-A1', pay_rate: 20, hourly_rate: 40, extra_team_member_ids: ['tm-extra-1'] },
    ],
    bookings: [],
    team_members: [
      { id: 'tm-lead', tenant_id: 'tenant-A', name: 'Lead' },
      { id: 'tm-extra-1', tenant_id: 'tenant-A', name: 'Extra One' },
    ],
    booking_team_members: [],
  }
})

describe('POST /api/admin/recurring-schedules/:id/regenerate — extra_team_member_ids propagation', () => {
  it('creates booking_team_members rows (lead + named extras) for every regenerated occurrence', async () => {
    const res = await POST(postReq(baseBody), params('sched-A1'))
    expect(res.status).toBe(200)

    const created = h.store.bookings.filter((b) => b.schedule_id === 'sched-A1')
    expect(created).toHaveLength(2)

    for (const b of created) {
      const rows = h.store.booking_team_members.filter((r) => r.booking_id === b.id)
      const lead = rows.find((r) => r.is_lead)
      const extra = rows.find((r) => !r.is_lead)
      expect(lead?.team_member_id).toBe('tm-lead')
      expect(extra?.team_member_id).toBe('tm-extra-1')
    }
  })

  it('creates zero booking_team_members rows when the schedule has no named extras (solo/lead-only, unchanged behavior)', async () => {
    h.store.recurring_schedules[0].extra_team_member_ids = null

    const res = await POST(postReq(baseBody), params('sched-A1'))
    expect(res.status).toBe(200)
    expect(h.store.booking_team_members.length).toBe(0)
  })
})
