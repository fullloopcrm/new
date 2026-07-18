import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Adversarial probe: before this fix, .../jobs/claim only enforced a daily
 * COUNT cap (max_jobs_per_day) — nothing stopped a field worker from
 * self-claiming two jobs whose time ranges actually overlap, since the open
 * pool (GET .../jobs?available=true) lists every unassigned job unfiltered
 * per-viewer. That's a real double-booking, not a narrow edge case: the same
 * member shows up assigned to two clients at the same time.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const { fakeClaimOpenJobRpc } = await import('./claim-open-job-rpc-fake')
  return { supabaseAdmin: { ...fake, rpc: fakeClaimOpenJobRpc(fake) } }
})

let currentAuth: { id: string; tid: string; role: string } | null
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () =>
    currentAuth
      ? { auth: currentAuth, error: null }
      : { auth: null, error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { clearSettingsCache } from '@/lib/settings'
import { POST } from './route'

const TID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function post(booking_id: string) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id }) }) as unknown as Request)
}

beforeEach(() => {
  fake._store.clear()
  clearSettingsCache()
  currentAuth = { id: 'tm-1', tid: TID, role: 'worker' }
  fake._seed('tenants', [{ id: TID, booking_buffer_minutes: 60 }])
  fake._seed('team_members', [{ id: 'tm-1', tenant_id: TID, pay_rate: 25, max_jobs_per_day: null, status: 'active' }])
  fake._seed('service_types', [])
})

describe('team-portal/jobs/claim — overlap guard', () => {
  it('blocks claiming a job that overlaps one this member already holds', async () => {
    fake._seed('bookings', [
      { id: 'held', tenant_id: TID, team_member_id: 'tm-1', status: 'confirmed', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00' },
      { id: 'open', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' },
    ])

    const res = await post('open')
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/overlap/i)

    const { data: openAfter } = await supabaseAdmin.from('bookings').select('team_member_id').eq('id', 'open').single()
    expect((openAfter as { team_member_id: string | null }).team_member_id).toBeNull()
  })

  it('blocks a claim inside the travel buffer even without a literal time overlap', async () => {
    fake._seed('bookings', [
      { id: 'held', tenant_id: TID, team_member_id: 'tm-1', status: 'confirmed', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T10:00:00' },
      // Starts 30min after the held job ends — inside the 60min buffer.
      { id: 'open', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: '2026-08-01T10:30:00', end_time: '2026-08-01T12:00:00' },
    ])

    const res = await post('open')
    expect(res.status).toBe(409)
  })

  it('allows claiming a job outside the buffer window (positive control)', async () => {
    fake._seed('bookings', [
      { id: 'held', tenant_id: TID, team_member_id: 'tm-1', status: 'confirmed', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T10:00:00' },
      // Starts a full 90min after the held job ends — clear of the 60min buffer.
      { id: 'open', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: '2026-08-01T11:30:00', end_time: '2026-08-01T13:00:00' },
    ])

    const res = await post('open')
    expect(res.status).toBe(200)
    const { data: openAfter } = await supabaseAdmin.from('bookings').select('team_member_id').eq('id', 'open').single()
    expect((openAfter as { team_member_id: string | null }).team_member_id).toBe('tm-1')
  })

  it('ignores a cancelled held job when checking for overlap', async () => {
    fake._seed('bookings', [
      { id: 'held', tenant_id: TID, team_member_id: 'tm-1', status: 'cancelled', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00' },
      { id: 'open', tenant_id: TID, team_member_id: null, status: 'scheduled', start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' },
    ])

    const res = await post('open')
    expect(res.status).toBe(200)
  })
})
