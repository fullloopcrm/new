import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/schedules/[id]/pause (POST + DELETE, converted to
 * tenantDb).
 *
 * The schedule update (and the bookings it cancels) now run through tenantDb,
 * so a schedule id belonging to a FOREIGN tenant resolves to "Schedule not
 * found" (404) and neither the schedule nor its bookings are ever touched.
 */

const A = 'tid-a'
const B = 'tid-b'

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

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST, DELETE } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'sch-a1', tenant_id: A, status: 'active', paused_until: null, recurring_type: 'weekly', clients: undefined },
      { id: 'sch-b1', tenant_id: B, status: 'active', paused_until: null, recurring_type: 'weekly', clients: undefined },
    ],
    bookings: [
      { id: 'bk-a1', tenant_id: A, schedule_id: 'sch-a1', status: 'scheduled', start_time: '2026-08-01T00:00:00Z' },
      { id: 'bk-b1', tenant_id: B, schedule_id: 'sch-b1', status: 'scheduled', start_time: '2026-08-01T00:00:00Z' },
    ],
    notifications: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function pauseReq(paused_until = '2026-09-01') {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({ paused_until }) })
}

describe('schedules/[id]/pause — tenant isolation', () => {
  it("POST pauses the acting tenant's own schedule and cancels its bookings only", async () => {
    const res = await POST(pauseReq(), params('sch-a1'))
    expect(res.status).toBe(200)

    const ownBooking = h.seed.bookings.find((b) => b.id === 'bk-a1')!
    expect(ownBooking.status).toBe('cancelled')
    const foreignBooking = h.seed.bookings.find((b) => b.id === 'bk-b1')!
    expect(foreignBooking.status).toBe('scheduled')
  })

  it("WRONG-TENANT PROBE: POST against a foreign tenant's schedule id returns 404, nothing paused", async () => {
    const res = await POST(pauseReq(), params('sch-b1'))
    expect(res.status).toBe(404)

    const foreign = h.seed.recurring_schedules.find((s) => s.id === 'sch-b1')!
    expect(foreign.status).toBe('active')
    const foreignBooking = h.seed.bookings.find((b) => b.id === 'bk-b1')!
    expect(foreignBooking.status).toBe('scheduled')
  })

  it("WRONG-TENANT PROBE: DELETE (resume) against a foreign tenant's schedule id returns 404", async () => {
    h.seed.recurring_schedules.find((s) => s.id === 'sch-b1')!.status = 'paused'
    const res = await DELETE(new Request('http://t', { method: 'DELETE' }), params('sch-b1'))
    expect(res.status).toBe(404)

    const foreign = h.seed.recurring_schedules.find((s) => s.id === 'sch-b1')!
    expect(foreign.status).toBe('paused')
  })

  it('DELETE resumes the acting tenant\'s own schedule', async () => {
    h.seed.recurring_schedules.find((s) => s.id === 'sch-a1')!.status = 'paused'
    const res = await DELETE(new Request('http://t', { method: 'DELETE' }), params('sch-a1'))
    expect(res.status).toBe(200)
    const own = h.seed.recurring_schedules.find((s) => s.id === 'sch-a1')!
    expect(own.status).toBe('active')
  })
})
