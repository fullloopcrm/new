import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — team-availability/route.ts.
 * Converts the clients/bookings/team_members smart-ranking queries (all
 * tenant-owned) to tenantDb(tenantId). Proves tenant B's same-day bookings for
 * a team member with the same id never inflate tenant A's "jobs today"
 * workload count for its own member.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenantId: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}

  const rows = (): Row[] => (store[table] || []).filter((row) => matchesEq(row, eqs))

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    gte: () => chain,
    lte: () => chain,
    not: () => chain,
    in: () => chain,
    single: () => Promise.resolve({ data: rows()[0] || null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows(), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/tenant', () => ({
  getCurrentTenant: async () => ({ id: currentTenantId }),
}))

vi.mock('@/lib/availability', () => ({
  checkTeamAvailability: async () => [{ id: 'shared-member-id', available: true }],
}))

import { GET } from './route'

beforeEach(() => {
  store = {
    bookings: [
      // Same team_member_id string reused across tenants — plausible collision
      // if ids aren't UUIDs from a shared sequence, and the exact case a missing
      // tenant filter would silently blend workloads across tenants.
      { id: 'b-A1', tenant_id: 'tenant-A', team_member_id: 'shared-member-id', start_time: '2026-07-15T09:00:00', status: 'scheduled' },
      { id: 'b-B1', tenant_id: 'tenant-B', team_member_id: 'shared-member-id', start_time: '2026-07-15T10:00:00', status: 'scheduled' },
      { id: 'b-B2', tenant_id: 'tenant-B', team_member_id: 'shared-member-id', start_time: '2026-07-15T13:00:00', status: 'scheduled' },
    ],
    team_members: [],
    clients: [],
  }
})

function getAvailability(tenantId: string) {
  currentTenantId = tenantId
  return GET(new NextRequest('http://x/api/team-availability?date=2026-07-15'))
}

describe('team-availability GET — tenantDb isolation (day-workload query)', () => {
  it('tenant A\'s member workload counts only tenant A\'s booking, not tenant B\'s two', async () => {
    const res = await getAvailability('tenant-A')
    const body = await res.json()
    const member = body.members.find((m: { id: string }) => m.id === 'shared-member-id')
    expect(member.jobs_today).toBe(1)
  })

  it('tenant B\'s member workload counts both of tenant B\'s bookings, not tenant A\'s', async () => {
    const res = await getAvailability('tenant-B')
    const body = await res.json()
    const member = body.members.find((m: { id: string }) => m.id === 'shared-member-id')
    expect(member.jobs_today).toBe(2)
  })
})
