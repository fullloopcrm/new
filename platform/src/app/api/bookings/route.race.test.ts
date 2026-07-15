import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings — scheduling-conflict + daily-cap TOCTOU races.
 *
 * BUG (fixed here): the route ran a SELECT of overlapping bookings
 * (scheduling conflict) and a separate SELECT count(*) against
 * max_jobs_per_day (daily cap) for the assigned team member, each followed
 * by a branch, then a separate INSERT — three round trips with gaps between
 * them and no unique constraint backing either check. Two concurrent
 * creates assigning the SAME team_member_id to overlapping times (or to the
 * same day once at the cap) could both read a clean pre-insert state and
 * both pass before either INSERT landed, double-booking the member's
 * calendar or oversubscribing their daily cap. Same TOCTOU shape as
 * team-portal/jobs/claim (migrations/2026_07_13_job_claim_atomic.sql) and
 * client/book (migrations/2026_07_13_client_book_dedupe_atomic.sql) — this
 * route was missed when those were fixed.
 *
 * FIX: both checks and the INSERT now run inside a single
 * supabaseAdmin.rpc('create_admin_booking_atomic', ...) call — one DB
 * function (migrations/2026_07_13_admin_booking_atomic.sql) that locks the
 * team_members row first, so a second concurrent call always recomputes
 * both checks against the first call's already-committed booking.
 *
 * This test's fake `rpc` models exactly that contract: it recomputes both
 * checks against shared mutable state and performs the insert in one
 * synchronous pass with no `await` in between — mirroring the DB function's
 * single-statement-per-call atomicity. Firing concurrent creates via
 * Promise.all proves the route can no longer double-book a member or
 * oversubscribe their cap, which the old select-then-branch implementation
 * could not guarantee.
 */

const TENANT = 'tid-a'
const CLIENT = 'client-a'
const MEMBER = 'member-a'

type BookingRow = {
  id: string
  tenant_id: string
  client_id: string
  team_member_id: string | null
  start_time: string
  end_time: string
  status: string
}

const holder = vi.hoisted(() => ({
  members: new Map<string, { name: string; schedule: null; max_jobs_per_day: number | null }>(),
  bookings: new Map<string, BookingRow>(),
  seq: 0,
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: TENANT, tenant: { id: TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/validate', () => ({
  validate: (body: Record<string, unknown>, schema: Record<string, unknown>) => {
    const data: Record<string, unknown> = {}
    for (const k of Object.keys(schema)) if (body[k] !== undefined) data[k] = body[k]
    return { data, error: null }
  },
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    require_team_member: false,
    booking_buffer_minutes: 0,
    auto_confirm_bookings: false,
    default_booking_status: 'scheduled',
  }),
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '' }) }))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/day-availability', () => ({ slotWithinHours: () => true, hoursWindowForDate: () => null }))
vi.mock('@/lib/cleaner-availability', () => ({ timestampToMin: () => 0 }))
vi.mock('@/lib/schedule/duration-class', () => ({ deriveDurationClass: () => null }))

function chainOf(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
  }
  return chain
}

