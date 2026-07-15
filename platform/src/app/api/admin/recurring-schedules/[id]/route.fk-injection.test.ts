import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PUT /api/admin/recurring-schedules/[id] reassigned team_member_id (or its
 * cleaner_id alias) with zero ownership check -- a foreign id would leak that
 * member's name via this route's own join and get written onto every future
 * booking on the schedule. Same class as the sibling POST fix in ../route.ts.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})

const TENANT = 'tenant-A'
const OTHER_TENANT = 'tenant-B'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const SCHEDULE_ID = 'sched-1'
const TM_A = '11111111-1111-1111-1111-111111111111'
const FOREIGN_TM = '44444444-4444-4444-4444-444444444444'

function putReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/admin/recurring-schedules/sched-1', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
function params() {
  return { params: Promise.resolve({ id: SCHEDULE_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('recurring_schedules', [{ id: SCHEDULE_ID, tenant_id: TENANT, team_member_id: TM_A, status: 'active' }])
  fake._seed('team_members', [
    { id: TM_A, tenant_id: TENANT, name: 'Member A' },
    { id: FOREIGN_TM, tenant_id: OTHER_TENANT, name: 'Foreign Member' },
  ])
  fake._seed('bookings', [])
})

describe('PUT /api/admin/recurring-schedules/[id] — team_member_id reassignment FK-injection guard', () => {
  it('rejects reassigning to a team_member_id belonging to another tenant, leaves the schedule untouched', async () => {
    const res = await PUT(putReq({ team_member_id: FOREIGN_TM }), params())
    expect(res.status).toBe(404)
    expect(fake._all('recurring_schedules')[0].team_member_id).toBe(TM_A)
  })

  it('accepts reassigning to a team_member_id genuinely owned by the caller tenant (control)', async () => {
    const res = await PUT(putReq({ team_member_id: TM_A, notes: 'reassign' }), params())
    expect(res.status).toBe(200)
  })
})
