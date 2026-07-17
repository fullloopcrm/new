import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/routes — terminated-crew guard (P1/W2 fresh-ground).
 *
 * Same gap class as every other assignment surface this lane has closed
 * (bookings create, recurring-schedule, client-portal, staged-import,
 * multi-tech): this route already verified the team_member_id FK belonged to
 * the tenant (leak-prevention fix, prior round) but never checked hr_status.
 * A dispatch route hands the assigned driver a full day's client
 * names/addresses via SMS at publish time (see the sibling publish-route
 * test), so a terminated worker picked here is a live PII-exposure path, not
 * just a scheduling nicety.
 *
 * FIX: team_member_id now runs through getTerminatedTeamMemberIds right
 * after the existing tenant-ownership check, before the routes insert.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], h: null as null | Harness }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { POST } from './route'

function seed() {
  return {
    routes: [] as Record<string, unknown>[],
    bookings: [] as Record<string, unknown>[],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT, name: 'Let Go Larry', home_latitude: 40.1, home_longitude: -74.1, address: '1 Larry Ln' },
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Active Amy', home_latitude: 40.2, home_longitude: -74.2, address: '2 Amy Ave' },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
  }
}

function postReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.h = h
})

describe('routes POST — terminated-crew guard', () => {
  it('BLOCKED: assigning a terminated team member 400s, no route row inserted', async () => {
    const res = await POST(postReq({ route_date: '2026-08-01', team_member_id: 'tm-terminated' }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'routes')).toBeUndefined()
  })

  it('CONTROL: assigning an active team member still creates the route', async () => {
    const res = await POST(postReq({ route_date: '2026-08-01', team_member_id: 'tm-active' }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'routes')!
    expect(insert.rows[0].team_member_id).toBe('tm-active')
  })

  it('CONTROL: no team_member_id at all still creates an unassigned route', async () => {
    const res = await POST(postReq({ route_date: '2026-08-01', start_latitude: 40, start_longitude: -74 }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'routes')!
    expect(insert.rows[0].team_member_id).toBeNull()
  })
})
