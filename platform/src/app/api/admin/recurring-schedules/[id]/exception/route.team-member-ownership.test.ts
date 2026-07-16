/**
 * POST /api/admin/recurring-schedules/:id/exception — reassign team_member_id
 * ownership IDOR.
 *
 * The 'reassign' exception type wrote a caller-supplied new_team_member_id
 * straight onto the recurring_exceptions row (and any already-materialized
 * booking) with no check that it belonged to the caller's own tenant. Same
 * class already fixed on the sibling PUT /api/admin/recurring-schedules/:id
 * route (see route.team-member-ownership.test.ts) and the base POST route.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [{ id: 'sch-A1', tenant_id: TENANT_A, duration_hours: 3 }],
    team_members: [
      { id: 'tm-A', tenant_id: TENANT_A, name: 'Own Employee' },
      { id: 'tm-B', tenant_id: TENANT_B, name: 'Foreign Employee' },
    ],
    recurring_exceptions: [],
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

describe('POST /api/admin/recurring-schedules/:id/exception — reassign ownership guard', () => {
  beforeEach(() => {
    fake._all('recurring_exceptions').length = 0
  })

  it('reassigns to a team member belonging to the caller’s own tenant', async () => {
    const res = await POST(
      postReq({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-A' }),
      params('sch-A1'),
    )
    expect(res.status).toBe(200)
    expect(fake._all('recurring_exceptions')[0]?.new_team_member_id).toBe('tm-A')
  })

  it('rejects a new_team_member_id belonging to a different tenant', async () => {
    const res = await POST(
      postReq({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-B' }),
      params('sch-A1'),
    )
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Team member not found')
    expect(fake._all('recurring_exceptions')).toHaveLength(0)
  })
})
