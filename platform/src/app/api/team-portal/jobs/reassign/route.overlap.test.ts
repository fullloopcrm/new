import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Adversarial probe: before this fix, .../jobs/reassign had zero time-conflict
 * check — a lead/manager could reassign a job onto a member who already had
 * an overlapping job that day, silently double-booking them. Mirrors the
 * buffer-aware conflict check /api/bookings' POST already enforces for
 * admin/agent-created assignments.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string; role: string } | null
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () =>
    currentAuth
      ? { auth: currentAuth, error: null }
      : { auth: null, error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) },
  scopedMemberIds: async () => ['tm-2', 'tm-3'],
}))

import { supabaseAdmin } from '@/lib/supabase'
import { clearSettingsCache } from '@/lib/settings'
import { POST } from './route'

const TID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function post(booking_id: string, to_member_id: string) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id, to_member_id }) }) as unknown as Request)
}

beforeEach(() => {
  fake._store.clear()
  clearSettingsCache()
  currentAuth = { id: 'lead-1', tid: TID, role: 'lead' }
  fake._seed('tenants', [{ id: TID, booking_buffer_minutes: 60 }])
  fake._seed('service_types', [])
  fake._seed('team_members', [{ id: 'tm-2', tenant_id: TID, pay_rate: 25, status: 'active' }])
})

describe('team-portal/jobs/reassign — overlap guard', () => {
  it('blocks reassigning a job onto a member who already has an overlapping job', async () => {
    fake._seed('bookings', [
      { id: 'target', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' },
      { id: 'existing', tenant_id: TID, team_member_id: 'tm-2', status: 'confirmed', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00' },
    ])

    const res = await post('target', 'tm-2')
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/overlap/i)

    const { data: after } = await supabaseAdmin.from('bookings').select('team_member_id').eq('id', 'target').single()
    expect((after as { team_member_id: string | null }).team_member_id).toBeNull()
  })

  it('allows reassigning onto a member with no conflicting job (positive control)', async () => {
    fake._seed('bookings', [
      { id: 'target', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' },
      { id: 'existing', tenant_id: TID, team_member_id: 'tm-2', status: 'confirmed', start_time: '2026-08-01T14:00:00', end_time: '2026-08-01T16:00:00' },
    ])

    const res = await post('target', 'tm-2')
    expect(res.status).toBe(200)
    const { data: after } = await supabaseAdmin.from('bookings').select('team_member_id').eq('id', 'target').single()
    expect((after as { team_member_id: string | null }).team_member_id).toBe('tm-2')
  })
})
