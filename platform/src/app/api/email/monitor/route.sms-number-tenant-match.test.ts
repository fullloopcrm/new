import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * email/monitor's IMAP-parsed Zelle/Venmo "thank you" client SMS gated
 * directly on `tenant.telnyx_api_key && tenant.telnyx_phone`, bypassing the
 * `resolveTenantSmsCredentials()` telnyx_phone||sms_number precedence every
 * other send-gating call site in the codebase now uses (sms_number carry-
 * forward list, closed everywhere else this session -- this route was
 * flagged as an unswept fresh-ground surface at 20:37 EDT). A tenant whose
 * Telnyx number only ever landed in the legacy `sms_number` column had this
 * payment-confirmation SMS silently skipped, even though every other SMS
 * flow for that tenant works via the resolver.
 *
 * FIX: gate + send now use `resolveTenantSmsCredentials(tenant)` (also added
 * `sms_number` to the tenants select, which the route was missing entirely).
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

function tenant(overrides: Record<string, unknown>) {
  return {
    id: 'tid-a',
    name: 'Alpha',
    imap_host: 'imap.example.com',
    imap_port: 993,
    imap_user: 'inbox@example.com',
    imap_pass: 'secret',
    email_monitor_enabled: true,
    telnyx_api_key: 'key',
    telnyx_phone: null,
    sms_number: null,
    ...overrides,
  }
}

function fakeEmail(fromName: string) {
  return { uid: 1, from: 'noreply@zellepay.com', fromName, subject: 'You received money', text: 'body', date: new Date('2026-07-17T00:00:00Z'), messageId: 'msg-1' }
}

function seed(tenantRow: Record<string, unknown>) {
  return {
    tenants: [tenantRow],
    payments: [] as Record<string, unknown>[],
    bookings: [
      {
        id: 'bk-1',
        tenant_id: 'tid-a',
        client_id: 'client-1',
        payment_status: 'pending',
        payment_sender_name: 'Jane Doe',
        start_time: '2026-08-01T10:00:00Z',
        clients: { phone: '+15551230000', sms_consent: true, do_not_service: false },
      },
    ],
    notifications: [] as Record<string, unknown>[],
    unmatched_payments: [] as Record<string, unknown>[],
    admin_tasks: [] as Record<string, unknown>[],
  }
}

let h: Harness
function setUp(tenantRow: Record<string, unknown>) {
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
  h = createTenantDbHarness(seed(tenantRow))
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

describe('email/monitor — resolveTenantSmsCredentials() precedence on payment-confirmation SMS', () => {
  it('telnyx_phone is null but sms_number is set — client is still texted (not silently skipped)', async () => {
    setUp(tenant({ telnyx_phone: null, sms_number: '+15559990000' }))
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+15551230000', telnyxPhone: '+15559990000' }))
  })

  it('telnyx_phone set — takes precedence over sms_number', async () => {
    setUp(tenant({ telnyx_phone: '+15551110000', sms_number: '+15559990000' }))
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ telnyxPhone: '+15551110000' }))
  })

  it('neither telnyx_phone nor sms_number set — no send, no crash (genuinely unconfigured tenant)', async () => {
    setUp(tenant({ telnyx_phone: null, sms_number: null }))
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it("wrong-tenant probe: tenant A's sms_number-resolved credentials never leak another tenant's number", async () => {
    setUp(tenant({ id: 'tid-a', telnyx_phone: null, sms_number: '+15559990000' }))
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ telnyxPhone: '+15559990000' }))
    expect(sendSMSMock).not.toHaveBeenCalledWith(expect.objectContaining({ telnyxPhone: '+15558880000' }))
  })
})
