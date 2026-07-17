/**
 * POST /api/schedules/:id/pause — the client pause-notification SMS branch
 * called the raw sendSMS() from '@/lib/sms' with no sms_consent check, same
 * consent-bypass bug class as notify.ts/cron/confirmations/bookings creation.
 * webhooks/telnyx's STOP handler sets clients.sms_consent=false tenant-wide
 * (a legally-required blanket opt-out) -- this route ignored it, so an
 * opted-out client still got a "Your recurring service is paused..." SMS
 * whenever an operator paused their schedule and it cancelled a visit.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
  audit: vi.fn(),
  sendSMS: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  sendSMS: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...a: unknown[]) => h.sendSMS(...a) }))

import { POST } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

function scheduleAClient(): { name: string; phone: string; email: string; sms_consent?: boolean } {
  return h.store.recurring_schedules[0].clients as { name: string; phone: string; email: string; sms_consent?: boolean }
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: 'owner' }))
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.sendSMS.mockReset()
  h.sendSMS.mockResolvedValue({ ok: true })
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', recurring_type: 'weekly', status: 'active', clients: { name: 'Alice', phone: '555-0001', email: 'a@x.com', sms_consent: true } },
    ],
    bookings: [
      { id: 'book-in-window', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2099-01-05T09:00:00' },
    ],
    notifications: [],
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }],
  }
})

describe('POST /api/schedules/:id/pause — client sms_consent gate', () => {
  it('does NOT text a client who opted out (sms_consent:false)', async () => {
    scheduleAClient().sms_consent = false

    const res = await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))

    expect(res.status).toBe(200)
    expect(h.sendSMS).not.toHaveBeenCalled()
  })

  it('still texts a client with consent (sms_consent:true)', async () => {
    const res = await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))

    expect(res.status).toBe(200)
    expect(h.sendSMS).toHaveBeenCalledTimes(1)
    expect(h.sendSMS.mock.calls[0][0]).toMatchObject({ to: '555-0001' })
  })

  it('still texts a client with no explicit opt-out (sms_consent unset)', async () => {
    delete scheduleAClient().sms_consent

    const res = await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))

    expect(res.status).toBe(200)
    expect(h.sendSMS).toHaveBeenCalledTimes(1)
  })
})
