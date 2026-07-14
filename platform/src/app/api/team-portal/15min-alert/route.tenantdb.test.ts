import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/team-portal/15min-alert.
 * The booking_team_members visibility-scope query used to carry a manual
 * .eq('tenant_id', auth.tid) filter -- proves a foreign tenant's
 * booking_team_members row (sharing the same booking_id) is never pulled into
 * this member's visibility check, even when that would otherwise flip a
 * worker's 403 into a 200 for a booking they don't actually own.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

let currentAuth = { id: 'member-a', tid: TENANT_A, role: 'worker' as const }
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: currentAuth, error: null }),
  scopedMemberIds: async () => ['member-a'],
}))

import { POST } from './route'

beforeEach(() => {
  DB.bookings = [
    { id: BOOKING_ID, tenant_id: TENANT_A, team_member_id: null, fifteen_min_alert_time: null, payment_status: 'unpaid', clients: { name: 'Client', phone: '', email: '' }, team_members: null },
  ]
  // A foreign tenant "assigned" the caller's member id to the same booking_id --
  // impossible in practice (booking ids are real UUIDs), but this is the
  // standard shape used throughout this suite to prove the filter fires, not
  // just that real-world ids happen not to collide.
  DB.booking_team_members = [
    { tenant_id: TENANT_B, booking_id: BOOKING_ID, team_member_id: 'member-a' },
  ]
  currentAuth = { id: 'member-a', tid: TENANT_A, role: 'worker' }
})

describe('POST /api/team-portal/15min-alert — tenantDb scoping', () => {
  it('never treats a foreign tenant\'s booking_team_members row as granting visibility', async () => {
    const req = new Request('https://x/api/team-portal/15min-alert', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookingId: BOOKING_ID }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(403)
  })
})
