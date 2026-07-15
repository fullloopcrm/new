import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team-portal/checkin/route.ts (docs/adr/0004).
 * The booking lookup was already tenant-filtered manually; the mark-as-checked-in
 * UPDATE was not (`.eq('id', booking_id)` alone). Proves tenantDb closes that gap:
 * a tenant-B booking sharing the exact same booking id (fake store has no
 * uniqueness constraint, standing in for "attacker knows/guesses another
 * tenant's row id") is never read or written by tenant A's check-in call.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string; role: string } | null
vi.mock('../auth/token', () => ({
  verifyToken: () => currentAuth,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_ID = 'bk-shared'
const PAST_START = '2020-01-01T10:00:00'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: 'tm-a', tid: A_ID, role: 'worker' }
  fake._seed('bookings', [
    { id: SHARED_ID, tenant_id: A_ID, team_member_id: 'tm-a', status: 'scheduled', start_time: PAST_START, check_in_time: null, notes: null },
    { id: SHARED_ID, tenant_id: B_ID, team_member_id: 'tm-b', status: 'scheduled', start_time: PAST_START, check_in_time: null, notes: null },
  ])
})

function req(booking_id: string): Request {
  return new Request('http://x/api/team-portal/checkin', {
    method: 'POST',
    headers: { authorization: 'Bearer x' },
    body: JSON.stringify({ booking_id }),
  })
}

describe('team-portal/checkin POST — auth', () => {
  it('missing bearer token → 401', async () => {
    const res = await POST(new Request('http://x/api/team-portal/checkin', {
      method: 'POST',
      body: JSON.stringify({ booking_id: SHARED_ID }),
    }))
    expect(res.status).toBe(401)
  })
})

describe('team-portal/checkin POST — tenantDb isolation', () => {
  it("tenant A's worker checks in to tenant A's copy of a shared booking id, leaving tenant B's copy untouched", async () => {
    const res = await POST(req(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.tenant_id).toBe(A_ID)
    expect(body.booking.check_in_time).not.toBeNull()

    const bRow = fake._all('bookings').find((b) => b.tenant_id === B_ID)
    expect(bRow?.check_in_time).toBeNull()
    expect(bRow?.status).toBe('scheduled')
  })

  it("a worker from tenant B cannot check in to tenant A's booking, even though the requested id matches tenant A's row (tenant B's own row with that id is what gets acted on, and it's not owned by tm-a)", async () => {
    currentAuth = { id: 'tm-b', tid: B_ID, role: 'worker' }
    const res = await POST(req(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.tenant_id).toBe(B_ID)

    const aRow = fake._all('bookings').find((b) => b.tenant_id === A_ID)
    expect(aRow?.check_in_time).toBeNull()
  })
})

describe('LEAK CONTROL', () => {
  it("updating bookings by id ALONE (no tenant_id filter) WOULD flip check_in_time on BOTH tenants' rows sharing that id — proves the route's tenantDb scoping on mark-as-checked-in is load-bearing", async () => {
    await supabaseAdmin
      .from('bookings') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .update({ check_in_time: '2026-07-13T12:00:00Z' })
      .eq('id', SHARED_ID)
    const rows = fake._all('bookings')
    expect(rows.every((b) => b.check_in_time === '2026-07-13T12:00:00Z')).toBe(true)
  })
})
