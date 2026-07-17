import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/notifications (type=15min_warning) — client SMS "wrapping up"
 * heads-up never checked sms_consent or do_not_service (P1/W2 fresh-ground,
 * 12th call site of this session's missing-consent-check bug class).
 *
 * BUG (fixed here): the 15-minute-heads-up SMS fired whenever the booking
 * had a client_id, with no consent check at all (not even a phone-presence
 * check — notify() resolves the phone itself). A do_not_service (banned) or
 * sms_consent=false (STOP-revoked) client still got a real "wrapping up in
 * 15 minutes (~$N)" text triggered by an admin/team action.
 *
 * FIX: the send now also gates on `sms_consent !== false && !do_not_service`.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

vi.mock('@/lib/csrf-guard', () => ({ isCrossSiteRequest: () => false }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { POST } from './route'

function seed(clientRow: Record<string, unknown> | null) {
  return {
    notifications: [] as Record<string, unknown>[],
    bookings: [{
      id: 'b1', tenant_id: CTX_TENANT, client_id: clientRow ? 'c1' : null,
      check_in_time: null, hourly_rate: null,
      clients: clientRow,
    }],
  }
}

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://t/api/notifications', { method: 'POST', body: JSON.stringify(body) })
}

let h: Harness
beforeEach(() => {
  notifyMock.mockClear()
})

describe('notifications POST (15min_warning) — sms_consent / do_not_service gate', () => {
  it('BLOCKED: sms_consent=false client is not texted the 15-min heads-up', async () => {
    h = createTenantDbHarness(seed({ name: 'Blocked', phone: '+15551110000', sms_consent: false, do_not_service: false }))
    holder.from = h.from
    const res = await POST(postReq({ type: '15min_warning', booking_id: 'b1' }))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('BLOCKED: do_not_service=true client is not texted the 15-min heads-up', async () => {
    h = createTenantDbHarness(seed({ name: 'DNS', phone: '+15552220000', sms_consent: true, do_not_service: true }))
    holder.from = h.from
    const res = await POST(postReq({ type: '15min_warning', booking_id: 'b1' }))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('CONTROL: consenting client is texted the 15-min heads-up', async () => {
    h = createTenantDbHarness(seed({ name: 'Okay', phone: '+15553330000', sms_consent: true, do_not_service: false }))
    holder.from = h.from
    const res = await POST(postReq({ type: '15min_warning', booking_id: 'b1' }))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c1', channel: 'sms', type: 'check_out' }))
  })
})
