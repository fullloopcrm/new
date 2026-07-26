import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * Cancel and Delete were the same action (hard DELETE) until 2026-07-24 —
 * every booking with payment/review/payout history failed to "cancel" with
 * a raw Postgres FK-violation error, and there was no way to actually
 * cancel one. Split into two real actions: PATCH .../status {status:
 * 'cancelled'} for a real (non-destructive) cancel, DELETE for a real
 * (destructive, now guarded) delete. This proves the cancel path notifies
 * the client — the old hard-delete flow did; this endpoint had never sent
 * any notification at all before this fix.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const BOOKING_ID = 'booking-1'

type Row = Record<string, any>

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Row[]> })) as unknown as FakeStoreHandle

const notifyMock = vi.hoisted(() => vi.fn(async (_args: Record<string, unknown>) => ({ success: true })))
const sendSMSMock = vi.hoisted(() => vi.fn(async () => ({ ok: true })))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => true }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ cancellation: () => 'Your booking was cancelled.' }) }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { PATCH } from './route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/bookings/${BOOKING_ID}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/bookings/[id]/status — cancellation notify', () => {
  beforeEach(() => {
    h.seq = 0
    notifyMock.mockClear()
    sendSMSMock.mockClear()
    h.store = {
      // makeTenantDbFake ignores .select() column lists and returns the raw
      // stored row verbatim — it doesn't expand embedded PostgREST joins like
      // `clients(name, phone, email)`. Seed `clients` pre-embedded on the
      // booking row itself so the fake's "select" returns the same shape a
      // real join would, matching what route.ts actually reads (booking.clients?.phone).
      bookings: [{ id: BOOKING_ID, tenant_id: TENANT, client_id: CLIENT, status: 'scheduled', start_time: '2026-08-01T10:00:00Z', clients: { name: 'Own Client', phone: '+15551234567', email: 'client@example.com' } }],
      tenants: [{ id: TENANT, name: 'Own Biz', telnyx_api_key: 'key', telnyx_phone: '+15550001111' }],
      clients: [{ id: CLIENT, tenant_id: TENANT, name: 'Own Client', phone: '+15551234567', email: 'client@example.com' }],
      deals: [],
    }
  })

  it('notifies the client (email + SMS) when a booking transitions to cancelled', async () => {
    const res = await PATCH(jsonReq({ status: 'cancelled' }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_cancelled',
      recipientType: 'client',
      recipientId: CLIENT,
      bookingId: BOOKING_ID,
    }))
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
  })

  it('does not notify on a non-cancelling transition', async () => {
    const res = await PATCH(jsonReq({ status: 'confirmed' }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('still succeeds even if the notify call throws (non-blocking)', async () => {
    notifyMock.mockRejectedValueOnce(new Error('resend down'))
    const res = await PATCH(jsonReq({ status: 'cancelled' }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.status).toBe('cancelled')
  })
})
