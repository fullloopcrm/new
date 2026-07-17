import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/bookings/batch — client SMS + email confirmation (sent for the
 * first row only) never checked sms_consent or do_not_service (P1/W2
 * fresh-ground, same missing-consent-check bug class as POST /api/bookings
 * and PUT/DELETE /api/bookings/[id], both fixed in the same round — this is
 * the multi-date bulk-create path BookingsAdmin.tsx's "Create Booking"
 * modal uses).
 *
 * BUG (fixed here): both the SMS and the direct (non-notify()) email send
 * fired on phone/email presence alone. A do_not_service (banned) or
 * sms_consent=false (STOP-revoked) client still got a real "your booking is
 * confirmed" text/email.
 *
 * FIX: SMS now also gates on `sms_consent !== false && !do_not_service`;
 * email now also gates on `!do_not_service`.
 *
 * `bookings` gets a hand-rolled table mock (not the shared
 * createTenantDbHarness) because the harness doesn't do real foreign-table
 * joins — this embeds the matching seeded clients() row onto the insert
 * result the same way the route's `.select('*, clients(*), ...)` re-read
 * would in production.
 */

type Row = Record<string, unknown>

function makeBookingsTable(clientsById: Record<string, Row>) {
  return () => {
    let insertRows: Row[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      insert: (rows: Row | Row[]) => {
        const arr = Array.isArray(rows) ? rows : [rows]
        insertRows = arr.map((r, i) => ({
          id: r.id ?? `bk-ins-${i}`,
          ...r,
          clients: clientsById[r.client_id as string] || null,
        }))
        return chain
      },
      select: () => chain,
      then: (resolve: (v: unknown) => void) => resolve({ data: insertRows, error: null }),
    }
    return chain
  }
}

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], clientsById: {} as Record<string, Row> }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => (t === 'bookings' ? makeBookingsTable(holder.clientsById)() : holder.from!(t)),
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({}))
const sendEmailMock = vi.fn(async (_opts: Record<string, unknown>) => ({}))

vi.mock('@/lib/email', () => ({ sendEmail: (opts: Record<string, unknown>) => sendEmailMock(opts) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'msg' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmed!' }) }))

import { POST } from './route'

const blockedClient = { name: 'Blocked Client', email: 'blocked@example.com', phone: '3005551111', sms_consent: false, do_not_service: false }
const dnsClient = { name: 'DNS Client', email: 'dns@example.com', phone: '3005554444', sms_consent: true, do_not_service: true }
const controlClient = { name: 'Control Client', email: 'control@example.com', phone: '3005552222', sms_consent: true, do_not_service: false }

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    clients: [
      { id: 'c-blocked', tenant_id: CTX_TENANT, ...blockedClient },
      { id: 'c-dns', tenant_id: CTX_TENANT, ...dnsClient },
      { id: 'c-control', tenant_id: CTX_TENANT, ...controlClient },
    ],
    tenants: [{ id: CTX_TENANT, name: 'Alpha', telnyx_api_key: 'key', telnyx_phone: '+15550000000', resend_api_key: 'rkey', email_from: 'noreply@alpha.example.com' }],
  })
  holder.from = h.from
  holder.clientsById = { 'c-blocked': blockedClient, 'c-dns': dnsClient, 'c-control': controlClient }
  sendSMSMock.mockClear()
  sendEmailMock.mockClear()
})

function post(clientId: string) {
  return POST(new Request('http://t/api/bookings/batch', {
    method: 'POST',
    body: JSON.stringify({
      bookings: [{ client_id: clientId, start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', service_type: 'Clean', price: 100, status: 'scheduled' }],
    }),
  }))
}

describe('bookings/batch POST — sms_consent / do_not_service gate on client confirmation', () => {
  it('BLOCKED: sms_consent=false client is not texted (email still sent)', async () => {
    const res = await post('c-blocked')
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'blocked@example.com' }))
  })

  it('BLOCKED: do_not_service=true client gets neither SMS nor email', async () => {
    const res = await post('c-dns')
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('CONTROL: sms_consent=true, do_not_service=false client gets both', async () => {
    const res = await post('c-control')
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'control@example.com' }))
  })
})
