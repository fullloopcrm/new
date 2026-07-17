import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH /api/jobs/[id]/sessions/[sessionId] — terminated-crew guard, crew_id
 * path (P12 project-archetype depth, fresh ground off the crew-termination
 * guard itself: 86b797ad / f5715d03).
 *
 * BUG (fixed here): the terminated-member guard only ever ran against the
 * EXPLICIT assignee_ids/team_member_id list. A crew_id-sourced assignee set
 * (crews.crew_members, resolved via a join and added to the assignee Set
 * with zero check) bypassed it entirely -- crew_members isn't pruned when a
 * member is terminated, so reassigning a FUTURE session to a saved crew that
 * still lists a let-go worker silently books them, with no warning.
 *
 * FIX: the terminated check now runs against the FULL assembled assignee
 * set (crew_id members + explicit ids), not just the explicit list.
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
      { id: 'tm-active', tenant_id: A, name: 'Active Amy' },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: A, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: A, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    crews: [
      // Stale roster: Larry was on this crew before he was let go, and
      // nothing prunes crew_members on termination.
      { id: 'crew-stale', tenant_id: A, crew_members: [{ team_member_id: 'tm-terminated' }, { team_member_id: 'tm-active' }] },
      { id: 'crew-clean', tenant_id: A, crew_members: [{ team_member_id: 'tm-active' }] },
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

describe('session PATCH — terminated-crew reassignment guard via crew_id', () => {
  it('BLOCKED: reassigning to a saved crew whose roster still lists a terminated member 400s, leaves the session untouched', async () => {
    const res = await PATCH(patchReq({ crew_id: 'crew-stale' }), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('tm-terminated')

    expect(h.capture.updates.some((u) => u.table === 'bookings')).toBe(false)
    expect(h.capture.inserts.some((i) => i.table === 'booking_assignees')).toBe(false)
  })

  it('CONTROL: reassigning to a crew with no terminated members still works', async () => {
    const res = await PATCH(patchReq({ crew_id: 'crew-clean' }), ctx('job-a1', 'session-a1'))
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'booking_assignees')
    expect(ins!.rows.map((r) => r.team_member_id)).toEqual(['tm-active'])
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd!.values.crew_id).toBe('crew-clean')
  })
})
