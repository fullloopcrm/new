import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PUT /api/client/reschedule/[id] — the reschedule-confirmation client SMS
 * never checked sms_consent, same TCPA convention as items (19)/(21)/(23):
 * a client who texted STOP should never get another SMS, including their
 * own reschedule confirmation. Proves the fix: sms_consent:false suppresses
 * the send, true/unset (never opted out) still sends.
 */

const { sendSMSMock } = vi.hoisted(() => ({
  sendSMSMock: vi.fn(async (..._args: unknown[]) => ({})),
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => currentTenant }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async () => ({ clientId: 'client-consent' }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: async () => ({}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'job rescheduled' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'rescheduled' }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-consent'
const CLIENT_ID = 'client-consent'
const fake = supabaseAdmin as unknown as FakeSupabase

let currentTenant: { id: string; timezone: string | null; resend_api_key: string | null; telnyx_api_key: string | null; telnyx_phone: string | null; name: string; email_from: string | null; selena_config?: { emergency_available?: boolean; emergency_rate?: number } | null }

function putReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
}
function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}
async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  fake._store.clear()
  sendSMSMock.mockClear()
  currentTenant = { id: TENANT_ID, timezone: 'America/New_York', resend_api_key: null, telnyx_api_key: 'tk_test', telnyx_phone: '+15559990000', name: 'Tenant Co', email_from: null, selena_config: null }
  fake._seed('email_logs', [])
})

describe('client reschedule PUT — reschedule SMS honors sms_consent', () => {
  it('skips the reschedule SMS for a client who has opted out (sms_consent:false)', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: '2099-01-15T10:00:00.000Z', end_time: '2099-01-15T12:00:00.000Z', hourly_rate: 75, price: 15000, is_emergency: false, clients: { name: 'A Client', phone: '+15551234567', sms_consent: false }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: '2099-02-01T10:00:00.000Z', end_time: '2099-02-01T12:00:00.000Z' }), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    await flush()
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('sends the reschedule SMS for a client who has not opted out (positive control)', async () => {
    fake._seed('bookings', [
      { id: 'bk-2', tenant_id: TENANT_ID, client_id: CLIENT_ID, start_time: '2099-01-15T10:00:00.000Z', end_time: '2099-01-15T12:00:00.000Z', hourly_rate: 75, price: 15000, is_emergency: false, clients: { name: 'A Client', phone: '+15551234567', sms_consent: true }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: '2099-02-01T10:00:00.000Z', end_time: '2099-02-01T12:00:00.000Z' }), paramsFor('bk-2'))
    expect(res.status).toBe(200)
    await flush()
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    const call = sendSMSMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.to).toBe('+15551234567')
  })
})
