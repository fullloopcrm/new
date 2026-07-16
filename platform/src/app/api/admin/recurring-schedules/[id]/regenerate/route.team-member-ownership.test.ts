/**
 * POST /api/admin/recurring-schedules/:id/regenerate — team_member_id
 * ownership IDOR.
 *
 * A caller-supplied team_member_id/cleaner_id was written onto the schedule
 * rule AND every regenerated booking with no check that it belonged to the
 * caller's own tenant. Same class already fixed on the sibling PUT
 * /api/admin/recurring-schedules/:id route and the base POST route.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [
      { id: 'sch-A1', tenant_id: TENANT_A, client_id: 'client-A', property_id: null, pay_rate: 20, hourly_rate: 40 },
    ],
    team_members: [
      { id: 'tm-A', tenant_id: TENANT_A, name: 'Own Employee' },
      { id: 'tm-B', tenant_id: TENANT_B, name: 'Foreign Employee' },
    ],
    bookings: [],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/admin/recurring-schedules/:id/regenerate — team_member ownership guard', () => {
  beforeEach(() => {
    fake._all('bookings').length = 0
  })

  it('regenerates with a team member belonging to the caller’s own tenant', async () => {
    const res = await POST(
      postReq({ dates: ['2026-08-01'], preferred_time: '09:00', team_member_id: 'tm-A' }),
      params('sch-A1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.bookings_created).toBe(1)
    expect(fake._all('bookings')[0]?.team_member_id).toBe('tm-A')
  })

  it('rejects a team_member_id belonging to a different tenant', async () => {
    const res = await POST(
      postReq({ dates: ['2026-08-01'], preferred_time: '09:00', team_member_id: 'tm-B' }),
      params('sch-A1'),
    )
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Team member not found')
    expect(fake._all('bookings')).toHaveLength(0)
  })
})
