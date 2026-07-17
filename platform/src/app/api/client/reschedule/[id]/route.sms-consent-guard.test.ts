import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/reschedule/[id] PUT — client SMS never checked sms_consent
 * (P1/W2 fresh-ground audit of the missing-sms_consent-check pattern
 * flagged in deploy-prep/w2-payment-sms-consent-gap-2026-07-17-0404.md's
 * NOTICED #1, site client/reschedule/[id]/route.ts:117).
 *
 * BUG (fixed here): the reschedule-confirmation SMS to the client fired off
 * `updated.clients.phone` alone — no `sms_consent` check, unlike every
 * other client SMS site this session's audit has fixed (payment-processor.ts,
 * webhooks/stripe.ts, client/book route.ts). A client who replied STOP
 * (sms_consent=false) but is still an authenticated, non-do_not_service
 * client (protectClientAPI only blocks do_not_service, not sms_consent —
 * they're separate axes) kept getting texted every time they rescheduled
 * their own booking.
 *
 * FIX: the SMS send now also gates on `sms_consent !== false`.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: CTX_TENANT, timezone: 'America/New_York', name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15550000000', resend_api_key: null })),
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: vi.fn(async () => ({ clientId: 'client-a' })),
}))
const sendSMSMock = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: vi.fn(async () => ({ memberName: 'x', push: true, email: false, sms: false, inApp: true, quietHours: false })) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'msg' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'msg' }) }))

import { PUT } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-blocked', tenant_id: CTX_TENANT, client_id: 'client-a', team_member_id: null, start_time: '2026-08-01T10:00:00Z', clients: { name: 'Blocked Client', phone: '3005551111', sms_consent: false } },
      { id: 'bk-control', tenant_id: CTX_TENANT, client_id: 'client-a', team_member_id: null, start_time: '2026-08-01T10:00:00Z', clients: { name: 'Control Client', phone: '3005552222', sms_consent: true } },
      { id: 'bk-null-consent', tenant_id: CTX_TENANT, client_id: 'client-a', team_member_id: null, start_time: '2026-08-01T10:00:00Z', clients: { name: 'Null Consent Client', phone: '3005553333', sms_consent: null } },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  sendSMSMock.mockClear()
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://t/api/client/reschedule/bk-1', { method: 'PUT', body: JSON.stringify(body) })
}
function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

async function flushFanOut() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('client/reschedule/[id] PUT — sms_consent gate on client confirmation SMS', () => {
  it('BLOCKED: sms_consent=false client is not texted on reschedule', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params('bk-blocked'))
    expect(res.status).toBe(200)
    await flushFanOut()
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: sms_consent=true client is still texted on reschedule', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params('bk-control'))
    expect(res.status).toBe(200)
    await flushFanOut()
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
  })

  it('CONTROL: sms_consent=null (never explicitly asked) defaults to allowed', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params('bk-null-consent'))
    expect(res.status).toBe(200)
    await flushFanOut()
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005553333' }))
  })
})
