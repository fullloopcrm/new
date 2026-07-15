import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST/DELETE /api/schedules/:id/pause — first route-level regression test
 * (P1/W1 O13 sweep). Pauses a recurring schedule (cancelling bookings within
 * the pause window + notifying the client) or resumes it early. Zero prior
 * coverage of the pause-window scoping, the SMS-only-when-configured gate,
 * or tenant isolation on a caller-supplied schedule id.
 */

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

import { POST, DELETE } from './route'
import { AuthError } from '@/lib/tenant-query'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

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
      { id: 'sched-A1', tenant_id: 'tenant-A', recurring_type: 'weekly', status: 'active', clients: { name: 'Alice', phone: '555-0001', email: 'a@x.com' } },
      { id: 'sched-B1', tenant_id: 'tenant-B', recurring_type: 'weekly', status: 'active', clients: { name: 'Bob', phone: '555-0002', email: null } },
    ],
    bookings: [
      { id: 'book-in-window', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2099-01-05T09:00:00' },
      { id: 'book-after-window', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2099-02-01T09:00:00' },
      { id: 'book-B1', tenant_id: 'tenant-B', schedule_id: 'sched-B1', status: 'scheduled', start_time: '2099-01-05T09:00:00' },
    ],
    notifications: [],
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }],
  }
})

describe('POST /api/schedules/:id/pause', () => {
  it('propagates an AuthError unchanged', async () => {
    h.getTenantForRequest.mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))

    expect(res.status).toBe(401)
  })

  it('rejects a missing paused_until with 400', async () => {
    const res = await POST(postReq({}), params('sched-A1'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'paused_until is required' })
  })

  it('returns 404 for a schedule that does not exist', async () => {
    const res = await POST(postReq({ paused_until: '2099-01-31' }), params('does-not-exist'))

    expect(res.status).toBe(404)
  })

  it("tenant A can never pause tenant B's schedule", async () => {
    const res = await POST(postReq({ paused_until: '2099-01-31' }), params('sched-B1'))

    expect(res.status).toBe(404)
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-B1')?.status).toBe('active')
    expect(h.store.bookings.find((b) => b.id === 'book-B1')?.status).toBe('scheduled')
  })

  it('pauses the schedule and cancels only bookings within the pause window', async () => {
    const res = await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.bookings_cancelled).toBe(1)
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-A1')?.status).toBe('paused')
    expect(h.store.bookings.find((b) => b.id === 'book-in-window')?.status).toBe('cancelled')
    expect(h.store.bookings.find((b) => b.id === 'book-after-window')?.status).toBe('scheduled')
  })

  it('inserts an in-app notification describing the pause and cancellation count', async () => {
    await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))

    const notif = h.store.notifications[0]
    expect(notif.type).toBe('schedule_paused')
    expect(notif.message).toContain('Alice')
    expect(notif.message).toContain('1 cancelled')
  })

  it('sends an SMS to the client when bookings were cancelled and Telnyx is configured', async () => {
    await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))

    expect(h.sendSMS).toHaveBeenCalledTimes(1)
    const call = h.sendSMS.mock.calls[0][0] as { to: string; body: string }
    expect(call.to).toBe('555-0001')
    expect(call.body).toContain('2099-01-31')
  })

  it('does not send an SMS when no bookings were cancelled', async () => {
    h.store.bookings = h.store.bookings.filter((b) => b.id !== 'book-in-window')

    await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))

    expect(h.sendSMS).not.toHaveBeenCalled()
  })

  it('does not send an SMS when the tenant has no Telnyx configured', async () => {
    h.store.tenants[0].telnyx_api_key = null

    await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))

    expect(h.sendSMS).not.toHaveBeenCalled()
  })

  it('logs a schedule.paused audit event with the cancellation count', async () => {
    await POST(postReq({ paused_until: '2099-01-31' }), params('sched-A1'))

    expect(h.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-A',
        action: 'schedule.paused',
        entityId: 'sched-A1',
        details: { paused_until: '2099-01-31', bookings_cancelled: 1 },
      })
    )
  })
})

describe('DELETE /api/schedules/:id/pause — resume', () => {
  it('propagates an AuthError unchanged', async () => {
    h.getTenantForRequest.mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await DELETE(new Request('http://x'), params('sched-A1'))

    expect(res.status).toBe(401)
  })

  it('returns 404 for a schedule that does not exist', async () => {
    const res = await DELETE(new Request('http://x'), params('does-not-exist'))

    expect(res.status).toBe(404)
  })

  it("tenant A can never resume tenant B's schedule", async () => {
    h.store.recurring_schedules.find((s) => s.id === 'sched-B1')!.status = 'paused'

    const res = await DELETE(new Request('http://x'), params('sched-B1'))

    expect(res.status).toBe(404)
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-B1')?.status).toBe('paused')
  })

  it('resumes the schedule, inserts a resumed notification, and logs an audit event', async () => {
    h.store.recurring_schedules.find((s) => s.id === 'sched-A1')!.status = 'paused'

    const res = await DELETE(new Request('http://x'), params('sched-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.schedule.status).toBe('active')
    expect(json.schedule.paused_until).toBeNull()
    const notif = h.store.notifications[0]
    expect(notif.type).toBe('schedule_resumed')
    expect(notif.message).toContain('Alice')
    expect(h.audit).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-A', action: 'schedule.updated', entityId: 'sched-A1', details: { resumed: true } })
    )
  })
})
