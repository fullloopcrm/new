import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST .../exception (type: 'reassign') wrote a caller-supplied
 * new_team_member_id straight onto the materialized booking + the recorded
 * exception (later consumed by cron/generate-recurring for every future
 * occurrence) with zero tenant-ownership check -- same class as this
 * schedule's own POST/PUT team_member_id checks.
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
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const SCHEDULE_ID = 'sched-1'
const BOOKING_ID = 'bk-1'
const TM_A = '11111111-1111-1111-1111-111111111111'
const FOREIGN_TM = '44444444-4444-4444-4444-444444444444'

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/admin/recurring-schedules/sched-1/exception', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
function params() {
  return { params: Promise.resolve({ id: SCHEDULE_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('recurring_schedules', [{ id: SCHEDULE_ID, tenant_id: TENANT, duration_hours: 3 }])
  fake._seed('bookings', [{ id: BOOKING_ID, tenant_id: TENANT, schedule_id: SCHEDULE_ID, status: 'scheduled', start_time: '2026-08-10T10:00:00', team_member_id: TM_A }])
  fake._seed('team_members', [
    { id: TM_A, tenant_id: TENANT, name: 'Member A' },
    { id: FOREIGN_TM, tenant_id: OTHER_TENANT, name: 'Foreign Member' },
  ])
})

describe('POST .../exception (reassign) — new_team_member_id FK-injection guard', () => {
  it('rejects reassigning to a team_member_id belonging to another tenant, leaves the booking untouched', async () => {
    const res = await POST(postReq({ occurrence_date: '2026-08-10', type: 'reassign', new_team_member_id: FOREIGN_TM }), params())
    expect(res.status).toBe(404)
    expect(fake._all('bookings')[0].team_member_id).toBe(TM_A)
    expect(fake._all('recurring_exceptions').length).toBe(0)
  })

  it('accepts reassigning to a team_member_id genuinely owned by the caller tenant (control)', async () => {
    const res = await POST(postReq({ occurrence_date: '2026-08-10', type: 'reassign', new_team_member_id: TM_A }), params())
    expect(res.status).toBe(200)
    expect(fake._all('bookings')[0].team_member_id).toBe(TM_A)
  })
})
