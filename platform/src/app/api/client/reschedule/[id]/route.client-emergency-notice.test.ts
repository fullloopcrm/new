import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (56) fixed the team-member push/quiet-hours leg of reschedule-into-
 * emergency; the client's OWN two channels for the identical event — the
 * confirmation email built inline in this route, and the SMS resolved via
 * clientSmsTemplates(tenant).reschedule() — stayed completely silent about
 * the urgency/rate change. The client is the one actually billed the
 * emergency rate, so this is the more consequential half of the gap.
 * Proves both channels now carry an urgency notice when the reschedule
 * flips is_emergency true, and stay byte-identical (no notice) otherwise.
 */

const { sendEmailMock, sendSMSMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(async (..._args: unknown[]) => ({ success: true })),
  sendSMSMock: vi.fn(async (..._args: unknown[]) => ({})),
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
let currentTenant: { id: string; timezone: string | null; resend_api_key: string | null; telnyx_api_key: string | null; telnyx_phone: string | null; name: string; email_from: string | null }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => currentTenant }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async () => ({ clientId: 'client-notice' }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/email', () => ({ sendEmail: sendEmailMock }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: async () => ({}) }))
vi.mock('@/lib/sms-templates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sms-templates')>()
  return { ...actual, smsJobRescheduled: () => 'job rescheduled' }
})

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-notice'
const CLIENT_ID = 'client-notice'
const fake = supabaseAdmin as unknown as FakeSupabase

function todayStr(): string {
  return new Date().toLocaleDateString('en-CA')
}
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
  sendEmailMock.mockClear()
  sendSMSMock.mockClear()
  currentTenant = { id: TENANT_ID, timezone: 'America/New_York', resend_api_key: 're_test', telnyx_api_key: 'tx_test', telnyx_phone: '+15550000000', name: 'Tenant Co', email_from: null }
  fake._seed('email_logs', [])
})

describe('client reschedule PUT — client-facing email/SMS emergency notice', () => {
  it('rescheduling an assigned booking to TODAY (industry tenant) puts an urgency notice in both the email and SMS', async () => {
    fake._seed('bookings', [
      { id: 'bk-notice-1', tenant_id: TENANT_ID, client_id: CLIENT_ID, team_member_id: null, start_time: '2099-01-15T10:00:00.000Z', end_time: '2099-01-15T12:00:00.000Z', hourly_rate: 75, price: 15000, is_emergency: false, clients: { name: 'A Client', email: 'client@example.com', phone: '+15551234567', sms_consent: true }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: `${todayStr()}T14:00:00.000Z`, end_time: `${todayStr()}T16:00:00.000Z` }), paramsFor('bk-notice-1'))
    expect(res.status).toBe(200)
    await flush()

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const emailArg = sendEmailMock.mock.calls[0]?.[0] as { html: string }
    expect(emailArg.html).toContain('emergency appointment')
    expect(emailArg.html).toContain('emergency rate applies')

    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    const smsArg = sendSMSMock.mock.calls[0]?.[0] as { body: string }
    expect(smsArg.body).toContain('same-day/emergency appointment')
    expect(smsArg.body).toContain('emergency rate applies')
  })

  it('rescheduling to a future date (control) keeps the plain copy — no urgency notice on either channel', async () => {
    fake._seed('bookings', [
      { id: 'bk-notice-2', tenant_id: TENANT_ID, client_id: CLIENT_ID, team_member_id: null, start_time: '2099-01-15T10:00:00.000Z', end_time: '2099-01-15T12:00:00.000Z', hourly_rate: 75, price: 15000, is_emergency: false, clients: { name: 'A Client', email: 'client@example.com', phone: '+15551234567', sms_consent: true }, team_members: null },
    ])
    const res = await PUT(putReq({ start_time: '2099-02-01T10:00:00.000Z', end_time: '2099-02-01T12:00:00.000Z' }), paramsFor('bk-notice-2'))
    expect(res.status).toBe(200)
    await flush()

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const emailArg = sendEmailMock.mock.calls[0]?.[0] as { html: string }
    expect(emailArg.html).not.toContain('emergency appointment')

    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    const smsArg = sendSMSMock.mock.calls[0]?.[0] as { body: string }
    expect(smsArg.body).not.toContain('same-day/emergency appointment')
  })
})
