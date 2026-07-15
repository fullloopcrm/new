import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/team-portal/jobs/claim.
 * Two queries used to carry a manual .eq('tenant_id', auth.tid): the member
 * pay-rate/cap lookup and the daily-claim-count query. This proves:
 *   1. claiming a booking never touches a foreign-tenant row sharing the same
 *      booking id (the atomic UPDATE stays tenant-scoped), and
 *   2. the daily claim-cap count only counts the CALLER tenant's bookings — a
 *      foreign-tenant booking assigned to a colliding member id must not count
 *      toward the cap (if it leaked in, the claim below would 409 instead of 200).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const MEMBER_ID = 'member-a'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    is: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    select: () => uc,
    maybeSingle: async () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)))
      matched.forEach((r) => Object.assign(r, values))
      return { data: matched[0] ?? null, error: null }
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let headCount = false
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { head?: boolean }) => { headCount = !!opts?.head; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) >= (val as string)); return c },
    lt: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) < (val as string)); return c },
    not: (col: string, _op: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
    update: (values: Row) => updateChain(rowsOf(), values),
    then: (resolve: (v: { data: unknown; count?: number; error: unknown }) => unknown) => {
      if (headCount) { resolve({ data: null, count: matched().length, error: null }); return }
      resolve({ data: matched(), error: null })
    },
  }
  return c
}

// Claiming now runs through one atomic supabaseAdmin.rpc('claim_job_atomic', ...)
// call (migrations/2026_07_13_job_claim_atomic.sql) instead of a separate
// count-then-update — this fake models that same contract against the
// chain-backed DB store above so the tenant-scoping assertions below still
// exercise the real route.
function claimJobAtomicRpc(args: Record<string, unknown>) {
  const member = (DB.team_members || []).find(
    (m) => m.id === args.p_member_id && m.tenant_id === args.p_tenant_id,
  )
  const cap = (member?.max_jobs_per_day as number | null) ?? null
  if (cap && cap > 0) {
    const count = (DB.bookings || []).filter(
      (b) =>
        b.tenant_id === args.p_tenant_id &&
        b.team_member_id === args.p_member_id &&
        (b.start_time as string) >= (args.p_day_start as string) &&
        (b.start_time as string) < (args.p_day_end as string) &&
        b.status !== 'cancelled',
    ).length
    if (count >= cap) return { data: { claimed: false, reason: 'cap_reached', cap }, error: null }
  }
  const booking = (DB.bookings || []).find(
    (b) => b.id === args.p_booking_id && b.tenant_id === args.p_tenant_id && b.team_member_id === null,
  )
  if (!booking) return { data: { claimed: false, reason: 'already_taken' }, error: null }
  Object.assign(booking, { team_member_id: args.p_member_id, pay_rate: member?.pay_rate ?? null, status: 'confirmed' })
  return { data: { claimed: true, reason: 'ok', booking }, error: null }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => chain(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'claim_job_atomic') throw new Error(`unexpected rpc: ${fn}`)
      return claimJobAtomicRpc(args)
    },
  },
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(() => Promise.resolve()) }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

beforeEach(() => {
  DB.team_members = [{ id: MEMBER_ID, tenant_id: TENANT_A, status: 'active', pay_rate: 25, max_jobs_per_day: 1 }]
  const todayNoon = new Date(); todayNoon.setHours(12, 0, 0, 0)
  DB.bookings = [
    { id: BOOKING_ID, tenant_id: TENANT_A, team_member_id: null, status: 'scheduled', start_time: todayNoon.toISOString() },
    { id: BOOKING_ID, tenant_id: TENANT_B, team_member_id: null, status: 'scheduled', start_time: todayNoon.toISOString() },
    // Assigned to a member id that collides with TENANT_A's member — must NOT
    // count toward tenant A's daily cap (cap is 1; if this leaked in, the
    // claim below would 409 instead of succeed).
    { id: 'foreign-cap-booking', tenant_id: TENANT_B, team_member_id: MEMBER_ID, status: 'confirmed', start_time: todayNoon.toISOString() },
  ]
  DB.tenants = [{ id: TENANT_A, selena_config: null }]
})

describe('POST /api/team-portal/jobs/claim — tenantDb scoping', () => {
  it('claims only the caller tenant\'s booking and ignores a foreign-tenant cap booking sharing the member id', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 25, 'worker')
    const req = new NextRequest('https://x/api/team-portal/jobs/claim', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const bookingA = DB.bookings.find((r) => r.tenant_id === TENANT_A && r.id === BOOKING_ID)!
    const bookingB = DB.bookings.find((r) => r.tenant_id === TENANT_B && r.id === BOOKING_ID)!
    expect(bookingA.team_member_id).toBe(MEMBER_ID)
    expect(bookingA.status).toBe('confirmed')
    expect(bookingB.team_member_id).toBeNull()
    expect(bookingB.status).toBe('scheduled')
  })
})
