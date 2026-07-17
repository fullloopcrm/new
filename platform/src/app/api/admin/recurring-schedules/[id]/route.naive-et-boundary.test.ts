/**
 * GET/PUT/DELETE /api/admin/recurring-schedules/:id all filtered "future
 * bookings" via `.gte('start_time', new Date().toISOString())` --
 * bookings.start_time is a naive-ET TIMESTAMP (no tz), and a real-UTC
 * .toISOString() cutoff is shifted later by the EST/EDT offset. During the
 * ~4-5h evening ET/UTC crossover window this silently excludes the next
 * few hours of bookings from every one of these operations:
 *  - GET's `upcoming_bookings` list goes blind for imminent jobs.
 *  - PUT's team-reassignment leaves the next few hours of bookings on the
 *    OLD team member when a schedule's assignee changes.
 *  - DELETE's cancellation leaves the next few hours of bookings
 *    'scheduled'/'confirmed' even though the series was just cancelled --
 *    a cleaner could still be dispatched to a cancelled job.
 *
 * Real time in these tests: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5 -- UTC
 * has already rolled to Jan 6, ET has not. The booking below starts 9pm ET
 * the same evening (90 real minutes out).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT } = vi.hoisted(() => ({ TENANT: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [
      { id: 'sch-1', tenant_id: TENANT, client_id: 'client-1', team_member_id: 'tm-old' },
    ],
    team_members: [
      { id: 'tm-old', tenant_id: TENANT, name: 'Old Cleaner' },
      { id: 'tm-new', tenant_id: TENANT, name: 'New Cleaner' },
    ],
    bookings: [],
  })
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, PUT, DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  fake._all('bookings').length = 0
  fake._seed('bookings', [
    { id: 'imminent', tenant_id: TENANT, schedule_id: 'sch-1', status: 'scheduled', team_member_id: 'tm-old', start_time: '2026-01-05T21:00:00', end_time: '2026-01-05T23:00:00' },
  ])
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
})
afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/admin/recurring-schedules/:id — upcoming_bookings blind spot', () => {
  it('includes a booking starting 90 real minutes from now in upcoming_bookings', async () => {
    const res = await GET(new Request('http://x'), params('sch-1'))
    const json = await res.json()
    const ids = (json.upcoming_bookings as Array<{ id: string }>).map((b) => b.id)
    expect(ids).toContain('imminent')
  })
})

describe('PUT /api/admin/recurring-schedules/:id — future-booking reassignment', () => {
  it('reassigns an imminent booking to the new team member, not just later ones', async () => {
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ team_member_id: 'tm-new' }) }),
      params('sch-1'),
    )
    expect(res.status).toBe(200)
    const booking = fake._all('bookings').find((b) => b.id === 'imminent')
    expect(booking?.team_member_id).toBe('tm-new')
  })
})

describe('DELETE /api/admin/recurring-schedules/:id — cancels imminent future bookings', () => {
  it('cancels a booking starting 90 real minutes from now, not just later ones', async () => {
    const res = await DELETE(new Request('http://x'), params('sch-1'))
    const json = await res.json()
    expect(json.bookings_cancelled).toBe(1)
    const booking = fake._all('bookings').find((b) => b.id === 'imminent')
    expect(booking?.status).toBe('cancelled')
  })
})
