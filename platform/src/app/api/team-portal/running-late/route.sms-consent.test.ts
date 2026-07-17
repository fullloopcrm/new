import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Fresh-ground finding, same class as items (19)/(21)/(23)/(31): every real
 * client-SMS call site in the app gates on `sms_consent !== false`, matching
 * what the STOP-reply webhook actually writes. /api/team-portal/running-late's
 * client SMS (smsRunningLateClient) never adopted that convention — a client
 * who texted STOP could still get a "running late" text. Missed by the prior
 * sweep because that pass's late-check-in cron finding noted it "never SMS's
 * the client at all" — true for the cron, but this sibling team-portal route
 * does SMS the client and was never separately audited.
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
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: async () => ({}), sendPushToClient: async () => ({}) }))
const { sendSMSMock } = vi.hoisted(() => ({ sendSMSMock: vi.fn(async (_arg: { to: string; body: string }) => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
  sendSMSMock.mockClear()
  currentAuth = { id: 'tm-a', tid: TID, role: 'worker' }
  fake._seed('tenants', [
    { id: TID, name: 'Tenant A Co', owner_phone: '+15551234567', phone: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000' },
  ])
})

describe('team-portal/running-late — client sms_consent gate', () => {
  it('does NOT SMS a client who opted out (sms_consent: false) — admin SMS still sends', async () => {
    fake._seed('bookings', [
      { id: 'bk-opted-out', tenant_id: TID, team_member_id: 'tm-a', start_time: '2026-08-01T10:00:00.000Z', client_id: 'client-a', is_emergency: false, running_late_at: null, running_late_eta: null, clients: { name: 'A Client', phone: '+15559999999', sms_consent: false }, team_members: { name: 'A Worker' } },
    ])

    const res = await POST(postReq({ bookingId: 'bk-opted-out', eta: 10 }))
    expect(res.status).toBe(200)

    // Only the admin SMS goes out — the client's opted-out number never receives one.
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock.mock.calls[0]?.[0]?.to).toBe('+15551234567')
  })

  it('still SMS\'s a client who has not opted out (control)', async () => {
    fake._seed('bookings', [
      { id: 'bk-consented', tenant_id: TID, team_member_id: 'tm-a', start_time: '2026-08-01T10:00:00.000Z', client_id: 'client-a', is_emergency: false, running_late_at: null, running_late_eta: null, clients: { name: 'A Client', phone: '+15559999999', sms_consent: true }, team_members: { name: 'A Worker' } },
    ])

    const res = await POST(postReq({ bookingId: 'bk-consented', eta: 10 }))
    expect(res.status).toBe(200)

    expect(sendSMSMock).toHaveBeenCalledTimes(2)
    const clientCall = sendSMSMock.mock.calls.find(c => c[0]?.to === '+15559999999')
    expect(clientCall).toBeTruthy()
  })
})
