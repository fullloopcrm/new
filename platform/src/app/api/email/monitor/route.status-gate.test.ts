import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * email/monitor's tenant loop polled every tenant with email_monitor_enabled
 * (IMAP inbox scan -> Zelle/Venmo payment match -> `payments` insert,
 * `bookings.payment_status` flip to paid, client SMS receipt) with NO tenant
 * status check at all — same class of gap fixed across comhub-email/
 * Telegram/Telnyx this session. A suspended/cancelled/deleted tenant's inbox
 * kept getting polled and its "payments" kept getting recorded and its
 * customers kept getting SMS receipts indefinitely.
 *
 * FIX: `tenantServesSite()` filter applied to the tenants list before the
 * per-tenant processing loop.
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
    status: 'active',
    imap_host: 'imap.example.com',
    imap_port: 993,
    imap_user: 'inbox@example.com',
    imap_pass: 'secret',
    email_monitor_enabled: true,
    telnyx_api_key: 'key',
    telnyx_phone: '+15551110000',
    sms_number: null,
    ...overrides,
  }
}

function fakeEmail() {
  return { uid: 1, from: 'noreply@zellepay.com', fromName: 'Jane Doe', subject: 'You received money', text: 'body', date: new Date('2026-07-17T00:00:00Z'), messageId: 'msg-1' }
}

function seed(tenantRows: Record<string, unknown>[]) {
  return {
    tenants: tenantRows,
    payments: [] as Record<string, unknown>[],
    bookings: tenantRows.map((t) => ({
      id: `bk-${t.id}`,
      tenant_id: t.id,
      client_id: `client-${t.id}`,
      payment_status: 'pending',
      payment_sender_name: 'Jane Doe',
      start_time: '2026-08-01T10:00:00Z',
      clients: { phone: '+15551230000', sms_consent: true, do_not_service: false },
    })),
    notifications: [] as Record<string, unknown>[],
    unmatched_payments: [] as Record<string, unknown>[],
    admin_tasks: [] as Record<string, unknown>[],
  }
}

let h: Harness
function setUp(tenantRows: Record<string, unknown>[]) {
  sendSMSMock.mockClear()
  fetchUnreadEmailsMock.mockReset()
  fetchUnreadEmailsMock.mockResolvedValue([fakeEmail()])
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
  h = createTenantDbHarness(seed(tenantRows))
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

describe('email/monitor — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'does not poll IMAP, record a payment, mark a booking paid, or text the client for a %s tenant',
    async (status) => {
      setUp([tenant({ id: 'tid-dead', status })])
      const res = await POST(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.tenants).toBe(0)
      expect(fetchUnreadEmailsMock).not.toHaveBeenCalled()
      expect(sendSMSMock).not.toHaveBeenCalled()
      expect(h.capture.inserts.filter((i) => i.table === 'payments')).toHaveLength(0)
      expect(h.capture.updates.filter((u) => u.table === 'bookings')).toHaveLength(0)
    },
  )

  it.each(['active', 'setup', 'pending'])('still processes a %s tenant normally', async (status) => {
    setUp([tenant({ id: 'tid-live', status })])
    const res = await POST(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tenants).toBe(1)
    expect(body.matched).toBe(1)
    expect(fetchUnreadEmailsMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(h.capture.inserts.filter((i) => i.table === 'payments')).toHaveLength(1)
  })

  it("wrong-tenant probe: a serving tenant's IMAP/payment/SMS never fires on behalf of a co-seeded dead tenant", async () => {
    setUp([
      tenant({ id: 'tid-dead', status: 'cancelled' }),
      tenant({ id: 'tid-live', status: 'active' }),
    ])
    const res = await POST(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tenants).toBe(1)
    expect(fetchUnreadEmailsMock).toHaveBeenCalledTimes(1)
    const paymentInserts = h.capture.inserts.filter((i) => i.table === 'payments')
    expect(paymentInserts).toHaveLength(1)
    expect(paymentInserts[0].rows[0].tenant_id).toBe('tid-live')
    const bookingUpdates = h.capture.updates.filter((u) => u.table === 'bookings')
    expect(bookingUpdates).toHaveLength(1)
    expect(bookingUpdates[0].matched.every((row: Record<string, unknown>) => row.tenant_id === 'tid-live')).toBe(true)
  })

  it('a null/unknown status tenant still fails open (fail-open matches tenantServesSite() semantics elsewhere)', async () => {
    setUp([tenant({ id: 'tid-null', status: null })])
    const res = await POST(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tenants).toBe(1)
    expect(fetchUnreadEmailsMock).toHaveBeenCalledTimes(1)
  })
})
