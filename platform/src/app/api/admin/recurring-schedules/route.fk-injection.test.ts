import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/admin/recurring-schedules already verified client_id belongs to
 * the tenant, but stamped a caller-supplied team_member_id (or its
 * `cleaner_id` alias) onto the schedule + every generated booking with zero
 * ownership check -- a foreign team_member_id would leak that member's name
 * via this route's own GET join (team_members(id, name)) and get wired into
 * every future booking generated from the schedule. Same FK-injection class
 * fixed repeatedly this session (client_id/booking_id/schedule_id/entity_id/
 * conversation_id/channel_id/signer_id/deal_id/quote_id).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))

const TENANT = 'tenant-A'
const OTHER_TENANT = 'tenant-B'
let currentTenantId = TENANT
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const CLIENT_A = '22222222-2222-2222-2222-222222222222'
const TM_A = '11111111-1111-1111-1111-111111111111'
const FOREIGN_TM = '44444444-4444-4444-4444-444444444444'

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/admin/recurring-schedules', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT
  fake._seed('clients', [{ id: CLIENT_A, tenant_id: TENANT, name: 'Client A' }])
  fake._seed('team_members', [
    { id: TM_A, tenant_id: TENANT, name: 'Member A' },
    { id: FOREIGN_TM, tenant_id: OTHER_TENANT, name: 'Foreign Member' },
  ])
})

describe('POST /api/admin/recurring-schedules — team_member_id FK-injection guard', () => {
  it('rejects a team_member_id belonging to another tenant, creates nothing', async () => {
    const res = await POST(postReq({
      client_id: CLIENT_A,
      team_member_id: FOREIGN_TM,
      recurring_type: 'weekly',
      start_date: '2026-08-03',
      dates: ['2026-08-03'],
    }))
    expect(res.status).toBe(404)
    expect(fake._all('recurring_schedules').length).toBe(0)
    expect(fake._all('bookings').length).toBe(0)
  })

  it('accepts a team_member_id genuinely owned by the caller tenant (control)', async () => {
    const res = await POST(postReq({
      client_id: CLIENT_A,
      team_member_id: TM_A,
      recurring_type: 'weekly',
      start_date: '2026-08-03',
      dates: ['2026-08-03'],
    }))
    expect(res.status).toBe(200)
    expect(fake._all('recurring_schedules')[0].team_member_id).toBe(TM_A)
  })

  it('accepts a schedule with no team_member_id at all (unassigned, control)', async () => {
    const res = await POST(postReq({
      client_id: CLIENT_A,
      recurring_type: 'weekly',
      start_date: '2026-08-03',
      dates: ['2026-08-03'],
    }))
    expect(res.status).toBe(200)
  })
})
