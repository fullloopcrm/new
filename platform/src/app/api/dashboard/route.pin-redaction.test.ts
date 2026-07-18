import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'
import { nowNaiveET } from '@/lib/recurring'

/**
 * GET /api/dashboard — credential exposure (P1/W1 broad-hunt). todayJobs /
 * upcomingBookings / allJobs each embed the assigned team member via
 * `team_members!bookings_team_member_id_fkey(*)` -- a full-row FK embed,
 * same as a raw select('*') on team_members. This aggregator is gated only
 * on bookings.view (held by 'staff' by default, see rbac.ts), so every
 * staff-tier dashboard session pulled every assigned teammate's plaintext
 * team-portal login pin on ordinary page load -- the exact credential-leak
 * class already fixed on GET /api/team and GET /api/cleaners, just reached
 * via an embedded FK instead of a direct team_members query. Strips pin
 * from the embedded team_members object on all 3 result sets.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
  selenaConfig: null as Record<string, unknown> | null,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string; selenaConfig: Record<string, unknown> | null }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { selena_config: h.selenaConfig }, role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.selenaConfig = null
  h.store = {
    bookings: [
      {
        id: 'book-A1',
        tenant_id: 'tenant-A',
        start_time: nowNaiveET(),
        status: 'confirmed',
        payment_status: 'pending',
        price: 4200,
        team_members: { id: 'tm-A1', name: 'Alice', pin: '4821' },
      },
    ],
    clients: [],
    team_members: [],
  }
})

describe('GET /api/dashboard — credential exposure via embedded team_members', () => {
  it("PIN PROBE: staff cannot harvest an assigned teammate's pin off todayJobs", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.todayJobs.length).toBe(1)
    expect(json.todayJobs[0].team_members).not.toHaveProperty('pin')
    expect(json.todayJobs[0].team_members.name).toBe('Alice')
  })

  it("PIN PROBE: staff cannot harvest an assigned teammate's pin off upcomingBookings", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.upcomingBookings.length).toBe(1)
    expect(json.upcomingBookings[0].team_members).not.toHaveProperty('pin')
  })

  it("PIN PROBE: staff cannot harvest an assigned teammate's pin off allJobs", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.allJobs.length).toBe(1)
    expect(json.allJobs[0].team_members).not.toHaveProperty('pin')
  })

  it('owner also never sees pin here (dashboard is not the intentional admin card view)', async () => {
    h.role = 'owner'
    const res = await GET()
    const json = await res.json()
    expect(json.todayJobs[0].team_members).not.toHaveProperty('pin')
  })
})
