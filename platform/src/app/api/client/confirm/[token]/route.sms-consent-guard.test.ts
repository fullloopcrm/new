import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/confirm/[token] POST — the one-tap "terms accepted" SMS never
 * checked sms_consent / do_not_service (P1/W2 repo-wide sendSMS/sendEmail-
 * vs-consent-gate cross-check, fresh-ground candidate #22 from the prior
 * gap/fluidity round).
 *
 * BUG (fixed here): the route called `sendSMS(client.phone, ..., {
 * skipConsent: true, ... })` unconditionally on `client?.phone` presence.
 * `skipConsent: true` deliberately bypasses `lib/nycmaid/sms.ts`'s own
 * built-in consent check (which itself only covers sms_consent, not
 * do_not_service, and only fires when recipientType/recipientId are passed
 * -- neither was here). Net effect: a STOP-revoked or banned client tapping
 * their own one-tap confirm link still got texted "Got it — terms accepted".
 *
 * FIX: select sms_consent/do_not_service on the joined client row and gate
 * the send on `sms_consent !== false && !do_not_service`, same invariant
 * every other client SMS fan-out in this session enforces.
 */

const sendSMSMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      {
        id: 'bk-blocked',
        tenant_id: 'tid-a',
        client_id: 'client-blocked',
        start_time: '2026-08-02T10:00:00Z',
        status: 'pending',
        client_terms_accepted_at: null,
        client_confirm_token: 'tok-blocked',
        notes: '',
        clients: { name: 'Blocked Client', phone: '+15551110000', sms_consent: false, do_not_service: false },
      },
      {
        id: 'bk-dns',
        tenant_id: 'tid-a',
        client_id: 'client-dns',
        start_time: '2026-08-02T11:00:00Z',
        status: 'pending',
        client_terms_accepted_at: null,
        client_confirm_token: 'tok-dns',
        notes: '',
        clients: { name: 'DNS Client', phone: '+15552220000', sms_consent: true, do_not_service: true },
      },
      {
        id: 'bk-control',
        tenant_id: 'tid-a',
        client_id: 'client-control',
        start_time: '2026-08-02T12:00:00Z',
        status: 'pending',
        client_terms_accepted_at: null,
        client_confirm_token: 'tok-control',
        notes: '',
        clients: { name: 'Control Client', phone: '+15553330000', sms_consent: true, do_not_service: false },
      },
      {
        id: 'bk-null-consent',
        tenant_id: 'tid-a',
        client_id: 'client-null',
        start_time: '2026-08-02T13:00:00Z',
        status: 'pending',
        client_terms_accepted_at: null,
        client_confirm_token: 'tok-null',
        notes: '',
        clients: { name: 'Null-Consent Client', phone: '+15554440000', sms_consent: null, do_not_service: null },
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  sendSMSMock.mockClear()
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function params(token: string) {
  return { params: Promise.resolve({ token }) }
}

describe('client/confirm/[token] POST — sms_consent / do_not_service gate', () => {
  it('BLOCKED: sms_consent=false client tapping their own confirm link is not texted', async () => {
    const res = await POST(new Request('http://t/api/client/confirm/tok-blocked', { method: 'POST' }), params('tok-blocked'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('BLOCKED: do_not_service=true client tapping their own confirm link is not texted', async () => {
    const res = await POST(new Request('http://t/api/client/confirm/tok-dns', { method: 'POST' }), params('tok-dns'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: sms_consent=true, do_not_service=false client is texted', async () => {
    const res = await POST(new Request('http://t/api/client/confirm/tok-control', { method: 'POST' }), params('tok-control'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith('+15553330000', expect.any(String), expect.objectContaining({ skipConsent: true, smsType: 'terms_accepted' }))
  })

  it('CONTROL: null sms_consent/do_not_service (never set) still gets texted — opt-out model default', async () => {
    const res = await POST(new Request('http://t/api/client/confirm/tok-null', { method: 'POST' }), params('tok-null'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith('+15554440000', expect.any(String), expect.any(Object))
  })
})
