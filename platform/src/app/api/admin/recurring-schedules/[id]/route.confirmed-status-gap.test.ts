/**
 * GET/PUT/DELETE /api/admin/recurring-schedules/:id — all three future-booking
 * queries filtered `.in('status', ['scheduled', 'pending'])`, omitting
 * 'confirmed'. 'confirmed' is not an edge case: a booking reaches it the
 * ordinary way, the moment a client texts YES to the SMS confirmation
 * (see webhooks/telnyx/route.ts). Concretely this meant:
 *   - DELETE (cancel series): a confirmed future booking survived the
 *     cancel untouched -- the cleaner still shows up, the client can still
 *     get billed, despite the admin having just cancelled the series.
 *   - PUT (reassign team member on the series): a confirmed future booking
 *     kept the old assignee even though the admin just changed who the
 *     series belongs to.
 *   - GET (upcoming_bookings display): confirmed bookings were invisible in
 *     the admin's own "what will this cancel/reassign" preview list.
 * Same bug class as the Selena manage_recurring fix (see
 * src/lib/selena/manage-recurring.test.ts) -- this file was cited by that
 * session's gap report as the "correct reference implementation" that
 * Selena's tool was missing; it turned out to have the same gap itself.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT } = vi.hoisted(() => ({ TENANT: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [{ id: 'sch-1', tenant_id: TENANT, status: 'active', team_member_id: 'tm-old' }],
    team_members: [{ id: 'tm-new', tenant_id: TENANT, name: 'New Cleaner' }],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, PUT, DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const futureBookings = () => {
  const soon = new Date(Date.now() + 2 * 864e5).toISOString()
  const later = new Date(Date.now() + 20 * 864e5).toISOString()
  return [
    { id: 'bk-scheduled', tenant_id: TENANT, schedule_id: 'sch-1', status: 'scheduled', start_time: soon, team_member_id: 'tm-old' },
    { id: 'bk-pending', tenant_id: TENANT, schedule_id: 'sch-1', status: 'pending', start_time: soon, team_member_id: 'tm-old' },
    { id: 'bk-confirmed', tenant_id: TENANT, schedule_id: 'sch-1', status: 'confirmed', start_time: later, team_member_id: 'tm-old' },
    { id: 'bk-completed', tenant_id: TENANT, schedule_id: 'sch-1', status: 'completed', start_time: soon, team_member_id: 'tm-old' },
  ]
}

beforeEach(() => {
  fake._all('bookings').length = 0
  fake._seed('bookings', futureBookings())
  const schedule = fake._all('recurring_schedules').find((r) => r.id === 'sch-1')
  if (schedule) { schedule.status = 'active'; schedule.team_member_id = 'tm-old' }
})

describe('GET /api/admin/recurring-schedules/:id — upcoming_bookings includes confirmed', () => {
  it('lists confirmed future bookings alongside scheduled/pending, not completed', async () => {
    const res = await GET(new Request('http://x'), params('sch-1'))
    const json = await res.json()
    const ids = json.upcoming_bookings.map((b: { id: string }) => b.id).sort()
    expect(ids).toEqual(['bk-confirmed', 'bk-pending', 'bk-scheduled'])
  })
})

describe('PUT /api/admin/recurring-schedules/:id — reassign includes confirmed bookings', () => {
  it('reassigns confirmed future bookings, not just scheduled/pending', async () => {
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ team_member_id: 'tm-new' }) }),
      params('sch-1'),
    )
    expect(res.status).toBe(200)
    const byId = Object.fromEntries(fake._all('bookings').map((b) => [b.id, b.team_member_id]))
    expect(byId['bk-scheduled']).toBe('tm-new')
    expect(byId['bk-pending']).toBe('tm-new')
    expect(byId['bk-confirmed']).toBe('tm-new')
    expect(byId['bk-completed']).toBe('tm-old') // completed history never touched
  })
})

describe('DELETE /api/admin/recurring-schedules/:id — cancel includes confirmed bookings', () => {
  it('cancels confirmed future bookings, not just scheduled/pending', async () => {
    const res = await DELETE(new Request('http://x'), params('sch-1'))
    const json = await res.json()
    expect(json.bookings_cancelled).toBe(3)
    const byId = Object.fromEntries(fake._all('bookings').map((b) => [b.id, b.status]))
    expect(byId['bk-scheduled']).toBe('cancelled')
    expect(byId['bk-pending']).toBe('cancelled')
    expect(byId['bk-confirmed']).toBe('cancelled')
    expect(byId['bk-completed']).toBe('completed') // completed history never touched
  })
})
