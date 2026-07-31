import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * bsr-02: deactivating a team member (DELETE's soft-deactivate branch, or a
 * direct PUT status:'inactive') used to leave their still-future bookings
 * silently pointing at an inactive member -- nothing reassigned or even
 * flagged them. Proves flagFutureBookingsForReassignment writes a critical
 * schedule_issues row (the same table/mechanism the existing Schedule
 * Issues dashboard panel + schedule-monitor cron already use) for every
 * still-future booking the deactivated member is on, whether as the primary
 * assignee or as booking_team_members crew, and that it leaves past/
 * terminal-status bookings and already-flagged bookings alone.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const auditSpy = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: 'tenant-A',
      tenant: { id: 'tenant-A' },
      role: 'owner',
    })),
  }
})
vi.mock('@/lib/audit', () => ({ audit: auditSpy }))

import { PUT, DELETE } from './route'

const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

// Fixed far-future/far-past naive local strings so this test doesn't drift
// with real wall-clock time (route compares against `now` at call time).
const FUTURE = '2099-01-15T10:00:00'
const PAST = '2020-01-15T10:00:00'

beforeEach(() => {
  h.seq = 0
  auditSpy.mockClear()
  h.store = {
    tenants: [{ id: 'tenant-A', timezone: 'America/New_York' }],
    team_members: [
      { id: 'tm-1', tenant_id: 'tenant-A', name: 'Gloria', status: 'active' },
    ],
    bookings: [
      // Primary-assignee future booking -- must be flagged.
      { id: 'bk-future-primary', tenant_id: 'tenant-A', team_member_id: 'tm-1', status: 'scheduled', start_time: FUTURE, clients: { name: 'Alice' } },
      // Past booking on the same member -- must NOT be flagged.
      { id: 'bk-past-primary', tenant_id: 'tenant-A', team_member_id: 'tm-1', status: 'completed', start_time: PAST, clients: { name: 'Bob' } },
      // Future but cancelled -- terminal status, must NOT be flagged.
      { id: 'bk-future-cancelled', tenant_id: 'tenant-A', team_member_id: 'tm-1', status: 'cancelled', start_time: FUTURE, clients: { name: 'Carol' } },
      // Future booking where tm-1 is crew only (not primary) -- must be flagged.
      { id: 'bk-future-crew', tenant_id: 'tenant-A', team_member_id: 'tm-2', status: 'confirmed', start_time: FUTURE, clients: { name: 'Dana' } },
    ],
    booking_team_members: [
      { id: 'btm-1', tenant_id: 'tenant-A', booking_id: 'bk-future-crew', team_member_id: 'tm-1' },
    ],
    schedule_issues: [],
  }
})

describe('DELETE /api/team/[id] -- deactivation flags future bookings (bsr-02)', () => {
  it('soft-deactivates (member has booking history) and flags the future primary + crew bookings, not past/cancelled ones', async () => {
    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deactivated).toBe(true)
    expect(body.future_bookings_flagged).toBe(2) // bk-future-primary + bk-future-crew

    const flaggedIds = h.store.schedule_issues.map((i) => i.booking_id).sort()
    expect(flaggedIds).toEqual(['bk-future-crew', 'bk-future-primary'].sort())

    const issue = h.store.schedule_issues.find((i) => i.booking_id === 'bk-future-primary')
    expect(issue?.type).toBe('inactive_member_assigned')
    expect(issue?.severity).toBe('critical')
    expect(issue?.status).toBe('open')
    expect(issue?.team_member_id).toBe('tm-1')
    expect(String(issue?.message)).toContain('Gloria')

    // Past and cancelled future bookings must not be flagged.
    expect(h.store.schedule_issues.some((i) => i.booking_id === 'bk-past-primary')).toBe(false)
    expect(h.store.schedule_issues.some((i) => i.booking_id === 'bk-future-cancelled')).toBe(false)

    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'team.deactivated',
      details: expect.objectContaining({ future_bookings_flagged: 2 }),
    }))
  })

  it('does not double-flag a booking that already has an open inactive_member_assigned issue', async () => {
    // Simulate the issue already having been raised (e.g. a prior deactivate
    // call, or PUT then DELETE in sequence).
    h.store.schedule_issues.push({
      id: 'existing-issue', tenant_id: 'tenant-A', type: 'inactive_member_assigned',
      severity: 'critical', message: 'already flagged', booking_id: 'bk-future-primary',
      booking_ids: ['bk-future-primary'], team_member_id: 'tm-1', status: 'open',
    })

    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    // Still counts both affected bookings...
    expect(body.future_bookings_flagged).toBe(2)
    // ...but only inserts a NEW row for the one that wasn't already flagged.
    const primaryIssues = h.store.schedule_issues.filter((i) => i.booking_id === 'bk-future-primary')
    expect(primaryIssues.length).toBe(1) // still just the pre-existing one, no duplicate insert
    const crewIssues = h.store.schedule_issues.filter((i) => i.booking_id === 'bk-future-crew')
    expect(crewIssues.length).toBe(1)
  })
})

describe('PUT /api/team/[id] status:inactive -- same reassignment-flagging gap, second entry point (bsr-02)', () => {
  it('flags future bookings when status is set to inactive directly via PUT', async () => {
    const res = await PUT(putReq({ status: 'inactive' }), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.future_bookings_flagged).toBe(2)
    expect(h.store.schedule_issues.length).toBe(2)
  })

  it('does not flag anything for a normal profile-field PUT that leaves status untouched', async () => {
    const res = await PUT(putReq({ name: 'Gloria M.' }), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.future_bookings_flagged).toBe(0)
    expect(h.store.schedule_issues.length).toBe(0)
  })
})
