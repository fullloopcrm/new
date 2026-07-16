import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET+PUT+DELETE /api/schedules/[id] — permission gate.
 *
 * BUG (fixed here): all three handlers only called getTenantForRequest()
 * (proves tenant membership at ANY role) with zero permission check, even
 * though rbac.ts defines 'schedules.view'/'schedules.edit' specifically for
 * this resource.
 *
 * PUT/DELETE are NOT override-only: by default rbac.ts grants
 * 'schedules.edit' to owner/admin/manager only — 'staff' gets neither — so
 * this was live against the hard-coded defaults (same class as P72/P76):
 * any staff-tier member could already edit or cancel a recurring schedule
 * with zero role check, no override needed.
 *
 * GET is override-only — 'schedules.view' is granted to every default role
 * including staff.
 *
 * FIX: requirePermission('schedules.view') on GET, requirePermission
 * ('schedules.edit') on PUT/DELETE, matching schedules/route.ts's sibling
 * gates and the permissions rbac.ts already defines for this resource.
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

import { GET, PUT, DELETE } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'sch-a1', tenant_id: A, recurring_type: 'weekly', client_id: 'cli-a1', status: 'active' },
    ],
    bookings: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function putBody(body: Record<string, unknown>) {
  return new Request('http://t/api/schedules/sch-a1', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('GET /api/schedules/[id] — permission probe', () => {
  it('owner (has schedules.view) can read a schedule', async () => {
    const res = await GET(new Request('http://t/api/schedules/sch-a1'), params('sch-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'schedules.view' from staff via a role_permissions override blocks GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'schedules.view': false } } },
    }
    const res = await GET(new Request('http://t/api/schedules/sch-a1'), params('sch-a1'))
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/schedules/[id] — permission probe', () => {
  it('owner (has schedules.edit) can update a schedule', async () => {
    const res = await PUT(putBody({ notes: 'updated' }), params('sch-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no schedules.edit per default rbac.ts, no override needed) is forbidden from updating a schedule", async () => {
    tenantHolder.role = 'staff'
    const res = await PUT(putBody({ notes: 'updated' }), params('sch-a1'))
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/schedules/[id] — permission probe', () => {
  it('owner (has schedules.edit) can cancel a schedule', async () => {
    const res = await DELETE(new Request('http://t/api/schedules/sch-a1', { method: 'DELETE' }), params('sch-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no schedules.edit per default rbac.ts, no override needed) is forbidden from cancelling a schedule", async () => {
    tenantHolder.role = 'staff'
    const res = await DELETE(new Request('http://t/api/schedules/sch-a1', { method: 'DELETE' }), params('sch-a1'))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'schedules.edit' from manager via a role_permissions override blocks DELETE for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'schedules.edit': false } } },
    }
    const res = await DELETE(new Request('http://t/api/schedules/sch-a1', { method: 'DELETE' }), params('sch-a1'))
    expect(res.status).toBe(403)
  })
})
