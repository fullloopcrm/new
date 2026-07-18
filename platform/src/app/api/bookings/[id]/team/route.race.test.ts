/**
 * PUT /api/bookings/[id]/team — write-write races.
 *
 * Two gaps fixed together:
 *
 * 1. No CAS on the bookings.team_member_id write. Every other
 *    team_member_id write site this session (claim, reassign,
 *    cron/generate-recurring's refill, the regenerate route, the admin
 *    exception reassign path) re-asserts the pre-read value in its own
 *    WHERE; this route did a blind `.update(...).eq('id', id)`. Two
 *    concurrent PUTs (or a race against team-portal/jobs/reassign, which
 *    writes both tables independently) can interleave so the loser's
 *    booking_team_members sync lands AFTER the winner's, desyncing
 *    bookings.team_member_id from the booking_team_members lead row.
 *
 * 2. No handling for a 23505 from the DB-level backstop added in
 *    2026_07_18_booking_team_members_one_lead_per_booking.sql (at most one
 *    is_lead=true row per booking). A losing racer's insert now fails
 *    loudly instead of silently creating a duplicate lead row — this route
 *    must surface that as 409, not a raw 500.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

/** Injected right after the route's own read of the booking's current
 *  team_member_id -- simulates a concurrent writer (another PUT, or
 *  team-portal/jobs/reassign) that already landed both its bookings write
 *  AND its own booking_team_members sync between this request's read and
 *  its own write. */
const afterBookingRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))
/** When set, the next booking_team_members insert returns this error instead
 *  of actually inserting -- simulates the new unique-index 23505. */
const nextInsertError = vi.hoisted(() => ({ err: null as { code: string; message: string } | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table === 'bookings') {
        const origMaybeSingle = chain.maybeSingle as () => Promise<{ data: unknown; error: unknown }>
        chain.maybeSingle = () => {
          const result = origMaybeSingle()
          return result.then((r) => {
            // Only the FIRST bookings read in the route is the CAS snapshot
            // point (the Promise.all alongside the booking_team_members
            // snapshot) -- fire once, then stop.
            afterBookingRead.fn?.()
            afterBookingRead.fn = null
            return r
          })
        }
      }
      if (table === 'booking_team_members') {
        const origInsert = chain.insert as (payload: unknown) => unknown
        chain.insert = (payload: unknown) => {
          if (nextInsertError.err) {
            const err = nextInsertError.err
            nextInsertError.err = null
            return { then: (res: (v: unknown) => unknown) => Promise.resolve(res({ data: null, error: err })) }
          }
          return origInsert(payload)
        }
      }
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/notify-team', () => ({
  notifyTeamMember: vi.fn(async () => ({ teamMemberName: 'x', email: false, sms: false, inApp: true, quietHours: false })),
  formatDeliveryReport: () => 'delivered',
}))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))

import { PUT } from './route'

const TENANT_A = 'tenant-A'
const OLD_LEAD = 'tm-old'
const NEW_LEAD = 'tm-new'
const THIRD_LEAD = 'tm-third'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    bookings: [{ id: 'book-1', tenant_id: TENANT_A, team_member_id: OLD_LEAD, team_size: 1, start_time: '2026-08-01T09:00:00' }],
    team_members: [
      { id: OLD_LEAD, tenant_id: TENANT_A, name: 'Old' },
      { id: NEW_LEAD, tenant_id: TENANT_A, name: 'New' },
      { id: THIRD_LEAD, tenant_id: TENANT_A, name: 'Third' },
    ],
    booking_team_members: [
      { id: 'btm-1', tenant_id: TENANT_A, booking_id: 'book-1', team_member_id: OLD_LEAD, is_lead: true, position: 1 },
    ],
    tenants: [{ id: TENANT_A, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }],
  }
  afterBookingRead.fn = null
  nextInsertError.err = null
})

describe('PUT /api/bookings/[id]/team — write-write races', () => {
  it('rejects the write once a concurrent writer already moved the job off the previously-read lead', async () => {
    afterBookingRead.fn = () => {
      h.store.bookings[0] = { ...h.store.bookings[0], team_member_id: THIRD_LEAD }
      h.store.booking_team_members = [
        { id: 'btm-2', tenant_id: TENANT_A, booking_id: 'book-1', team_member_id: THIRD_LEAD, is_lead: true, position: 1 },
      ]
    }

    const res = await PUT(putReq({ lead_id: NEW_LEAD, extra_team_member_ids: [], team_size: 1 }), params('book-1'))
    expect(res.status).toBe(409)

    // The concurrent winner's state must survive untouched -- no desync
    // between bookings.team_member_id and the booking_team_members lead row.
    expect(h.store.bookings[0].team_member_id).toBe(THIRD_LEAD)
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows).toHaveLength(1)
    expect(leadRows[0].team_member_id).toBe(THIRD_LEAD)
  })

  it('still updates the team normally with no concurrent writer (no regression)', async () => {
    const res = await PUT(putReq({ lead_id: NEW_LEAD, extra_team_member_ids: [], team_size: 1 }), params('book-1'))
    expect(res.status).toBe(200)
    expect(h.store.bookings[0].team_member_id).toBe(NEW_LEAD)
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows).toHaveLength(1)
    expect(leadRows[0].team_member_id).toBe(NEW_LEAD)
  })

  it('CAS on a previously-unassigned booking uses IS NULL, not a blind eq(null) that never matches', async () => {
    h.store.bookings[0] = { ...h.store.bookings[0], team_member_id: null }
    h.store.booking_team_members = []

    const res = await PUT(putReq({ lead_id: NEW_LEAD, extra_team_member_ids: [], team_size: 1 }), params('book-1'))
    expect(res.status).toBe(200)
    expect(h.store.bookings[0].team_member_id).toBe(NEW_LEAD)
  })

  it('surfaces the DB unique-index conflict (23505) as 409, not a raw 500', async () => {
    nextInsertError.err = { code: '23505', message: 'duplicate key value violates unique constraint "booking_team_members_one_lead_per_booking"' }

    const res = await PUT(putReq({ lead_id: NEW_LEAD, extra_team_member_ids: [], team_size: 1 }), params('book-1'))
    expect(res.status).toBe(409)
  })

  it('returns 404 for a booking that does not exist', async () => {
    const res = await PUT(putReq({ lead_id: NEW_LEAD, extra_team_member_ids: [], team_size: 1 }), params('nope'))
    expect(res.status).toBe(404)
  })
})
