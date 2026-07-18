/**
 * POST /api/team-portal/jobs/reassign — concurrent-reassign race.
 *
 * The route read `bookings.team_member_id` (as `previous`), then unconditionally
 * wrote `team_member_id: to_member_id` keyed only on `id`+`tenant_id` — no CAS
 * guard re-asserting the row still held `previous` at write time, unlike every
 * other team_member_id write site fixed this session (claim's `.is('team_member_id',
 * null)`, deal-stage/quote-accept's `.eq('stage', dealRow.stage)`, etc).
 *
 * Two managers reassigning the SAME job to two different targets within the
 * same request window can interleave: both read the same `previous`, both
 * writes land (last one wins on bookings.team_member_id), but the
 * booking_team_members delete+upsert pair for each request is a SEPARATE,
 * unguarded statement pair — if the loser's delete+upsert lands after the
 * winner's, booking_team_members.lead ends up pointing at a DIFFERENT member
 * than bookings.team_member_id. That's the exact bookings/booking_team_members
 * desync class already fixed everywhere else this session, just reachable here
 * via a write-write race instead of a missing sync.
 *
 * FIX: CAS the bookings update on the pre-read team_member_id (`.eq(...)` when
 * non-null, `.is(..., null)` when null, matching claim's own null-handling) and
 * return 409 with the booking's real current assignee when the race is lost —
 * same pattern as the rest of this sweep, applied to reassign's own gap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

/** Injected right after the route's initial booking fetch resolves -- simulates
 *  a concurrent reassign (by a different manager) that already landed, both the
 *  bookings write AND its own booking_team_members sync, between this request's
 *  read and its own write. */
const afterBookingRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'bookings') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () => {
        const result = origSingle()
        return result.then((r) => {
          afterBookingRead.fn?.()
          afterBookingRead.fn = null
          return r
        })
      }
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/push', () => ({ sendPushToTeamMember: async () => {} }))

import { POST } from './route'
import { createToken } from '../../auth/token'

const TENANT_A = 'tenant-A'
const MANAGER = 'manager-1'
const OLD_LEAD = 'member-old'
const NEW_LEAD = 'member-new'
const THIRD_LEAD = 'member-third'

function req(body: unknown): Request {
  const token = createToken(MANAGER, TENANT_A, 25, 'manager')
  return new Request('http://localhost/api/team-portal/jobs/reassign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'book-1', tenant_id: TENANT_A, team_member_id: OLD_LEAD, status: 'confirmed', start_time: '2026-07-20T14:00:00' },
    ],
    team_members: [
      { id: MANAGER, tenant_id: TENANT_A, status: 'active', role: 'manager', pay_rate: 30 },
      { id: OLD_LEAD, tenant_id: TENANT_A, status: 'active', pay_rate: 22 },
      { id: NEW_LEAD, tenant_id: TENANT_A, status: 'active', pay_rate: 24 },
      { id: THIRD_LEAD, tenant_id: TENANT_A, status: 'active', pay_rate: 26 },
    ],
    booking_team_members: [
      { id: 'btm-1', tenant_id: TENANT_A, booking_id: 'book-1', team_member_id: OLD_LEAD, is_lead: true, position: 1 },
    ],
    tenants: [{ id: TENANT_A, selena_config: null }],
    crew_members: [],
  }
  afterBookingRead.fn = null
})

describe('POST /api/team-portal/jobs/reassign — concurrent reassign race', () => {
  it('rejects the write once a concurrent reassign already moved the job off the previously-read member', async () => {
    afterBookingRead.fn = () => {
      // A concurrent request already reassigned book-1 to THIRD_LEAD --
      // both its bookings write and its own booking_team_members sync
      // already landed by the time THIS request's write fires.
      h.store.bookings[0] = { ...h.store.bookings[0], team_member_id: THIRD_LEAD }
      h.store.booking_team_members = h.store.booking_team_members
        .filter((r) => !(r.booking_id === 'book-1' && r.is_lead))
        .concat([{ id: 'btm-2', tenant_id: TENANT_A, booking_id: 'book-1', team_member_id: THIRD_LEAD, is_lead: true, position: 1 }])
    }

    const res = await POST(req({ booking_id: 'book-1', to_member_id: NEW_LEAD }))
    expect(res.status).toBe(409)

    // The concurrent winner's state must survive untouched -- no desync
    // between bookings.team_member_id and the booking_team_members lead row.
    expect(h.store.bookings[0].team_member_id).toBe(THIRD_LEAD)
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe(THIRD_LEAD)
  })

  it('still reassigns normally with no concurrent writer (no regression)', async () => {
    const res = await POST(req({ booking_id: 'book-1', to_member_id: NEW_LEAD }))
    expect(res.status).toBe(200)
    expect(h.store.bookings[0].team_member_id).toBe(NEW_LEAD)
  })

  it('CAS on a null previous assignee uses IS NULL, not a blind eq(null) that never matches', async () => {
    h.store.bookings[0] = { ...h.store.bookings[0], team_member_id: null }
    h.store.booking_team_members = []

    const res = await POST(req({ booking_id: 'book-1', to_member_id: NEW_LEAD }))
    expect(res.status).toBe(200)
    expect(h.store.bookings[0].team_member_id).toBe(NEW_LEAD)
  })
})
