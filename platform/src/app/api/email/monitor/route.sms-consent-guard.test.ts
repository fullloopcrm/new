import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * email/monitor's IMAP-parsed Zelle/Venmo "thank you" client SMS never
 * checked sms_consent / do_not_service (P1/W2 repo-wide sendSMS/sendEmail-
 * vs-consent-gate cross-check, fresh-ground candidate #22 from the prior
 * gap/fluidity round). webhooks/stripe's equivalent payment-confirmation SMS
 * already gates on `client.sms_consent !== false && !client.do_not_service`
 * -- this parallel path (payments reported via a forwarded confirmation
 * email instead of Stripe checkout) never did, on any of its 3 match
 * branches (payment_sender_name, client.name, amount-fallback).
 *
 * FIX: matchPaymentToBooking() now also selects/returns sms_consent and
 * do_not_service from the matched client; the send site gates on them.
 */

const sendSMSMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))

const fetchUnreadEmailsMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/email-monitor', () => ({
  fetchUnreadEmails: fetchUnreadEmailsMock,
  markEmailRead: vi.fn(async () => {}),
}))

const detectPaymentEmailMock = vi.hoisted(() => vi.fn(() => 'zelle'))
const parsePaymentEmailMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/payment-email-parser', () => ({
  detectPaymentEmail: detectPaymentEmailMock,
  parsePaymentEmail: parsePaymentEmailMock,
}))

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { NextRequest } from 'next/server'
import { POST } from './route'

const TENANT = {
  id: 'tid-a',
  name: 'Alpha',
  imap_host: 'imap.example.com',
  imap_port: 993,
  imap_user: 'inbox@example.com',
  imap_pass: 'secret',
  email_monitor_enabled: true,
  telnyx_api_key: 'key',
  telnyx_phone: '+15550000000',
}

function fakeEmail(fromName: string) {
  return { uid: 1, from: 'noreply@zellepay.com', fromName, subject: 'You received money', text: 'body', date: new Date('2026-07-17T00:00:00Z'), messageId: 'msg-1' }
}

function seed(clientOverrides: Record<string, unknown>) {
  return {
    tenants: [TENANT],
    payments: [] as Record<string, unknown>[],
    bookings: [
      {
        id: 'bk-1',
        tenant_id: 'tid-a',
        client_id: 'client-1',
        payment_status: 'pending',
        payment_sender_name: 'Jane Doe',
        start_time: '2026-08-01T10:00:00Z',
        clients: { phone: '+15551230000', ...clientOverrides },
      },
    ],
    notifications: [] as Record<string, unknown>[],
    unmatched_payments: [] as Record<string, unknown>[],
    admin_tasks: [] as Record<string, unknown>[],
  }
}

let h: Harness
function setUp(clientOverrides: Record<string, unknown>) {
  sendSMSMock.mockClear()
  fetchUnreadEmailsMock.mockReset()
  fetchUnreadEmailsMock.mockResolvedValue([fakeEmail('Jane Doe')])
  parsePaymentEmailMock.mockReset()
  parsePaymentEmailMock.mockReturnValue({
    method: 'zelle',
    senderName: 'Jane Doe',
    senderEmail: 'jane@example.com',
    amountCents: 15000,
    amount: 150,
    referenceId: 'ref-1',
    date: new Date('2026-07-17T00:00:00Z'),
  })
  h = createTenantDbHarness(seed(clientOverrides))
  holder.from = h.from
}

function req() {
  return new NextRequest('http://t/api/email/monitor', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'real-cron-secret'
})

describe('email/monitor — sms_consent / do_not_service gate on payment-confirmation SMS', () => {
  it('BLOCKED: sms_consent=false client is not texted the payment thank-you', async () => {
    setUp({ sms_consent: false, do_not_service: false })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('BLOCKED: do_not_service=true client is not texted the payment thank-you', async () => {
    setUp({ sms_consent: true, do_not_service: true })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: sms_consent=true, do_not_service=false client is texted', async () => {
    setUp({ sms_consent: true, do_not_service: false })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+15551230000' }))
  })

  it('CONTROL: null sms_consent/do_not_service (never set) still gets texted — opt-out model default', async () => {
    setUp({ sms_consent: null, do_not_service: null })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+15551230000' }))
  })
})
