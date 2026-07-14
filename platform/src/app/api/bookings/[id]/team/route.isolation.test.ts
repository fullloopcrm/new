import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/[id]/team/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops tenant A's GET/PUT from
 * reading OR mutating tenant B's booking_team_members/bookings rows, even when
 * B's booking shares the SAME id as one of A's (legacy id collision).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, PUT } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_ID = 'bk-shared' // same booking id owned by two different tenants
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('bookings', [
    { id: SHARED_ID, tenant_id: A_ID, team_member_id: 'tm-a', team_size: 1 },
    { id: SHARED_ID, tenant_id: B_ID, team_member_id: 'tm-b', team_size: 1 },
  ])
  fake._seed('booking_team_members', [
    { tenant_id: A_ID, booking_id: SHARED_ID, team_member_id: 'tm-a', is_lead: true, position: 1 },
    { tenant_id: B_ID, booking_id: SHARED_ID, team_member_id: 'tm-b', is_lead: true, position: 1 },
  ])
  fake._seed('tenants', [{ id: A_ID, name: 'Tenant A' }, { id: B_ID, name: 'Tenant B' }])
  fake._seed('team_members', [
    { id: 'tm-a', tenant_id: A_ID, active: true },
    { id: 'tm-a2', tenant_id: A_ID, active: true },
    { id: 'tm-a-inactive', tenant_id: A_ID, active: false },
    { id: 'tm-b', tenant_id: B_ID, active: true },
  ])
})

describe('bookings/[id]/team GET — tenantDb isolation', () => {
  it("tenant A's GET of a same-id booking returns ONLY tenant A's team member", async () => {
    const res = await GET(new Request('http://x'), paramsFor(SHARED_ID))
    const body = await res.json()
    expect(body.lead).toBe('tm-a')
    expect(body.extras).toEqual([])
  })
})

describe('bookings/[id]/team PUT — tenantDb isolation', () => {
  it("tenant A replaces its OWN same-id booking's team (positive control)", async () => {
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ lead_id: 'tm-a2', extra_team_member_ids: [], team_size: 1 }) })
    const res = await PUT(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const aBooking = fake._all('bookings').find((r) => r.tenant_id === A_ID)!
    expect(aBooking.team_member_id).toBe('tm-a2')
  })

  it("tenant A's PUT never mutates tenant B's same-id booking or booking_team_members rows", async () => {
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ lead_id: 'tm-a2', extra_team_member_ids: [], team_size: 1 }) })
    await PUT(req, paramsFor(SHARED_ID))

    const bBooking = fake._all('bookings').find((r) => r.tenant_id === B_ID)!
    expect(bBooking.team_member_id).toBe('tm-b')

    const bRows = fake._all('booking_team_members').filter((r) => r.tenant_id === B_ID)
    expect(bRows).toHaveLength(1)
    expect(bRows[0].team_member_id).toBe('tm-b')

    const aRows = fake._all('booking_team_members').filter((r) => r.tenant_id === A_ID)
    expect(aRows).toHaveLength(1)
    expect(aRows[0].team_member_id).toBe('tm-a2')
  })

  it('rejects a lead_id belonging to another tenant and never mutates the booking', async () => {
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ lead_id: 'tm-b', extra_team_member_ids: [], team_size: 1 }) })
    const res = await PUT(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(400)

    const aBooking = fake._all('bookings').find((r) => r.tenant_id === A_ID)!
    expect(aBooking.team_member_id).toBe('tm-a')
    const aRows = fake._all('booking_team_members').filter((r) => r.tenant_id === A_ID)
    expect(aRows).toHaveLength(1)
    expect(aRows[0].team_member_id).toBe('tm-a')
  })

  it('rejects an extra_team_member_ids entry belonging to another tenant', async () => {
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ lead_id: 'tm-a2', extra_team_member_ids: ['tm-b'], team_size: 2 }) })
    const res = await PUT(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(400)

    const aBooking = fake._all('bookings').find((r) => r.tenant_id === A_ID)!
    expect(aBooking.team_member_id).toBe('tm-a')
  })

  it('rejects an inactive team member', async () => {
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ lead_id: 'tm-a-inactive', extra_team_member_ids: [], team_size: 1 }) })
    const res = await PUT(req, paramsFor(SHARED_ID))
    expect(res.status).toBe(400)
  })
})
