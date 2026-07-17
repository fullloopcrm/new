import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/jobs/[id]/sessions — terminated-crew guard, crew_id path (P12
 * project-archetype depth, fresh ground off the crew-termination guard
 * itself: 86b797ad / f5715d03).
 *
 * BUG (fixed here): the terminated-member guard only ever ran against the
 * EXPLICIT assignee_ids/team_member_id list. A crew_id-sourced assignee set
 * (crews.crew_members, resolved via a join and added to the assignee Set
 * with zero check) bypassed it entirely -- crew_members isn't pruned when a
 * member is terminated, so scheduling a NEW session for a saved crew that
 * still lists a let-go worker silently books them, with no warning and no
 * signal the crew that showed up on paper doesn't match who's actually
 * still employed.
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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/jobs', () => ({
  logJobEvent: vi.fn(async () => {}),
}))

import { POST } from './route'

function seed() {
  return {
    jobs: [{ id: 'job-a1', tenant_id: A, client_id: 'cli-a', title: 'A Job' }],
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
    bookings: [] as Record<string, unknown>[],
    booking_assignees: [] as Record<string, unknown>[],
    job_events: [] as Record<string, unknown>[],
  }
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('jobs/[id]/sessions POST — terminated-crew guard via crew_id', () => {
  it('BLOCKED: scheduling a saved crew whose roster still lists a terminated member 400s, no booking created', async () => {
    const res = await POST(
      req({ start_time: '2026-08-01T09:00:00Z', crew_id: 'crew-stale' }),
      params('job-a1'),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('tm-terminated')

    expect(h.capture.inserts.some((i) => i.table === 'bookings')).toBe(false)
    expect(h.capture.inserts.some((i) => i.table === 'booking_assignees')).toBe(false)
  })

  it('CONTROL: scheduling a crew with no terminated members still works', async () => {
    const res = await POST(
      req({ start_time: '2026-08-01T09:00:00Z', crew_id: 'crew-clean' }),
      params('job-a1'),
    )
    expect(res.status).toBe(200)
    const inserted = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(inserted!.rows[0].crew_id).toBe('crew-clean')
    const assignees = h.capture.inserts.find((i) => i.table === 'booking_assignees')
    expect(assignees!.rows.map((r) => r.team_member_id)).toEqual(['tm-active'])
  })
})
