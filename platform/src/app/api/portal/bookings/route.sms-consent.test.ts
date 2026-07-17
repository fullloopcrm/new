import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/portal/bookings — item (12)'s notify+email+SMS fix ported
 * client/book's confirmation block verbatim, which means it inherited the
 * same sms_consent blindness client/book itself had (fixed alongside this
 * one). Same TCPA convention as items (19)/(21)/(23): a client who texted
 * STOP should never get another SMS, including their own portal's booking
 * confirmation. Proves the fix: sms_consent:false suppresses the send,
 * true/unset (never opted out) still sends.
 */

const { notifyMock, sendEmailMock, sendSMSMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async (..._args: unknown[]) => ({ success: true })),
  sendEmailMock: vi.fn(async (..._args: unknown[]) => ({})),
  sendSMSMock: vi.fn(async (..._args: unknown[]) => ({})),
}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/email', () => ({ sendEmail: sendEmailMock }))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ allow_same_day: true, min_days_ahead: 0 }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-consent'
const CLIENT_ID = 'client-consent'
const SVC_ID = 'svc-consent'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: unknown): Request {
  return new Request('http://x/api/portal/bookings', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  notifyMock.mockClear()
  sendEmailMock.mockClear()
  sendSMSMock.mockClear()
  currentAuth = { id: CLIENT_ID, tid: TENANT_ID }
  fake._seed('service_types', [{ id: SVC_ID, tenant_id: TENANT_ID, name: 'Standard Cleaning', default_duration_hours: 2, default_hourly_rate: 75 }])
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing', telnyx_api_key: 'tk_test', telnyx_phone: '+15559990000' }])
})

describe('portal self-book — booking-received SMS honors sms_consent', () => {
  it('skips the confirmation SMS for a client who has opted out (sms_consent:false)', async () => {
    fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Jane Doe', email: 'jane@example.com', phone: '+15551234567', sms_consent: false }])
    const res = await POST(req({ start_time: '2099-01-15T10:00:00', service_type_id: SVC_ID }))
    expect(res.status).toBe(201)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('sends the confirmation SMS for a client who has not opted out (positive control)', async () => {
    fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Jane Doe', email: 'jane@example.com', phone: '+15551234567', sms_consent: true }])
    const res = await POST(req({ start_time: '2099-01-15T10:00:00', service_type_id: SVC_ID }))
    expect(res.status).toBe(201)
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    const call = sendSMSMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.to).toBe('+15551234567')
  })
})
