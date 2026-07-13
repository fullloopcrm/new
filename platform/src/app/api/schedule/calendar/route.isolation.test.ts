import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * tenantDb conversion probe — schedule/calendar/route.ts.
 * Converts the `bookings` and `team_members` reads (both tenant-owned) to
 * tenantDb(tenantId). Proves tenant A's calendar never counts tenant B's
 * bookings/team even when both have jobs on the same day.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    gte: () => chain,
    lt: () => chain,
    order: () => chain,
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (store[table] || []).filter((row) => matchesEq(row, eqs)), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET } from './route'

beforeEach(() => {
  store = {
    bookings: [
      {
        id: 'booking-A1', tenant_id: 'tenant-A', client_id: 'c-a', team_member_id: 't-a',
        price: 10000, start_time: '2026-07-15T09:00:00', end_time: '2026-07-15T11:00:00',
        status: 'scheduled', payment_status: 'unpaid', service_type: 'Local Tow',
        clients: { name: 'Client A' },
      },
      {
        id: 'booking-B1', tenant_id: 'tenant-B', client_id: 'c-b', team_member_id: 't-b',
        price: 20000, start_time: '2026-07-15T09:00:00', end_time: '2026-07-15T11:00:00',
        status: 'scheduled', payment_status: 'unpaid', service_type: 'HVAC Repair',
        clients: { name: 'Client B' },
      },
    ],
    team_members: [
      { id: 't-a', tenant_id: 'tenant-A', name: 'Team A', status: 'active' },
      { id: 't-b', tenant_id: 'tenant-B', name: 'Team B', status: 'active' },
    ],
  }
})

function getCalendar(tenantId: string) {
  currentTenant = tenantId
  return GET(new NextRequest('http://x/api/schedule/calendar?month=2026-07'))
}

describe('schedule/calendar GET — tenantDb isolation', () => {
  it('tenant A sees only its own booking and team member, not tenant B\'s', async () => {
    const res = await getCalendar('tenant-A')
    const body = await res.json()

    expect(body.team).toHaveLength(1)
    expect(body.team[0].id).toBe('t-a')

    const allEvents = body.grid.days.flatMap((d: { events: Array<{ id: string; client: string }> }) => d.events)
    expect(allEvents).toHaveLength(1)
    expect(allEvents[0].id).toBe('booking-A1')
    expect(allEvents[0].client).toBe('Client A')
  })

  it('tenant B sees only its own booking and team member, not tenant A\'s', async () => {
    const res = await getCalendar('tenant-B')
    const body = await res.json()

    expect(body.team).toHaveLength(1)
    expect(body.team[0].id).toBe('t-b')

    const allEvents = body.grid.days.flatMap((d: { events: Array<{ id: string; client: string }> }) => d.events)
    expect(allEvents).toHaveLength(1)
    expect(allEvents[0].id).toBe('booking-B1')
    expect(allEvents[0].client).toBe('Client B')
  })
})
