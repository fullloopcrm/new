/**
 * PUT /api/admin/recurring-schedules/:id — team_member_id ownership IDOR.
 *
 * The route already allow-listed which fields it wrote (unlike the sibling
 * mass-assignment bugs elsewhere this session), but a caller-supplied
 * team_member_id/cleaner_id was never checked against the caller's own
 * tenant before being attached to the schedule (and propagated onto future
 * bookings). A foreign team_member_id from another tenant could be assigned
 * to this tenant's recurring schedule. Fixed by verifying the id belongs to
 * the caller's tenant before the update runs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [{ id: 'sch-A1', tenant_id: TENANT_A, team_member_id: null }],
    team_members: [
      { id: 'tm-A', tenant_id: TENANT_A, name: 'Own Employee' },
      { id: 'tm-B', tenant_id: TENANT_B, name: 'Foreign Employee' },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  const schedule = fake._all('recurring_schedules').find((r) => r.id === 'sch-A1')
  if (schedule) schedule.team_member_id = null
})

describe('PUT /api/admin/recurring-schedules/:id — team_member_id ownership guard', () => {
  it('assigns a team member belonging to the caller’s own tenant', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-A' }), params('sch-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.team_member_id).toBe('tm-A')
  })

  it('rejects a team_member_id belonging to a different tenant', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-B' }), params('sch-A1'))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Invalid team member')
    expect(fake._all('recurring_schedules').find((r) => r.id === 'sch-A1')?.team_member_id).toBeNull()
  })
})
