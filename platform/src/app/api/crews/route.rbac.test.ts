import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST/PATCH/DELETE /api/crews — permission gate.
 *
 * BUG (fixed here): every handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * this is exactly the "sub-resource of team members" shape already gated
 * elsewhere (e.g. /api/team/[id]/route.ts's team.edit/team.delete,
 * /api/cleaners/[id]/route.ts's same pair). Crews were missed entirely.
 *
 * NOT override-only: by default rbac.ts grants 'team.edit'/'team.delete' to
 * owner/admin (edit) and owner only (delete) — 'manager' and 'staff' get
 * only 'team.view'. So any manager or staff-tier member could already
 * create/rename/archive a crew or wipe+repopulate its roster (POST/PATCH),
 * or delete one outright (DELETE), with zero role check, no override
 * needed — same class as P72/P76/P77/P78.
 *
 * FIX: requirePermission('team.view') on GET, requirePermission('team.edit')
 * on POST+PATCH, requirePermission('team.delete') on DELETE — matching the
 * established team.* gating convention for team sub-resources.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
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
      tenantId: A,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

import { GET, POST, PATCH, DELETE } from './route'

function seed() {
  return {
    crews: [
      { id: 'crew-a1', tenant_id: A, name: 'Alpha', color: null, active: true, crew_members: [] },
    ],
    team_members: [{ id: 'tm-a1', tenant_id: A, name: 'A-One' }],
    crew_members: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function jsonReq(method: string, body: unknown): Request {
  return { method, json: async () => body } as unknown as Request
}

describe('GET /api/crews — permission probe', () => {
  it('owner (has team.view) can list crews', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'team.view' from staff via override blocks GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'team.view': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/crews — permission probe', () => {
  it('owner (has team.edit) can create a crew', async () => {
    const res = await POST(jsonReq('POST', { name: 'Bravo' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no team.edit per default rbac.ts, no override needed) is forbidden from creating a crew", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(jsonReq('POST', { name: 'Bravo' }))
    expect(res.status).toBe(403)
    expect(h.seed.crews).toHaveLength(1)
  })

  it("PERMISSION PROBE: 'manager' (no team.edit per default rbac.ts, no override needed) is forbidden from creating a crew", async () => {
    tenantHolder.role = 'manager'
    const res = await POST(jsonReq('POST', { name: 'Bravo' }))
    expect(res.status).toBe(403)
    expect(h.seed.crews).toHaveLength(1)
  })
})

describe('PATCH /api/crews — permission probe', () => {
  it('owner (has team.edit) can update a crew', async () => {
    const res = await PATCH(jsonReq('PATCH', { id: 'crew-a1', name: 'Renamed' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no team.edit per default rbac.ts, no override needed) is forbidden from updating a crew, roster untouched", async () => {
    tenantHolder.role = 'staff'
    const res = await PATCH(jsonReq('PATCH', { id: 'crew-a1', name: 'Renamed', member_ids: ['tm-a1'] }))
    expect(res.status).toBe(403)
    const crew = h.seed.crews.find((c) => c.id === 'crew-a1')!
    expect(crew.name).toBe('Alpha')
    expect(h.seed.crew_members.filter((r) => r.crew_id === 'crew-a1')).toHaveLength(0)
  })

  it("PERMISSION PROBE: a tenant that revokes 'team.edit' from admin via override blocks PATCH for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'team.edit': false } } },
    }
    const res = await PATCH(jsonReq('PATCH', { id: 'crew-a1', name: 'Renamed' }))
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/crews — permission probe', () => {
  it('owner (has team.delete) can delete a crew', async () => {
    const res = await DELETE(new Request('http://t/api/crews?id=crew-a1', { method: 'DELETE' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'admin' (no team.delete per default rbac.ts, no override needed) is forbidden from deleting a crew", async () => {
    tenantHolder.role = 'admin'
    const res = await DELETE(new Request('http://t/api/crews?id=crew-a1', { method: 'DELETE' }))
    expect(res.status).toBe(403)
    expect(h.seed.crews.some((c) => c.id === 'crew-a1')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no team.delete per default rbac.ts, no override needed) is forbidden from deleting a crew", async () => {
    tenantHolder.role = 'staff'
    const res = await DELETE(new Request('http://t/api/crews?id=crew-a1', { method: 'DELETE' }))
    expect(res.status).toBe(403)
    expect(h.seed.crews.some((c) => c.id === 'crew-a1')).toBe(true)
  })
})
