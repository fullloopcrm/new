import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team-portal/jobs/route.ts (docs/adr/0004).
 * All three branches (open pool, upcoming, today) were already manually
 * `.eq('tenant_id', auth.tid)`-scoped — this is a consistency conversion to
 * tenantDb, not a gap fix. The LEAK CONTROL proves the underlying store has
 * no implicit tenant scoping, so the route's filter is what keeps a worker
 * from seeing another tenant's bookings.
 */

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../auth/token'
import { GET } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [
    { id: 'tm-a', tenant_id: A_ID, status: 'active' },
    { id: 'tm-b', tenant_id: B_ID, status: 'active' },
  ])
  fake._seed('tenants', [
    { id: A_ID, selena_config: null },
    { id: B_ID, selena_config: null },
  ])
  fake._seed('bookings', [
    { id: 'bk-a-open', tenant_id: A_ID, team_member_id: null, status: 'scheduled', start_time: '2099-01-01T10:00:00Z', end_time: '2099-01-01T12:00:00Z', service_type: 'Deep', price: 100, clients: { address: '10001 Main St' } },
    { id: 'bk-b-open', tenant_id: B_ID, team_member_id: null, status: 'scheduled', start_time: '2099-01-01T10:00:00Z', end_time: '2099-01-01T12:00:00Z', service_type: 'Deep', price: 200, clients: { address: '90210 Other St' } },
    { id: 'bk-a-today', tenant_id: A_ID, team_member_id: 'tm-a', status: 'scheduled', start_time: new Date().toISOString(), end_time: new Date().toISOString(), service_type: 'Regular', price: 50, clients: { name: 'A Client', phone: '1', address: 'x', special_instructions: null } },
    { id: 'bk-b-today', tenant_id: B_ID, team_member_id: 'tm-b', status: 'scheduled', start_time: new Date().toISOString(), end_time: new Date().toISOString(), service_type: 'Regular', price: 50, clients: { name: 'B Client', phone: '2', address: 'y', special_instructions: null } },
  ])
})

function req(token: string, params: string): NextRequest {
  return new NextRequest(`http://x/api/team-portal/jobs?${params}`, {
    headers: { authorization: `Bearer ${token}` },
  })
}

describe('team-portal/jobs GET (available pool) — tenantDb isolation', () => {
  it("tenant A's worker sees only tenant A's open jobs in the unassigned pool, never tenant B's", async () => {
    const token = createToken('tm-a', A_ID)
    const res = await GET(req(token, 'available=true'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.jobs.map((j: { id: string }) => j.id)
    expect(ids).toContain('bk-a-open')
    expect(ids).not.toContain('bk-b-open')
  })
})

describe('team-portal/jobs GET (today) — tenantDb isolation', () => {
  it("tenant A's worker sees only their own tenant's booking for today, never tenant B's same-shaped booking", async () => {
    const token = createToken('tm-a', A_ID)
    const res = await GET(req(token, ''))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.jobs.map((j: { id: string }) => j.id)
    expect(ids).toEqual(['bk-a-today'])
  })
})

describe('team-portal/jobs GET (upcoming) — non-lead crew visibility', () => {
  it('a crew member who is NOT the booking.team_member_id lead, but IS in booking_team_members, still sees the job', async () => {
    const threeDaysOut = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
    fake._seed('team_members', [{ id: 'tm-a-crew', tenant_id: A_ID, status: 'active' }])
    fake._seed('bookings', [
      { id: 'bk-a-crew-job', tenant_id: A_ID, team_member_id: 'tm-a', status: 'scheduled', start_time: threeDaysOut, end_time: threeDaysOut, service_type: 'Team Clean', price: 300, clients: { name: 'Crew Client', phone: '3', address: 'z', special_instructions: null } },
    ])
    fake._seed('booking_team_members', [
      { id: 'btm-lead', tenant_id: A_ID, booking_id: 'bk-a-crew-job', team_member_id: 'tm-a', is_lead: true, position: 1 },
      { id: 'btm-crew', tenant_id: A_ID, booking_id: 'bk-a-crew-job', team_member_id: 'tm-a-crew', is_lead: false, position: 2 },
    ])

    const token = createToken('tm-a-crew', A_ID)
    const res = await GET(req(token, 'upcoming=true'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.jobs.map((j: { id: string }) => j.id)
    expect(ids).toContain('bk-a-crew-job')
  })
})

describe('LEAK CONTROL', () => {
  it("selecting bookings by team_member_id ALONE (no tenant_id filter) WOULD still only match the requested worker's own rows, but selecting the open pool by status ALONE (no tenant_id filter) WOULD return both tenants' unassigned jobs — proves the route's tenantDb scoping on the pool query is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('bookings') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .select('id, tenant_id')
      .is('team_member_id', null)
      .in('status', ['scheduled', 'confirmed'])
    const rows = (data ?? []) as { id: string; tenant_id: string }[]
    expect(rows.map((r) => r.tenant_id).sort()).toEqual([A_ID, B_ID].sort())
  })
})
