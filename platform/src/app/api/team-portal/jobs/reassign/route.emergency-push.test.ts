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
 *
 * Archetype-depth follow-up: this route used to call sendPushToTeamMember()
 * directly, bypassing notifyTeamMember() (the quiet-hours/SMS/email/in-app
 * wrapper items (53)/(54)/(56)/(58)/(60) established). Now mocks
 * notifyTeamMember() instead and also asserts isEmergency flows through.
 */

const { notifyTeamMemberMock } = vi.hoisted(() => ({
  notifyTeamMemberMock: vi.fn(async (..._args: unknown[]) => ({ memberName: 'x', push: true, email: false, sms: true, inApp: true as const, quietHours: false })),
}))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: notifyTeamMemberMock }))

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
  notifyTeamMemberMock.mockClear()
  currentAuth = { id: 'lead-1', tid: TID, role: 'lead' }
  fake._seed('tenants', [{ id: TID, name: 'Acme Co', booking_buffer_minutes: 60 }])
  fake._seed('service_types', [])
  fake._seed('team_members', [{ id: 'tm-2', tenant_id: TID, pay_rate: 25, status: 'active' }])
})

describe('team-portal/jobs/reassign — emergency push wording', () => {
  it('escalates both notifications to 🚨 wording and isEmergency:true when the booking is a same-day emergency', async () => {
    fake._seed('bookings', [
      {
        id: 'bk-1', tenant_id: TID, team_member_id: 'tm-3', status: 'confirmed',
        is_emergency: true, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00',
        clients: { name: 'Jane Doe' },
      },
    ])

    const res = await post('bk-1', 'tm-2')
    expect(res.status).toBe(200)
    expect(notifyTeamMemberMock).toHaveBeenCalledTimes(2)

    const [toCall] = notifyTeamMemberMock.mock.calls[0] as [{ teamMemberId: string; title: string; isEmergency: boolean; type: string; smsMessage?: string; skipEmail?: boolean }]
    expect(toCall.teamMemberId).toBe('tm-2')
    expect(toCall.title).toBe('🚨 Urgent job assigned')
    expect(toCall.isEmergency).toBe(true)
    expect(toCall.type).toBe('job_assignment')
    expect(toCall.smsMessage).toContain('URGENT')
    expect(toCall.smsMessage).toContain('Pay: $25/hr')
    expect(toCall.skipEmail).toBe(true)

    const [fromCall] = notifyTeamMemberMock.mock.calls[1] as [{ teamMemberId: string; title: string; isEmergency: boolean; type: string; smsMessage?: string }]
    expect(fromCall.teamMemberId).toBe('tm-3')
    expect(fromCall.title).toBe('🚨 Urgent job reassigned')
    expect(fromCall.isEmergency).toBe(true)
    expect(fromCall.type).toBe('job_cancelled')
    expect(fromCall.smsMessage).toContain('Cancelled')
  })

  it('stays plain wording and isEmergency:false for a routine reassignment (control)', async () => {
    fake._seed('bookings', [
      {
        id: 'bk-2', tenant_id: TID, team_member_id: 'tm-3', status: 'confirmed',
        is_emergency: false, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00',
        clients: { name: 'Jane Doe' },
      },
    ])

    const res = await post('bk-2', 'tm-2')
    expect(res.status).toBe(200)
    expect(notifyTeamMemberMock).toHaveBeenCalledTimes(2)

    const [toCall] = notifyTeamMemberMock.mock.calls[0] as [{ title: string; isEmergency: boolean }]
    expect(toCall.title).toBe('New job assigned')
    expect(toCall.isEmergency).toBe(false)

    const [fromCall] = notifyTeamMemberMock.mock.calls[1] as [{ title: string; isEmergency: boolean }]
    expect(fromCall.title).toBe('Job reassigned')
    expect(fromCall.isEmergency).toBe(false)
  })
})
