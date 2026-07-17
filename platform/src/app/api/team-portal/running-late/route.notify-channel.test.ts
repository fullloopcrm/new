import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Fresh-ground finding: this route's admin notify() call omitted `channel`,
 * so it fell to notify()'s default of 'email'. With `type: 'booking_reminder'`
 * (the closest valid NotificationType, borrowed since no dedicated ops type
 * exists), notify() rendered the CLIENT-facing bookingReminderEmail template
 * — "Hi Client, this is a reminder that your appointment is soon" with
 * Service: "Running Late" and Date & Time: this ops message — and emailed it
 * to the tenant owner on every single late report. `channel: 'sms'` stops
 * that: recipientType stays the default 'admin', which notify() never
 * resolves a phone for, so the send becomes a no-op (skipped) and the only
 * observable effect is the in-app notifications row, as intended — the route
 * already sends its own purpose-built admin SMS/push directly below.
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
const { notifyMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async (_arg: { title: string; message: string; channel?: string }) => ({})),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: async () => ({}), sendPushToClient: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
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

describe('team-portal/running-late — admin notify() channel', () => {
  it('explicitly requests the sms channel, not the email default', async () => {
    fake._seed('bookings', [
      { id: 'bk-routine', tenant_id: TID, team_member_id: 'tm-a', start_time: '2026-08-01T10:00:00.000Z', client_id: 'client-a', is_emergency: false, running_late_at: null, running_late_eta: null, clients: { name: 'A Client', phone: '+15559999999' }, team_members: { name: 'A Worker' } },
    ])

    const res = await POST(postReq({ bookingId: 'bk-routine', eta: 10 }))
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ channel: 'sms' }))
  })
})
