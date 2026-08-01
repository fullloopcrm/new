import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * bsr-02 (upgraded 2026-08-01 from flag-only, commit f8431cc6e): deactivating
 * a team member now tries REAL auto-reassignment of their still-future
 * bookings to another active, same-tenant, actually-available replacement
 * (via the real scoreTeamForBooking/pickBestTeam engine in smart-schedule.ts
 * -- the same engine normal booking creation and the recurring cron use, not
 * a second hand-rolled matcher). Only when no candidate is available does it
 * fall back to the original flag-for-human-review behavior (a critical
 * schedule_issues row).
 *
 * Runs against the REAL reassignOrFlagFutureBookings + REAL
 * scoreTeamForBooking/pickBestTeam + REAL day-availability/service-zones
 * logic. Only the network-hitting geocoder (geo.ts geocodeAddress) and push
 * notifications are mocked -- same pattern as smart-schedule.test.ts.
 *
 * Covers:
 *   - successful auto-reassign: a genuinely available second team member
 *     picks up a deactivated primary's future booking; bookings.team_member_id
 *     is updated, no schedule_issues row is written, and the reassignment is
 *     audited.
 *   - no-candidate-available: falls back to exactly the original flag
 *     behavior (schedule_issues row, still-future primary + crew bookings).
 *   - tenant scoping: a team member on a DIFFERENT tenant who would
 *     otherwise be a perfect candidate is never picked -- scoreTeamForBooking
 *     scopes its own team_members query by tenant_id, so cross-tenant
 *     candidates can't leak in even when they're the only "available" option.
 *   - past/cancelled bookings left alone; no double-flagging on repeat
 *     deactivation; both PUT status:'inactive' and DELETE entry points.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const auditSpy = vi.hoisted(() => vi.fn(async () => {}))
const pushSpy = vi.hoisted(() => vi.fn(async () => {}))

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
vi.mock('@/lib/push', () => ({ sendPushToTeamMember: pushSpy }))
// scoreTeamForBooking geocodes when it doesn't already have coords -- that's
// a real network call (Census/Nominatim). Mocked out exactly like
// smart-schedule.test.ts; every fixture below uses empty client addresses so
// zone/car gating (which is purely string-based) never engages, and coord-
// dependent scoring (proximity/clustering/home-by) just skips, same as a
// team member with no address on file.
vi.mock('@/lib/geo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/geo')>()
  return { ...actual, geocodeAddress: vi.fn().mockResolvedValue(null) }
})

import { PUT, DELETE } from './route'

const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

// Fixed far-future/far-past naive local strings so this test doesn't drift
// with real wall-clock time (route compares against `now` at call time).
const FUTURE = '2099-01-15T10:00:00'
const FUTURE_END = '2099-01-15T13:00:00'
const PAST = '2020-01-15T10:00:00'

