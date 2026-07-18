/**
 * POST /api/team-portal/jobs/reassign — booking_team_members lead-sync error
 * handling.
 *
 * The upsert that syncs the new lead into booking_team_members was
 * previously fire-and-forget: its `{ error }` was never read. A concurrent
 * writer to the SAME booking's team (PUT /api/bookings/[id]/team, which does
 * its own delete-all+insert-all of booking_team_members) can land a
 * competing is_lead=true row between THIS route's delete and its own
 * upsert -- the DB-level backstop added in
 * 2026_07_18_booking_team_members_one_lead_per_booking.sql (at most one
 * is_lead=true row per booking) then rejects the upsert with 23505. Left
 * unchecked, that failure was silently swallowed and the booking was left
 * with NO is_lead row at all (this route's own delete already ran) --
 * closeout-summary only falls back to bookings.team_member_id when
 * booking_team_members has ZERO rows for the booking, not merely zero
 * is_lead rows, so a multi-tech job in that state would silently misattribute
 * the lead's tip-share remainder to nobody.
 *
 * FIX: capture the upsert's error and retry once (delete is_lead rows again,
 * then upsert again) -- the collision is a transient leftover from a writer
 * that just finished, so a single retry clears it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

/** When > 0, the next N booking_team_members upserts fail with a simulated
 *  23505 (the new unique-index conflict) instead of actually writing. */
const failNextUpserts = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'booking_team_members') return chain
      const origUpsert = chain.upsert as (payload: unknown, opts?: unknown) => unknown
      chain.upsert = (payload: unknown, opts?: unknown) => {
        if (failNextUpserts.count > 0) {
          failNextUpserts.count -= 1
          return {
            then: (res: (v: unknown) => unknown) =>
              Promise.resolve(res({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "booking_team_members_one_lead_per_booking"' } })),
          }
        }
        return origUpsert(payload, opts)
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
    ],
    booking_team_members: [
      { id: 'btm-1', tenant_id: TENANT_A, booking_id: 'book-1', team_member_id: OLD_LEAD, is_lead: true, position: 1 },
    ],
    tenants: [{ id: TENANT_A, selena_config: null }],
    crew_members: [],
  }
  failNextUpserts.count = 0
})

describe('POST /api/team-portal/jobs/reassign — lead-sync error handling', () => {
  it('retries once and succeeds when the first upsert hits a transient unique-index conflict', async () => {
    failNextUpserts.count = 1
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(req({ booking_id: 'book-1', to_member_id: NEW_LEAD }))
    expect(res.status).toBe(200)

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows).toHaveLength(1)
    expect(leadRows[0].team_member_id).toBe(NEW_LEAD)
    // The transient failure was recovered by the retry -- no error logged.
    expect(errSpy).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('logs loudly (does not silently swallow) if the retry ALSO fails, without failing the whole request', async () => {
    failNextUpserts.count = 2
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(req({ booking_id: 'book-1', to_member_id: NEW_LEAD }))

    // bookings.team_member_id is the authoritative CAS'd write and already
    // succeeded -- the request itself should not fail just because the
    // best-effort booking_team_members sync couldn't recover.
    expect(res.status).toBe(200)
    expect(h.store.bookings[0].team_member_id).toBe(NEW_LEAD)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('still syncs the lead row normally with no conflict (no regression)', async () => {
    const res = await POST(req({ booking_id: 'book-1', to_member_id: NEW_LEAD }))
    expect(res.status).toBe(200)
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows).toHaveLength(1)
    expect(leadRows[0].team_member_id).toBe(NEW_LEAD)
  })
})
