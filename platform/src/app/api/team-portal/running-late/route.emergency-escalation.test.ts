import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Before this fix, /api/team-portal/running-late never looked at
 * bookings.is_emergency at all — a same-day emergency job running late got
 * the byte-identical "Running Late" notify title/push/admin-SMS as a routine
 * job running a few minutes behind. Same class of admin-notify blind spot as
 * items (20)/(24)/(26) (schedule-monitor severity, admin new-booking
 * emergency-blindness, multi-tech extras SMS) — the owner's first glance at
 * this alert carried no signal that this particular lateness is on a job
 * that's already time-critical.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string; role: string }
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: currentAuth, error: null }),
}))
const { notifyMock, pushAdminsMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async (_arg: { title: string; message: string }) => ({})),
  pushAdminsMock: vi.fn(async (_tenantId: string, _title: string, _message: string, _url: string) => ({})),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: pushAdminsMock, sendPushToClient: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { POST } from './route'

const TID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
  vi.clearAllMocks()
  currentAuth = { id: 'tm-a', tid: TID, role: 'worker' }
  fake._seed('tenants', [
    { id: TID, name: 'Tenant A Co', owner_phone: '+15551234567', phone: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000' },
  ])
})

describe('team-portal/running-late — emergency escalation', () => {
  it('escalates title/message/SMS with URGENT/🚨 when the booking is an emergency job', async () => {
    fake._seed('bookings', [
      { id: 'bk-emergency', tenant_id: TID, team_member_id: 'tm-a', start_time: '2026-08-01T10:00:00.000Z', client_id: 'client-a', is_emergency: true, running_late_at: null, running_late_eta: null, clients: { name: 'A Client', phone: '+15559999999' }, team_members: { name: 'A Worker' } },
    ])

    const res = await POST(postReq({ bookingId: 'bk-emergency', eta: 10 }))
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('🚨'),
      message: expect.stringContaining('🚨 EMERGENCY —'),
    }))
    expect(pushAdminsMock).toHaveBeenCalledWith(TID, expect.stringContaining('🚨'), expect.any(String), expect.any(String))
    const smsBody = (sendSMS as ReturnType<typeof vi.fn>).mock.calls[0][0].body as string
    expect(smsBody).toContain('URGENT —')
  })

  it('does not escalate a routine (non-emergency) job running late (control)', async () => {
    fake._seed('bookings', [
      { id: 'bk-routine', tenant_id: TID, team_member_id: 'tm-a', start_time: '2026-08-01T10:00:00.000Z', client_id: 'client-a', is_emergency: false, running_late_at: null, running_late_eta: null, clients: { name: 'A Client', phone: '+15559999999' }, team_members: { name: 'A Worker' } },
    ])

    const res = await POST(postReq({ bookingId: 'bk-routine', eta: 10 }))
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Running Late' }))
    const notifyArg = notifyMock.mock.calls[0][0] as { message: string }
    expect(notifyArg.message).not.toContain('🚨')
    expect(pushAdminsMock).toHaveBeenCalledWith(TID, 'Running Late', expect.any(String), expect.any(String))
    const smsBody = (sendSMS as ReturnType<typeof vi.fn>).mock.calls[0][0].body as string
    expect(smsBody).not.toContain('URGENT —')
  })
})
