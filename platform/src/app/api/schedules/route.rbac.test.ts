import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET+POST /api/schedules — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * rbac.ts defines 'schedules.view'/'schedules.create' specifically for this
 * resource and every sibling route (schedules/[id]) already uses them.
 *
 * POST is NOT override-only: by default rbac.ts grants 'schedules.create' to
 * owner/admin/manager only — 'staff' gets neither — so this was live against
 * the hard-coded defaults (same class as P72/P76): any staff-tier member
 * could already create a recurring schedule (and the first 4 weeks of
 * bookings it generates) with zero role check, no override needed.
 *
 * GET is override-only — 'schedules.view' is granted to every default role
 * including staff, so this route was only exploitable once a tenant
 * explicitly revokes it via a role_permissions override.
 *
 * FIX: requirePermission('schedules.view') on GET, requirePermission
 * ('schedules.create') on POST, matching the permissions rbac.ts already
 * defines for this exact resource.
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

import { GET, POST } from './route'

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'

function seed() {
  return {
    recurring_schedules: [
      { id: 'sch-a1', tenant_id: A, recurring_type: 'weekly', client_id: CLIENT_ID, status: 'active', created_at: '2020-01-01' },
    ],
    clients: [{ id: CLIENT_ID, tenant_id: A, name: 'Ann' }],
    team_members: [],
    service_types: [],
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

function postBody(body: Record<string, unknown>) {
  return new Request('http://t/api/schedules', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('GET /api/schedules — permission probe', () => {
  it('owner (has schedules.view) can list schedules', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'schedules.view' from staff via a role_permissions override blocks GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'schedules.view': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/schedules — permission probe', () => {
  const validBody = { client_id: CLIENT_ID, recurring_type: 'weekly', day_of_week: 1 }

  it('owner (has schedules.create) can create a schedule', async () => {
    const res = await POST(postBody(validBody))
    expect(res.status).toBe(201)
  })

  it("'manager' (has schedules.create per default rbac.ts) can create a schedule", async () => {
    tenantHolder.role = 'manager'
    const res = await POST(postBody(validBody))
    expect(res.status).toBe(201)
  })

  it("PERMISSION PROBE: 'staff' (no schedules.create per default rbac.ts, no override needed) is forbidden from creating a schedule", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(postBody(validBody))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'schedules.create' from manager via a role_permissions override blocks POST for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'schedules.create': false } } },
    }
    const res = await POST(postBody(validBody))
    expect(res.status).toBe(403)
  })
})
