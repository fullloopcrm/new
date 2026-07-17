import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/send-booking-emails — admin "resend booking confirmation" never
 * checked sms_consent or do_not_service (P1/W2 fresh-ground, 13th call site
 * of this session's missing-consent-check bug class).
 *
 * BUG (fixed here): the admin-triggered resend fired to the client on
 * client-id presence alone, on either the email or SMS channel. A
 * do_not_service (banned) or sms_consent=false (STOP-revoked, SMS channel
 * only) client still got a real "your booking is confirmed" email/text
 * whenever an admin manually resent it.
 *
 * FIX: do_not_service now blocks either channel; sms_consent additionally
 * blocks the sms channel.
 */

let bookingRow: Record<string, unknown> | null = null

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'bookings') throw new Error(`unexpected table: ${table}`)
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => (bookingRow ? { data: bookingRow, error: null } : { data: null, error: { message: 'not found' } }),
            }),
          }),
        }),
      }
    },
  },
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: 'tid-a', tenant: { id: 'tid-a' }, role: 'owner' })),
  }
})

import { POST } from './route'

function postReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

beforeEach(() => {
  notifyMock.mockClear()
})

describe('send-booking-emails POST — sms_consent / do_not_service gate', () => {
  it('BLOCKED: do_not_service=true client gets no resend on either channel', async () => {
    bookingRow = {
      id: 'b1', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T11:00:00Z', service_type: 'Clean', price: 10000, address: '1 Main St',
      clients: { id: 'c1', name: 'DNS', email: 'dns@x.com', phone: '+15551110000', sms_consent: true, do_not_service: true },
      team_members: null,
    }
    const res = await POST(postReq({ bookingId: 'b1', clientOnly: true, channel: 'email' }))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.results[0]).toMatchObject({ type: 'client_confirmation', success: false })
  })

  it('BLOCKED: sms_consent=false client gets no resend on the sms channel', async () => {
    bookingRow = {
      id: 'b2', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T11:00:00Z', service_type: 'Clean', price: 10000, address: '1 Main St',
      clients: { id: 'c2', name: 'Blocked', email: 'blocked@x.com', phone: '+15552220000', sms_consent: false, do_not_service: false },
      team_members: null,
    }
    const res = await POST(postReq({ bookingId: 'b2', clientOnly: true, channel: 'sms' }))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('CONTROL: sms_consent=false client STILL gets the resend on the email channel', async () => {
    bookingRow = {
      id: 'b3', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T11:00:00Z', service_type: 'Clean', price: 10000, address: '1 Main St',
      clients: { id: 'c3', name: 'EmailOnly', email: 'emailonly@x.com', phone: '+15553330000', sms_consent: false, do_not_service: false },
      team_members: null,
    }
    const res = await POST(postReq({ bookingId: 'b3', clientOnly: true, channel: 'email' }))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c3', channel: 'email' }))
  })

  it('CONTROL: consenting client gets the resend on the sms channel', async () => {
    bookingRow = {
      id: 'b4', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T11:00:00Z', service_type: 'Clean', price: 10000, address: '1 Main St',
      clients: { id: 'c4', name: 'Okay', email: 'ok@x.com', phone: '+15554440000', sms_consent: true, do_not_service: false },
      team_members: null,
    }
    const res = await POST(postReq({ bookingId: 'b4', clientOnly: true, channel: 'sms' }))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c4', channel: 'sms' }))
  })
})
