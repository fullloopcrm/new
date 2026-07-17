import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/team-portal/jobs/release — checked-in guard (P1/W2 fresh-ground).
 *
 * BUG: release unconditionally set team_member_id=null, status='scheduled' on
 * any booking currently assigned to the caller — with NO check on whether the
 * caller had already checked in. checkin/route.ts blocks on ANY existing
 * check_in_time ("Already checked in"), regardless of who set it. So a member
 * who checks in (same-day, before their booking's own start_time — checkin
 * only compares the DATE, not time-of-day) and then releases the job (real UI
 * path: crew/schedule shows any booking with start_time >= now, which an
 * early check-in on a later-today booking still satisfies) hands the next
 * claimant a booking with check_in_time already stamped from the FIRST
 * member. The next claimant can never check themselves in — permanently
 * blocked — and if they check out anyway, hours/pay compute off the wrong
 * worker's stale check-in timestamp.
 *
 * FIX: the release UPDATE now also requires check_in_time IS NULL; if that's
 * why it didn't match, the caller gets a clear 409 instead of silently
 * corrupting the booking.
 */

const TENANT = 'tid-a'
const MEMBER = 'member-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: vi.fn(async () => ({
    auth: { id: MEMBER, tid: TENANT, role: 'worker' },
    error: null,
  })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-not-checked-in', tenant_id: TENANT, team_member_id: MEMBER, status: 'confirmed', check_in_time: null },
      { id: 'bk-checked-in', tenant_id: TENANT, team_member_id: MEMBER, status: 'in_progress', check_in_time: '2026-07-16T13:00:00Z' },
      { id: 'bk-someone-elses', tenant_id: TENANT, team_member_id: 'other-member', status: 'confirmed', check_in_time: null },
    ],
  }
}

function req(bookingId: string) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify({ booking_id: bookingId }) }))
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('team-portal/jobs/release POST — checked-in guard', () => {
  it('CONTROL: releasing a not-yet-checked-in job still works', async () => {
    const res = await req('bk-not-checked-in')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.team_member_id).toBeNull()
    expect(body.booking.status).toBe('scheduled')
  })

  it('BLOCKED: releasing an already-checked-in job 409s, booking (and check_in_time) untouched', async () => {
    const res = await req('bk-checked-in')
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already checked in/i)

    const untouched = h.seed.bookings.find((b) => b.id === 'bk-checked-in')
    expect(untouched?.team_member_id).toBe(MEMBER)
    expect(untouched?.check_in_time).toBe('2026-07-16T13:00:00Z')
    expect(untouched?.status).toBe('in_progress')
  })

  it('releasing a job not assigned to the caller still 403s (not the check-in message)', async () => {
    const res = await req('bk-someone-elses')
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Not your job to release')
  })

  it('releasing a nonexistent booking 403s', async () => {
    const res = await req('bk-does-not-exist')
    expect(res.status).toBe(403)
  })
})
