import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/team-portal/jobs/reassign already notifies both the outgoing and
 * incoming tech, but the push wording was is_emergency-blind — a manager
 * reassigning a same-day emergency job produced the exact same plain "New
 * job assigned" / "Job reassigned" push as any routine reassignment. Same
 * dispatch-chain urgency-signal gap as items (20)/(22)/(24)/(26). Proves the
 * fix: both pushes escalate to the 🚨 wording when the booking is emergency,
 * and stay plain for a routine job (control).
 */

const { sendPushToTeamMemberMock } = vi.hoisted(() => ({
  sendPushToTeamMemberMock: vi.fn(async (..._args: unknown[]) => {}),
}))
vi.mock('@/lib/push', () => ({ sendPushToTeamMember: sendPushToTeamMemberMock }))

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
  sendPushToTeamMemberMock.mockClear()
  currentAuth = { id: 'lead-1', tid: TID, role: 'lead' }
  fake._seed('tenants', [{ id: TID, booking_buffer_minutes: 60 }])
  fake._seed('service_types', [])
  fake._seed('team_members', [{ id: 'tm-2', tenant_id: TID, pay_rate: 25, status: 'active' }])
})

describe('team-portal/jobs/reassign — emergency push wording', () => {
  it('escalates both pushes to 🚨 wording when the booking is a same-day emergency', async () => {
    fake._seed('bookings', [
      {
        id: 'bk-1', tenant_id: TID, team_member_id: 'tm-3', status: 'confirmed',
        is_emergency: true, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00',
        clients: { name: 'Jane Doe' },
      },
    ])

    const res = await post('bk-1', 'tm-2')
    expect(res.status).toBe(200)
    expect(sendPushToTeamMemberMock).toHaveBeenCalledTimes(2)

    const [toId, toTitle] = sendPushToTeamMemberMock.mock.calls[0] as [string, string]
    expect(toId).toBe('tm-2')
    expect(toTitle).toBe('🚨 Urgent job assigned')

    const [fromId, fromTitle] = sendPushToTeamMemberMock.mock.calls[1] as [string, string]
    expect(fromId).toBe('tm-3')
    expect(fromTitle).toBe('🚨 Urgent job reassigned')
  })

  it('stays plain wording for a routine reassignment (control)', async () => {
    fake._seed('bookings', [
      {
        id: 'bk-2', tenant_id: TID, team_member_id: 'tm-3', status: 'confirmed',
        is_emergency: false, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00',
        clients: { name: 'Jane Doe' },
      },
    ])

    const res = await post('bk-2', 'tm-2')
    expect(res.status).toBe(200)
    expect(sendPushToTeamMemberMock).toHaveBeenCalledTimes(2)

    const [, toTitle] = sendPushToTeamMemberMock.mock.calls[0] as [string, string]
    expect(toTitle).toBe('New job assigned')

    const [, fromTitle] = sendPushToTeamMemberMock.mock.calls[1] as [string, string]
    expect(fromTitle).toBe('Job reassigned')
  })
})
