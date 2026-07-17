import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/portal/bookings — the logged-in client portal's self-book route —
 * had ZERO notification wiring, unlike its sibling POST /api/client/book (the
 * public widget), which fires an admin alert + client email/SMS confirmation
 * on every new booking. A same-day/emergency booking made through the portal
 * (the same route the emergency-rate test above proves gets billed correctly)
 * landed in the DB and told no one — not the owner/dispatcher, not the
 * client. This proves the fix: notify() fires for the admin, and the client
 * gets an email + SMS confirmation when the tenant has the provider configured.
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

const TENANT_ID = 'tenant-notify'
const CLIENT_ID = 'client-notify'
const SVC_ID = 'svc-notify'
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
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Jane Doe', email: 'jane@example.com', phone: '+15551234567' }])
})

describe('portal self-book — notification wiring', () => {
  it('fires an admin new_booking notify() on every booking, even with no email/SMS configured', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing' }])
    const res = await POST(req({ start_time: '2099-01-15T10:00:00', service_type_id: SVC_ID }))
    expect(res.status).toBe(201)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.tenantId).toBe(TENANT_ID)
    expect(call.type).toBe('new_booking')
    expect(String(call.message)).toContain('via Client Portal')
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('sends the client a booking-received email when the tenant has Resend configured', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing', resend_api_key: 'rk_test', email_from: 'hello@acme.test' }])
    const res = await POST(req({ start_time: '2099-01-15T10:00:00', service_type_id: SVC_ID }))
    expect(res.status).toBe(201)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const call = sendEmailMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.to).toBe('jane@example.com')
    expect(call.resendApiKey).toBe('rk_test')
  })

  it('sends the client a booking-received SMS when the tenant has Telnyx configured', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing', telnyx_api_key: 'tk_test', telnyx_phone: '+15559990000' }])
    const res = await POST(req({ start_time: '2099-01-15T10:00:00', service_type_id: SVC_ID }))
    expect(res.status).toBe(201)
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    const call = sendSMSMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.to).toBe('+15551234567')
    expect(call.telnyxApiKey).toBe('tk_test')
  })

  it('does not fail booking creation if notify/email/SMS throw', async () => {
    notifyMock.mockRejectedValueOnce(new Error('boom'))
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Plumbing' }])
    const res = await POST(req({ start_time: '2099-01-15T10:00:00', service_type_id: SVC_ID }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.id).toBeTruthy()
  })
})
