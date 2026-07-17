import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH /api/routes/[id] — terminated-crew guard (P1/W2 fresh-ground).
 *
 * Sibling of the POST /api/routes fix (same round): this PATCH path already
 * verified the team_member_id FK belonged to the tenant but never checked
 * hr_status when *reassigning* an existing route. A route can also sit in
 * 'draft' for days after assignment, so reassignment here is at least as
 * live a path to a terminated worker as create.
 *
 * FIX: team_member_id now runs through getTerminatedTeamMemberIds right
 * after the existing tenant-ownership check, before the routes update.
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

import { PATCH } from './route'

function seed() {
  return {
    routes: [{ id: 'route-a', tenant_id: CTX_TENANT, route_date: '2026-08-01', status: 'draft', team_member_id: null, stops: [] }] as Record<string, unknown>[],
    bookings: [] as Record<string, unknown>[],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT, name: 'Let Go Larry' },
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Active Amy' },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
  }
}

function patchReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.h = h
})

describe('routes/[id] PATCH — terminated-crew guard', () => {
  it('BLOCKED: reassigning to a terminated team member 400s, route row untouched', async () => {
    const res = await PATCH(patchReq({ team_member_id: 'tm-terminated' }), ctx('route-a'))
    expect(res.status).toBe(400)
    expect(h.capture.updates.find((u) => u.table === 'routes')).toBeUndefined()
    expect(h.seed.routes[0].team_member_id).toBeNull()
  })

  it('CONTROL: reassigning to an active team member updates the route', async () => {
    const res = await PATCH(patchReq({ team_member_id: 'tm-active' }), ctx('route-a'))
    expect(res.status).toBe(200)
    expect(h.seed.routes[0].team_member_id).toBe('tm-active')
  })
})