function bookingsSelectByIdBuilder() {
  let id: string | undefined
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: string) => {
      if (col === 'id') id = val
      return chain
    },
    single: async () => {
      const b = holder.bookings.get(id!)
      if (!b) return { data: null, error: { message: 'not found' } }
      return { data: { ...b, clients: null, team_members: null, client_properties: null }, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return chainOf({ data: { id: CLIENT }, error: null })
      if (table === 'team_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => {
                  const m = holder.members.get(MEMBER)
                  return m ? { data: m, error: null } : { data: null, error: { message: 'not found' } }
                },
                maybeSingle: async () => {
                  const m = holder.members.get(MEMBER)
                  return m ? { data: { id: MEMBER }, error: null } : { data: null, error: null }
                },
              }),
            }),
          }),
        }
      }
      if (table === 'tenants') return chainOf({ data: { name: 'Biz', telnyx_api_key: null, telnyx_phone: null }, error: null })
      if (table === 'bookings') return bookingsSelectByIdBuilder()
      throw new Error(`unexpected table: ${table}`)
    },
    // Models migrations/2026_07_13_admin_booking_atomic.sql: one indivisible
    // pass (no internal await) recomputing both the conflict window and the
    // daily-cap count against live shared state before inserting.
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_admin_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      const teamMemberId = args.p_team_member_id as string | null
      if (teamMemberId) {
        const conflicts = [...holder.bookings.values()].filter(
          (b) =>
            b.tenant_id === args.p_tenant_id &&
            b.team_member_id === teamMemberId &&
            !['cancelled', 'no_show'].includes(b.status) &&
            b.start_time < (args.p_conflict_end as string) &&
            b.end_time > (args.p_conflict_start as string),
        )
        if (conflicts.length > 0) {
          return {
            data: { created: false, reason: 'conflict', conflicts: conflicts.map((c) => ({ id: c.id, start: c.start_time, end: c.end_time })) },
            error: null,
          }
        }
        const cap = args.p_max_jobs_per_day as number | null
        if (cap && cap > 0) {
          const count = [...holder.bookings.values()].filter(
            (b) =>
              b.tenant_id === args.p_tenant_id &&
              b.team_member_id === teamMemberId &&
              b.start_time >= (args.p_day_start as string) &&
              b.start_time <= (args.p_day_end as string) &&
              !['cancelled', 'no_show'].includes(b.status),
          ).length
          if (count >= cap) {
            return { data: { created: false, reason: 'max_jobs' }, error: null }
          }
        }
      }
      const id = `bk-${++holder.seq}`
      const booking: BookingRow = {
        id,
        tenant_id: args.p_tenant_id as string,
        client_id: args.p_client_id as string,
        team_member_id: teamMemberId,
        start_time: args.p_start_time as string,
        end_time: args.p_end_time as string,
        status: args.p_status as string,
      }
      holder.bookings.set(id, booking)
      return { data: { created: true, booking }, error: null }
    },
  },
}))

import { POST } from './route'

function bookReq(startTime: string, endTime: string, maxJobsCap?: number) {
  if (maxJobsCap !== undefined) holder.members.set(MEMBER, { name: 'Alex', schedule: null, max_jobs_per_day: maxJobsCap })
  return POST(
    new Request('http://t/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT, team_member_id: MEMBER, start_time: startTime, end_time: endTime }),
    }),
  )
}

beforeEach(() => {
  holder.members.clear()
  holder.bookings.clear()
  holder.seq = 0
})

describe('bookings POST — daily-cap race closed', () => {
  it('two concurrent creates for the same member/day cannot both exceed a cap of 1', async () => {
    holder.members.set(MEMBER, { name: 'Alex', schedule: null, max_jobs_per_day: 1 })
    const [r1, r2] = await Promise.all([
      bookReq('2026-08-01T09:00:00.000Z', '2026-08-01T10:00:00.000Z'),
      bookReq('2026-08-01T14:00:00.000Z', '2026-08-01T15:00:00.000Z'),
    ])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([201, 409])

    const failed = r1.status === 409 ? r1 : r2
    const failedBody = await failed.json()
    expect(failedBody.reason).toBe('max_jobs')

    const claimed = [...holder.bookings.values()].filter((b) => b.team_member_id === MEMBER)
    expect(claimed.length).toBe(1)
  })

  it('positive control: a single create under cap succeeds', async () => {
    holder.members.set(MEMBER, { name: 'Alex', schedule: null, max_jobs_per_day: 2 })
    const res = await bookReq('2026-08-02T09:00:00.000Z', '2026-08-02T10:00:00.000Z')
    expect(res.status).toBe(201)
  })
})

describe('bookings POST — scheduling-conflict race closed', () => {
  it('two concurrent creates for the same member at the same time cannot both land', async () => {
    holder.members.set(MEMBER, { name: 'Alex', schedule: null, max_jobs_per_day: null })
    const [r1, r2] = await Promise.all([
      bookReq('2026-08-03T09:00:00.000Z', '2026-08-03T10:00:00.000Z'),
      bookReq('2026-08-03T09:30:00.000Z', '2026-08-03T10:30:00.000Z'),
    ])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([201, 409])

    const failed = r1.status === 409 ? r1 : r2
    const failedBody = await failed.json()
    expect(failedBody.error).toMatch(/Scheduling conflict/)

    const forMember = [...holder.bookings.values()].filter((b) => b.team_member_id === MEMBER)
    expect(forMember.length).toBe(1)
  })

  it('a second create for a non-overlapping time is not blocked', async () => {
    holder.members.set(MEMBER, { name: 'Alex', schedule: null, max_jobs_per_day: null })
    const r1 = await bookReq('2026-08-04T09:00:00.000Z', '2026-08-04T10:00:00.000Z')
    expect(r1.status).toBe(201)
    const r2 = await bookReq('2026-08-04T14:00:00.000Z', '2026-08-04T15:00:00.000Z')
    expect(r2.status).toBe(201)
  })
})
