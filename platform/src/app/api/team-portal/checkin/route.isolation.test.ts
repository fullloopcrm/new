import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/team-portal/checkin (converted to tenantDb).
 *
 * The portal token carries the tenant (auth.tid). The booking is read through
 * tenantDb(auth.tid), so a booking owned by ANOTHER tenant is invisible → 404,
 * EVEN when its team_member_id matches the token's member id. This is the sharp
 * cross-tenant probe: a cleaner's token can never check in a foreign tenant's
 * booking, so no foreign job status/timestamp can be written.
 */

const A = 'tid-a'
const B = 'tid-b'
const MEMBER = 'tm-1'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

// Portal token → { id: member, tid: tenant }. 'good' binds MEMBER to tenant A.
vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => (token === 'good' ? { id: MEMBER, tid: A, role: 'cleaner' } : null),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: A, team_member_id: MEMBER, status: 'scheduled', start_time: '2020-01-01T10:00:00Z', check_in_time: null, notes: null },
      // Same member id, but a DIFFERENT tenant. tenantDb must hide it from MEMBER's token.
      { id: 'bk-b', tenant_id: B, team_member_id: MEMBER, status: 'scheduled', start_time: '2020-01-01T10:00:00Z', check_in_time: null, notes: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function checkin(token: string | null, booking_id: string) {
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {}
  return POST(new Request('http://t/api/team-portal/checkin', { method: 'POST', headers, body: JSON.stringify({ booking_id }) }))
}

describe('team-portal/checkin POST — tenant isolation', () => {
  it("positive control: the cleaner checks in their OWN tenant's booking", async () => {
    const res = await checkin('good', 'bk-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.status).toBe('in_progress')
    expect(body.booking.check_in_time).toBeTruthy()
  })

  it("wrong-tenant probe: a foreign booking 404s even though team_member_id matches — no write", async () => {
    const res = await checkin('good', 'bk-b')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Not found')
    const bkB = h.seed.bookings.find((b) => b.id === 'bk-b')
    expect(bkB!.check_in_time).toBeNull()
    expect(bkB!.status).toBe('scheduled')
  })

  it('missing token → 401', async () => {
    const res = await checkin(null, 'bk-a')
    expect(res.status).toBe(401)
  })
})
