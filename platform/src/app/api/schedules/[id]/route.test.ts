import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/PUT/DELETE /api/schedules/:id — first route-level regression test
 * (P1/W1 O13 sweep). Zero prior coverage of tenant isolation on a
 * caller-supplied schedule id, or the DELETE guard scope (only future
 * scheduled/confirmed bookings get cancelled).
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
  audit: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
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

import { GET, PUT, DELETE } from './route'
import { AuthError } from '@/lib/tenant-query'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

const FUTURE = new Date(Date.now() + 7 * 86_400_000).toISOString()
const PAST = new Date(Date.now() - 7 * 86_400_000).toISOString()

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: 'owner' }))
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', client_id: 'client-A1', recurring_type: 'weekly', status: 'active' },
      { id: 'sched-B1', tenant_id: 'tenant-B', client_id: 'client-B1', recurring_type: 'weekly', status: 'active' },
    ],
    bookings: [
      { id: 'book-future', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: FUTURE },
      { id: 'book-past', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: PAST },
      { id: 'book-completed', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'completed', start_time: FUTURE },
      { id: 'book-pending', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'pending', start_time: FUTURE },
      { id: 'book-B1', tenant_id: 'tenant-B', schedule_id: 'sched-B1', status: 'scheduled', start_time: FUTURE },
    ],
  }
})

describe('GET /api/schedules/:id', () => {
  it('propagates an AuthError unchanged', async () => {
    h.getTenantForRequest.mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await GET(new Request('http://x'), params('sched-A1'))

    expect(res.status).toBe(401)
  })

  it('returns 404 for a schedule that does not exist', async () => {
    const res = await GET(new Request('http://x'), params('does-not-exist'))

    expect(res.status).toBe(404)
  })

  it("tenant A can never fetch tenant B's schedule", async () => {
    const res = await GET(new Request('http://x'), params('sched-B1'))

    expect(res.status).toBe(404)
  })

  it("returns the schedule with its own tenant's bookings only", async () => {
    const res = await GET(new Request('http://x'), params('sched-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.schedule.id).toBe('sched-A1')
    const ids = json.bookings.map((b: { id: string }) => b.id)
    expect(ids.sort()).toEqual(['book-completed', 'book-future', 'book-past', 'book-pending'])
  })
})

describe('PUT /api/schedules/:id', () => {
  it('updates the schedule and logs a schedule.updated audit event', async () => {
    const res = await PUT(putReq({ notes: 'call before arriving' }), params('sched-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.schedule.notes).toBe('call before arriving')
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-A', action: 'schedule.updated', entityId: 'sched-A1' }))
  })

  it("tenant A can never update tenant B's schedule", async () => {
    const res = await PUT(putReq({ notes: 'hacked' }), params('sched-B1'))

    expect(res.status).toBe(500)
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-B1')?.notes).toBeUndefined()
  })

  it('ignores a tenant_id in the body instead of reassigning the schedule to another tenant', async () => {
    const res = await PUT(putReq({ notes: 'hacked', tenant_id: 'tenant-B' }), params('sched-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.schedule.tenant_id).toBe('tenant-A')
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-A1')?.tenant_id).toBe('tenant-A')
  })

  it('ignores an id field in the body instead of mass-assigning arbitrary/unknown columns onto the row', async () => {
    const res = await PUT(putReq({ notes: 'hacked', id: 'sched-B1', client_id: 'client-B1', status: 'cancelled' }), params('sched-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.schedule.id).toBe('sched-A1')
    expect(json.schedule.client_id).toBe('client-A1') // unchanged — not in the allowlist
    expect(json.schedule.status).toBe('active') // unchanged — not in the allowlist
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-A1')).toBeDefined()
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-B1')?.notes).toBeUndefined()
  })
})

describe('DELETE /api/schedules/:id', () => {
  it('cancels only future scheduled/confirmed bookings for this schedule, leaving completed and past bookings untouched', async () => {
    const res = await DELETE(new Request('http://x'), params('sched-A1'))

    expect(res.status).toBe(200)
    expect(h.store.bookings.find((b) => b.id === 'book-future')?.status).toBe('cancelled')
    expect(h.store.bookings.find((b) => b.id === 'book-past')?.status).toBe('scheduled')
    expect(h.store.bookings.find((b) => b.id === 'book-completed')?.status).toBe('completed')
  })

  it('also cancels future pending bookings (unassigned occurrences of a new/no-cleaner-yet series)', async () => {
    const res = await DELETE(new Request('http://x'), params('sched-A1'))

    expect(res.status).toBe(200)
    expect(h.store.bookings.find((b) => b.id === 'book-pending')?.status).toBe('cancelled')
  })

  it('marks the schedule cancelled and logs a schedule.deleted audit event', async () => {
    const res = await DELETE(new Request('http://x'), params('sched-A1'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-A1')?.status).toBe('cancelled')
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-A', action: 'schedule.deleted', entityId: 'sched-A1' }))
  })

  it("tenant A deleting tenant B's schedule id never cancels tenant B's booking or schedule", async () => {
    const res = await DELETE(new Request('http://x'), params('sched-B1'))

    expect(res.status).toBe(200)
    expect(h.store.bookings.find((b) => b.id === 'book-B1')?.status).toBe('scheduled')
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-B1')?.status).toBe('active')
  })
})
