import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * jobs/[id]/sessions/[sessionId] PATCH + DELETE — permission probe.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest(), which
 * succeeds for ANY tenant_members row regardless of role. A job session is a
 * `bookings` row (carries job_id) — the sibling bookings/[id] PATCH/DELETE
 * gate on bookings.edit/bookings.delete, but this route never got the same
 * treatment, so 'staff' (no bookings.edit) could reschedule/reassign/complete
 * any session, and 'manager' (no bookings.delete either) could delete one.
 *
 * FIX: requirePermission('bookings.edit') on PATCH, requirePermission
 * ('bookings.delete') on DELETE, matching bookings/[id]'s exact convention.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

vi.mock('@/lib/jobs', () => ({
  logJobEvent: vi.fn(async () => {}),
  releasePaymentsForEvent: vi.fn(async () => {}),
  shapeSession: (row: { id: string }) => ({ id: row.id }),
}))

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so 'staff'/'manager' are denied by the ACTUAL permission table, not a stub.
import { PATCH, DELETE } from './route'

function seed() {
  return {
    bookings: [
      { id: 'session-a1', tenant_id: A, job_id: 'job-a1', start_time: null, end_time: null, status: 'confirmed' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

function ctx(id: string, sessionId: string) {
  return { params: Promise.resolve({ id, sessionId }) }
}
function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

describe('jobs/[id]/sessions/[sessionId] — permission probe', () => {
  it('owner can reschedule a session', async () => {
    const res = await PATCH(req({ start_time: '2026-08-02T10:00:00Z' }), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: PATCH — 'staff' (no bookings.edit) is forbidden, session unchanged", async () => {
    roleHolder.role = 'staff'
    const res = await PATCH(req({ status: 'completed' }), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(403)
    const own = h.seed.bookings.find((b) => b.id === 'session-a1')!
    expect(own.status).toBe('confirmed')
  })

  it('owner can delete a session', async () => {
    const res = await DELETE(req({}), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: DELETE — 'manager' (no bookings.delete) is forbidden, session survives", async () => {
    roleHolder.role = 'manager'
    const res = await DELETE(req({}), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(403)
    expect(h.seed.bookings.find((b) => b.id === 'session-a1')).toBeTruthy()
  })

  it("PERMISSION PROBE: DELETE — 'staff' (no bookings.delete) is forbidden, session survives", async () => {
    roleHolder.role = 'staff'
    const res = await DELETE(req({}), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(403)
    expect(h.seed.bookings.find((b) => b.id === 'session-a1')).toBeTruthy()
  })
})
