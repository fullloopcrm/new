import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/jobs/[id]/sessions (POST, converted to tenantDb).
 *
 * The job lookup + the assignee validation (`team_members`) + the created
 * booking now all run through tenantDb, so a job id belonging to a FOREIGN
 * tenant resolves to "Job not found" (404) and a foreign team_member_id in
 * the body is silently dropped from the assignee set instead of being
 * attached to the acting tenant's new booking.
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

import { POST } from './route'

function seed() {
  return {
    jobs: [
      { id: 'job-a1', tenant_id: A, client_id: 'cli-a', title: 'A Job' },
      { id: 'job-b1', tenant_id: B, client_id: 'cli-b', title: 'B Job' },
    ],
    team_members: [
      { id: 'tm-a1', tenant_id: A, name: 'A Tech' },
      { id: 'tm-b1', tenant_id: B, name: 'B Tech' },
    ],
    bookings: [] as Record<string, unknown>[],
    booking_assignees: [] as Record<string, unknown>[],
    job_events: [] as Record<string, unknown>[],
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
function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

describe('jobs/[id]/sessions — tenant isolation', () => {
  it("POST creates a booking on the acting tenant's own job, stamped to that tenant", async () => {
    const res = await POST(req({ start_time: '2026-08-01T09:00:00Z', team_member_id: 'tm-a1' }), params('job-a1'))
    expect(res.status).toBe(200)

    const inserted = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(inserted!.rows[0].tenant_id).toBe(A)
    expect(inserted!.rows[0].job_id).toBe('job-a1')
    expect(inserted!.rows[0].team_member_id).toBe('tm-a1')
  })

  it("WRONG-TENANT PROBE: POST against a foreign tenant's job id returns 404, no booking created", async () => {
    const res = await POST(req({ start_time: '2026-08-01T09:00:00Z' }), params('job-b1'))
    expect(res.status).toBe(404)

    const inserted = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(inserted).toBeUndefined()
  })

  it("WRONG-TENANT PROBE: a foreign team_member_id in the body is dropped, not assigned", async () => {
    const res = await POST(
      req({ start_time: '2026-08-01T09:00:00Z', assignee_ids: ['tm-b1'] }),
      params('job-a1'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assignees).toEqual([])

    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(bookingInsert!.rows[0].team_member_id).toBeNull()
    const assigneeInsert = h.capture.inserts.find((i) => i.table === 'booking_assignees')
    expect(assigneeInsert).toBeUndefined()
  })
})
