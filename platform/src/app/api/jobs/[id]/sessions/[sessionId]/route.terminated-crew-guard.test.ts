import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH /api/jobs/[id]/sessions/[sessionId] — terminated-crew reassignment
 * guard (P12 project-archetype depth: a crew member let go mid-project must
 * not silently get reassigned to a FUTURE session).
 *
 * BUG (fixed here): the reassignment path only checked the explicit
 * assignee_ids/team_member_id against team_members (tenant + existence), never
 * against hr_employee_profiles.hr_status. A terminated worker could be
 * reassigned to any remaining session with zero warning -- the operator would
 * have no signal the crew they just scheduled no longer works there.
 *
 * FIX: reject with 400 when any explicit assignee is hr_status='terminated'.
 * 'on_leave' is deliberately NOT blocked -- still employed, may return
 * mid-project.
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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: 'owner',
    })),
  }
})

vi.mock('@/lib/jobs', () => ({
  logJobEvent: vi.fn(async () => {}),
  releasePaymentsForEvent: vi.fn(async () => {}),
  shapeSession: (row: { id: string }) => ({ id: row.id }),
}))

import { PATCH } from './route'

function seed() {
  return {
    bookings: [
      { id: 'session-a1', tenant_id: A, job_id: 'job-a1', start_time: null, end_time: null, status: 'confirmed' },
    ],
    team_members: [
      { id: 'tm-terminated', tenant_id: A, name: 'Let Go Larry' },
      { id: 'tm-on-leave', tenant_id: A, name: 'On Leave Olivia' },
      { id: 'tm-active', tenant_id: A, name: 'Active Amy' },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: A, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: A, team_member_id: 'tm-on-leave', hr_status: 'on_leave' },
      { id: 'p3', tenant_id: A, team_member_id: 'tm-active', hr_status: 'active' },
    ],
  }
}

function ctx(id: string, sessionId: string) {
  return { params: Promise.resolve({ id, sessionId }) }
}
function patchReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('session PATCH — terminated-crew reassignment guard', () => {
  it('BLOCKED: reassigning a terminated team member 400s and leaves the session untouched', async () => {
    const res = await PATCH(patchReq({ team_member_id: 'tm-terminated' }), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('tm-terminated')

    expect(h.capture.updates.some((u) => u.table === 'bookings')).toBe(false)
    expect(h.capture.inserts.some((i) => i.table === 'booking_assignees')).toBe(false)
  })

  it('ALLOWED: an on_leave team member can still be assigned (still employed)', async () => {
    const res = await PATCH(patchReq({ team_member_id: 'tm-on-leave' }), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'booking_assignees')
    expect(ins!.rows.map((r) => r.team_member_id)).toContain('tm-on-leave')
  })

  it('CONTROL: an active team member is assigned normally', async () => {
    const res = await PATCH(patchReq({ team_member_id: 'tm-active' }), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'booking_assignees')
    expect(ins!.rows.map((r) => r.team_member_id)).toContain('tm-active')
  })

  it('BLOCKED: one terminated member among several assignee_ids blocks the whole reassignment', async () => {
    const res = await PATCH(
      patchReq({ assignee_ids: ['tm-active', 'tm-terminated'] }),
      ctx('job-a1', 'session-a1'),
    )
    expect(res.status).toBe(400)
    expect(h.capture.inserts.some((i) => i.table === 'booking_assignees')).toBe(false)
  })
})
