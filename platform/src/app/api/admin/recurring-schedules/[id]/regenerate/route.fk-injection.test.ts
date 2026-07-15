import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST .../regenerate stamped a caller-supplied team_member_id onto the
 * schedule rule + every regenerated booking with zero tenant-ownership
 * check -- same class as this schedule's own POST/PUT/exception checks.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))

const TENANT = 'tenant-A'
const OTHER_TENANT = 'tenant-B'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const SCHEDULE_ID = 'sched-1'
const TM_A = '11111111-1111-1111-1111-111111111111'
const FOREIGN_TM = '44444444-4444-4444-4444-444444444444'

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/admin/recurring-schedules/sched-1/regenerate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
function params() {
  return { params: Promise.resolve({ id: SCHEDULE_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('recurring_schedules', [{ id: SCHEDULE_ID, tenant_id: TENANT, client_id: 'client-1', property_id: null, pay_rate: 20, hourly_rate: 40 }])
  fake._seed('bookings', [])
  fake._seed('team_members', [
    { id: TM_A, tenant_id: TENANT, name: 'Member A' },
    { id: FOREIGN_TM, tenant_id: OTHER_TENANT, name: 'Foreign Member' },
  ])
})

describe('POST .../regenerate — team_member_id FK-injection guard', () => {
  it('rejects a team_member_id belonging to another tenant, creates/deletes nothing', async () => {
    const res = await POST(postReq({ team_member_id: FOREIGN_TM, dates: ['2026-08-11'] }), params())
    expect(res.status).toBe(404)
    expect(fake._all('bookings').length).toBe(0)
  })

  it('accepts a team_member_id genuinely owned by the caller tenant (control)', async () => {
    const res = await POST(postReq({ team_member_id: TM_A, dates: ['2026-08-11'] }), params())
    expect(res.status).toBe(200)
    expect(fake._all('bookings')[0].team_member_id).toBe(TM_A)
  })
})
