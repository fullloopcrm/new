import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * schedules/[id]/pause POST — client SMS never checked sms_consent or
 * do_not_service (P1/W2 fresh-ground audit of the missing-sms_consent-check
 * pattern — same invariant every other client SMS fan-out enforces:
 * payment-processor.ts, webhooks/stripe.ts, client/book, client/reschedule).
 *
 * BUG (fixed here): pausing a recurring schedule cancels the client's
 * upcoming bookings in the pause window and texts them a summary — gated
 * only on `client?.phone` truthiness. A client who replied STOP
 * (sms_consent=false) or who is flagged do_not_service still got texted
 * every time an admin paused their schedule.
 *
 * FIX: the SMS send now also gates on `sms_consent !== false && !do_not_service`.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

const sendSMSMock = vi.hoisted(() => vi.fn(async () => ({ ok: true })))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'sch-blocked', tenant_id: A, status: 'active', paused_until: null, recurring_type: 'weekly', clients: { name: 'Blocked Client', phone: '3005551111', email: null, sms_consent: false, do_not_service: false } },
      { id: 'sch-dns', tenant_id: A, status: 'active', paused_until: null, recurring_type: 'weekly', clients: { name: 'DNS Client', phone: '3005554444', email: null, sms_consent: true, do_not_service: true } },
      { id: 'sch-control', tenant_id: A, status: 'active', paused_until: null, recurring_type: 'weekly', clients: { name: 'Control Client', phone: '3005552222', email: null, sms_consent: true, do_not_service: false } },
      { id: 'sch-null-consent', tenant_id: A, status: 'active', paused_until: null, recurring_type: 'weekly', clients: { name: 'Null Consent Client', phone: '3005553333', email: null, sms_consent: null, do_not_service: false } },
    ],
    bookings: [
      { id: 'bk-blocked', tenant_id: A, schedule_id: 'sch-blocked', status: 'scheduled', start_time: '2026-08-01T00:00:00Z' },
      { id: 'bk-dns', tenant_id: A, schedule_id: 'sch-dns', status: 'scheduled', start_time: '2026-08-01T00:00:00Z' },
      { id: 'bk-control', tenant_id: A, schedule_id: 'sch-control', status: 'scheduled', start_time: '2026-08-01T00:00:00Z' },
      { id: 'bk-null-consent', tenant_id: A, schedule_id: 'sch-null-consent', status: 'scheduled', start_time: '2026-08-01T00:00:00Z' },
    ],
    tenants: [
      { id: A, name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15550000000' },
    ],
    notifications: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  sendSMSMock.mockClear()
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function pauseReq(paused_until = '2026-09-01') {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({ paused_until }) })
}

describe('schedules/[id]/pause POST — sms_consent / do_not_service gate on client SMS', () => {
  it('BLOCKED: sms_consent=false client is not texted when their schedule is paused', async () => {
    const res = await POST(pauseReq(), params('sch-blocked'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('BLOCKED: do_not_service=true client is not texted even with sms_consent=true', async () => {
    const res = await POST(pauseReq(), params('sch-dns'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: sms_consent=true, do_not_service=false client is still texted', async () => {
    const res = await POST(pauseReq(), params('sch-control'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
  })

  it('CONTROL: sms_consent=null (never explicitly asked) defaults to allowed', async () => {
    const res = await POST(pauseReq(), params('sch-null-consent'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005553333' }))
  })
})
