import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant write to `booking_assignees` via PATCH
 * /api/jobs/[id]/sessions/[sessionId] is ALREADY BLOCKED.
 *
 * See deploy-prep/join-table-ownership-audit.md §3.3. `booking_assignees` has no
 * `tenant_id`; its delete/insert is scoped by `booking_id` alone. But this route
 * calls `loadOwnedSession(tenantId, jobId, sessionId)` — which selects the booking
 * with `.eq('id', sessionId).eq('tenant_id', tenantId)` and re-checks `job_id` —
 * BEFORE any assignee write, returning 404 on any mismatch.
 *
 * This is the guard §3.1 (crews) is missing. These tests lock it: a foreign
 * sessionId 404s and leaves the victim's assignees untouched, while the SAME
 * payload for the owning tenant does write — proving ownership (not something
 * incidental) is what blocks the cross-tenant path.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], tenant: 'tid-a' }))
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
      tenantId: holder.tenant,
      tenant: { id: holder.tenant },
      role: 'owner',
    })),
  }
})

// Side-effect helpers — irrelevant to the join-table guard, stubbed to no-ops.
vi.mock('@/lib/jobs', () => ({
  logJobEvent: vi.fn(async () => {}),
  releasePaymentsForEvent: vi.fn(async () => {}),
  shapeSession: (row: { id: string }) => ({ id: row.id }),
}))

import { PATCH } from './route'

const CTX_TENANT = 'tid-a' // attacker / owner depending on the case
const OTHER_TENANT = 'tid-b' // victim

function seed() {
  return {
    bookings: [
      { id: 'booking-a', tenant_id: CTX_TENANT, job_id: 'job-a', start_time: null, end_time: null, status: 'confirmed' },
      { id: 'booking-b', tenant_id: OTHER_TENANT, job_id: 'job-b', start_time: null, end_time: null, status: 'confirmed' },
    ],
    team_members: [{ id: 'tm-a1', tenant_id: CTX_TENANT, name: 'A-One' }],
    booking_assignees: [
      { booking_id: 'booking-b', team_member_id: 'tm-b1' },
      { booking_id: 'booking-b', team_member_id: 'tm-b2' },
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
  holder.tenant = CTX_TENANT
})

describe('session PATCH — booking_assignees cross-tenant WITNESS (already blocked)', () => {
  it('BLOCKED: attacker (tenant A) reassigning tenant B\'s booking 404s and leaves assignees untouched', async () => {
    holder.tenant = CTX_TENANT // caller is tenant A
    const res = await PATCH(patchReq({ assignee_ids: ['tm-a1'] }), ctx('job-b', 'booking-b'))

    expect(res.status).toBe(404)

    // Victim's assignees are intact — the guard fired before any join write.
    const victim = h.seed.booking_assignees.filter((r) => r.booking_id === 'booking-b')
    expect(victim).toHaveLength(2)
    expect(h.capture.deletes.some((d) => d.table === 'booking_assignees')).toBe(false)
    expect(h.capture.inserts.some((i) => i.table === 'booking_assignees')).toBe(false)
  })

  it('CONTROL: the SAME payload for the owning tenant DOES write — proving ownership is the gate', async () => {
    holder.tenant = CTX_TENANT // caller owns booking-a
    const res = await PATCH(patchReq({ assignee_ids: ['tm-a1'] }), ctx('job-a', 'booking-a'))

    expect(res.status).toBe(200)

    // Owner's assignee set was rewritten via booking_assignees delete+insert.
    expect(h.capture.deletes.some((d) => d.table === 'booking_assignees')).toBe(true)
    const ins = h.capture.inserts.find((i) => i.table === 'booking_assignees')
    expect(ins).toBeTruthy()
    expect(ins!.rows.map((r) => r.team_member_id)).toContain('tm-a1')
  })
})
