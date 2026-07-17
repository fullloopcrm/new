import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * bookings/broadcast/route.ts — the "URGENT JOB AVAILABLE" emergency
 * dispatch broadcast — only ever sent sms/email, even after notify()'s
 * push channel was wired up for real delivery (recipientType:'team_member').
 * A tech with push enabled but no phone on file, or with SMS consent
 * revoked, had no way to learn an urgent job was open to claim through this
 * route. This proves push is now dispatched per member as a third channel,
 * reported alongside sms/email, and that a member's own push-subscription
 * outcome (not a blanket true) drives the reported push status.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/sms-templates', () => ({ smsUrgentBroadcast: () => 'sms body' }))

const notifySpy = vi.fn(async (opts: { channel: string; recipientId?: string }) => {
  if (opts.channel === 'push') {
    return { success: opts.recipientId === 'tm-subscribed' }
  }
  return { success: true }
})
vi.mock('@/lib/notify', () => ({ notify: (opts: unknown) => notifySpy(opts as { channel: string; recipientId?: string }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-a'
const BOOKING_ID = 'bk-a'
const fake = supabaseAdmin as unknown as FakeSupabase

function postReq(): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id: BOOKING_ID }) })
}

beforeEach(() => {
  fake._store.clear()
  notifySpy.mockClear()
  currentTenantId = TENANT_ID
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Tenant Co', telnyx_api_key: 'key-a', telnyx_phone: '+15550000001', resend_api_key: null, primary_color: null },
  ])
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, start_time: '2026-08-01T10:00:00.000Z', end_time: null, pay_rate: 45, service_type: 'Deep Clean', notes: null, clients: { name: 'Client', address: 'Addr' } },
  ])
  fake._seed('team_members', [
    { id: 'tm-subscribed', tenant_id: TENANT_ID, name: 'Subscribed', phone: '+15551110001', email: 'subbed@x.com', status: 'active', sms_consent: true },
    { id: 'tm-unsubscribed', tenant_id: TENANT_ID, name: 'Unsubscribed', phone: '+15551110002', email: 'unsubbed@x.com', status: 'active', sms_consent: true },
  ])
})

describe('bookings/broadcast POST — push channel', () => {
  it('dispatches push per team member as a third channel, alongside sms/email', async () => {
    const res = await POST(postReq())
    const body = await res.json()
    expect(res.status).toBe(200)

    const pushCalls = notifySpy.mock.calls
      .map(c => c[0] as { channel: string; recipientType?: string; recipientId?: string; type?: string })
      .filter(c => c.channel === 'push')
    expect(pushCalls.map(c => c.recipientId).sort()).toEqual(['tm-subscribed', 'tm-unsubscribed'])
    for (const call of pushCalls) {
      expect(call.recipientType).toBe('team_member')
      expect(call.type).toBe('job_broadcast')
    }
  })

  it("reports each member's own push outcome, not a blanket true/false", async () => {
    const res = await POST(postReq())
    const body = await res.json()

    const subscribed = body.reports.find((r: { name: string }) => r.name === 'Subscribed')
    const unsubscribed = body.reports.find((r: { name: string }) => r.name === 'Unsubscribed')
    expect(subscribed.push).toBe(true)
    expect(unsubscribed.push).toBe(false)
  })

  it('counts a push-only delivery (no sms/email) toward sentTo', async () => {
    // Rebuild the fixture with a member that has no phone/email at all — sms
    // and email are both structurally unreachable, leaving push as the only
    // possible channel.
    fake._store.clear()
    fake._seed('tenants', [
      { id: TENANT_ID, name: 'Tenant Co', telnyx_api_key: 'key-a', telnyx_phone: '+15550000001', resend_api_key: null, primary_color: null },
    ])
    fake._seed('bookings', [
      { id: BOOKING_ID, tenant_id: TENANT_ID, start_time: '2026-08-01T10:00:00.000Z', end_time: null, pay_rate: 45, service_type: 'Deep Clean', notes: null, clients: { name: 'Client', address: 'Addr' } },
    ])
    fake._seed('team_members', [
      { id: 'tm-subscribed', tenant_id: TENANT_ID, name: 'Push Only', phone: null, email: null, status: 'active', sms_consent: true },
    ])

    const res = await POST(postReq())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.sentTo).toBe(1)
    expect(body.reports).toEqual([{ name: 'Push Only', sms: false, email: false, push: true }])
  })
})
