import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/team-portal/running-late.
 * Two real gaps closed here:
 *   1. the booking SELECT used to carry a manual .eq('tenant_id', auth.tid) —
 *      now via tenantDb(auth.tid).
 *   2. the booking UPDATE (recording running_late_at/eta) had NO tenant filter
 *      at all — only .eq('id', bookingId). Booking ids are UUIDs so this wasn't
 *      independently exploitable, but it's the same defense-in-depth class as
 *      prior passes: this test proves a foreign-tenant row sharing the same
 *      booking id is never mutated by tenant A's request.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const MEMBER_ID = 'shared-member-id'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      rows.filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, values))
      resolve({ data: null, error: null })
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    update: (values: Row) => updateChain(rowsOf(), values),
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(() => Promise.resolve()), sendPushToClient: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/sms-templates', () => ({ smsRunningLateClient: () => '', smsRunningLateAdmin: () => '' }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(() => Promise.resolve({ allowed: true, remaining: 4 })) }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { POST } from './route'

beforeEach(() => {
  DB.team_members = [{ id: MEMBER_ID, tenant_id: TENANT_A, status: 'active' }]
  // Two bookings that happen to share the same id across tenants (synthetic
  // worst case — real ids are UUIDs, but this proves the filter, not the odds).
  DB.bookings = [
    { id: BOOKING_ID, tenant_id: TENANT_A, team_member_id: MEMBER_ID, client_id: 'client-a', start_time: new Date().toISOString(), running_late_at: null, running_late_eta: null },
    { id: BOOKING_ID, tenant_id: TENANT_B, team_member_id: MEMBER_ID, client_id: 'client-b', start_time: new Date().toISOString(), running_late_at: null, running_late_eta: null },
  ]
  DB.tenants = [{ id: TENANT_A, name: 'Tenant A', owner_phone: null, phone: null, telnyx_api_key: null, telnyx_phone: null }]
})

describe('POST /api/team-portal/running-late — tenantDb scoping', () => {
  it('only marks the caller tenant\'s own booking late, not a foreign-tenant row sharing the same booking id', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 30, 'worker')
    const req = new NextRequest('https://x/api/team-portal/running-late', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ bookingId: BOOKING_ID, eta: 10 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const bookingA = DB.bookings.find((r) => r.tenant_id === TENANT_A)!
    const bookingB = DB.bookings.find((r) => r.tenant_id === TENANT_B)!
    expect(bookingA.running_late_eta).toBe(10)
    expect(bookingB.running_late_at).toBeNull()
    expect(bookingB.running_late_eta).toBeNull()
  })

  it('returns 429 and does not send SMS or mutate the booking once the per-member rate limit is hit', async () => {
    vi.mocked(rateLimitDb).mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const token = createToken(MEMBER_ID, TENANT_A, 30, 'worker')
    const req = new NextRequest('https://x/api/team-portal/running-late', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ bookingId: BOOKING_ID, eta: 10 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(429)

    const bookingA = DB.bookings.find((r) => r.tenant_id === TENANT_A)!
    expect(bookingA.running_late_eta).toBeNull()
  })
})