beforeEach(() => {
  h.seq = 0
  auditSpy.mockClear()
  pushSpy.mockClear()
  h.store = {
    tenants: [{ id: 'tenant-A', timezone: 'America/New_York' }],
    team_members: [
      { id: 'tm-1', tenant_id: 'tenant-A', name: 'Gloria', status: 'active', working_days: ['0', '1', '2', '3', '4', '5', '6'] },
    ],
    bookings: [
      // Primary-assignee future booking -- must be flagged.
      { id: 'bk-future-primary', tenant_id: 'tenant-A', team_member_id: 'tm-1', status: 'scheduled', start_time: FUTURE, end_time: FUTURE_END, clients: { name: 'Alice' } },
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

describe('DELETE /api/team/[id] -- no available replacement falls back to flagging (bsr-02)', () => {
  it('soft-deactivates (member has booking history) and flags the future primary + crew bookings, not past/cancelled ones', async () => {
    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deactivated).toBe(true)
    expect(body.future_bookings_reassigned).toBe(0) // tm-1 is the ONLY team member on tenant-A -- nobody to reassign to
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
      details: expect.objectContaining({ future_bookings_reassigned: 0, future_bookings_flagged: 2 }),
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

describe('PUT /api/team/[id] status:inactive -- same reassign-or-flag gap, second entry point (bsr-02)', () => {
  it('flags future bookings when status is set to inactive directly via PUT (no replacement available)', async () => {
    const res = await PUT(putReq({ status: 'inactive' }), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.future_bookings_reassigned).toBe(0)
    expect(body.future_bookings_flagged).toBe(2)
    expect(h.store.schedule_issues.length).toBe(2)
  })

  it('does not flag or reassign anything for a normal profile-field PUT that leaves status untouched', async () => {
    const res = await PUT(putReq({ name: 'Gloria M.' }), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.future_bookings_reassigned).toBe(0)
    expect(body.future_bookings_flagged).toBe(0)
    expect(h.store.schedule_issues.length).toBe(0)
  })
})

describe('bsr-02 real auto-reassignment', () => {
  it('auto-reassigns a primary-assignee future booking to a real available replacement instead of flagging it', async () => {
    // tm-3: a second, genuinely available active member on the SAME tenant --
    // works every day, no schedule/zone constraints, no conflicting bookings.
    h.store.team_members.push({ id: 'tm-3', tenant_id: 'tenant-A', name: 'Marcus', status: 'active', working_days: ['0', '1', '2', '3', '4', '5', '6'], pay_rate: 25 })

    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.future_bookings_reassigned).toBe(1) // bk-future-primary picked up tm-3
    expect(body.future_bookings_flagged).toBe(1) // bk-future-crew still has nobody else available

    const reassignedBooking = h.store.bookings.find((b) => b.id === 'bk-future-primary')
    expect(reassignedBooking?.team_member_id).toBe('tm-3')

    // Reassigned booking must NOT also get a human-review flag.
    expect(h.store.schedule_issues.some((i) => i.booking_id === 'bk-future-primary')).toBe(false)
    // The still-unreassignable crew booking still falls back to flagging.
    expect(h.store.schedule_issues.some((i) => i.booking_id === 'bk-future-crew')).toBe(true)

    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'booking.updated',
      entityId: 'bk-future-primary',
      details: expect.objectContaining({ event: 'auto_reassigned_on_deactivation', from: 'tm-1', to: 'tm-3' }),
    }))
    expect(pushSpy).toHaveBeenCalledWith('tm-3', expect.any(String), expect.any(String), expect.any(String))
  })

  it('auto-reassigns a crew-only booking by swapping the deactivated member out of booking_team_members', async () => {
    h.store.team_members.push({ id: 'tm-3', tenant_id: 'tenant-A', name: 'Marcus', status: 'active', working_days: ['0', '1', '2', '3', '4', '5', '6'] })
    // Remove the primary-assignee booking so this test isolates the crew path.
    h.store.bookings = h.store.bookings.filter((b) => b.id !== 'bk-future-primary')

    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()

    expect(body.future_bookings_reassigned).toBe(1)
    expect(body.future_bookings_flagged).toBe(0)

    const crewLinks = h.store.booking_team_members.filter((r) => r.booking_id === 'bk-future-crew')
    expect(crewLinks.some((r) => r.team_member_id === 'tm-1')).toBe(false) // old member removed
    expect(crewLinks.some((r) => r.team_member_id === 'tm-3')).toBe(true) // new member added
  })

  it('never picks a candidate from a different tenant, even when they are otherwise a perfect fit', async () => {
    // tm-cross belongs to tenant-B, not tenant-A -- scoreTeamForBooking's own
    // team_members query is `.eq('tenant_id', tenantId)`, so this member must
    // never be considered, no matter how available they look.
    h.store.team_members.push({ id: 'tm-cross', tenant_id: 'tenant-B', name: 'Wrong Tenant', status: 'active', working_days: ['0', '1', '2', '3', '4', '5', '6'] })

    const res = await DELETE(new Request('http://x'), paramsFor('tm-1'))
    const body = await res.json()

    // Falls back to flagging exactly as if tm-cross didn't exist at all --
    // tenant-A genuinely has nobody else.
    expect(body.future_bookings_reassigned).toBe(0)
    expect(body.future_bookings_flagged).toBe(2)

    const reassignedBooking = h.store.bookings.find((b) => b.id === 'bk-future-primary')
    expect(reassignedBooking?.team_member_id).toBe('tm-1') // untouched -- team_member_id wasn't changed to tm-cross

    // tm-cross's own tenant data is completely unaffected.
    expect(h.store.booking_team_members.some((r) => r.team_member_id === 'tm-cross')).toBe(false)
    expect(pushSpy).not.toHaveBeenCalledWith('tm-cross', expect.any(String), expect.any(String), expect.any(String))
  })
})
