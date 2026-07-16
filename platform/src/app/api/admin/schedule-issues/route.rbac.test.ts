import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET+PUT /api/admin/schedule-issues — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * rbac.ts defines 'schedules.view'/'schedules.edit' specifically for this
 * resource family (already used to gate schedules/route.ts,
 * schedules/[id]/route.ts, schedules/[id]/pause/route.ts).
 *
 * PUT is NOT override-only: by default rbac.ts grants 'schedules.edit' to
 * owner/admin/manager only — 'staff' gets neither — so any staff-tier
 * member could already resolve/dismiss a schedule issue (writing
 * resolved_at/resolved_by/resolution_note) with zero role check, no
 * override needed. GET is override-only (staff has schedules.view by
 * default).
 *
 * FIX: requirePermission('schedules.view') on GET, requirePermission
 * ('schedules.edit') on PUT.
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

import { GET, PUT } from './route'

function seed() {
  return {
    schedule_issues: [
      { id: 'iss-a1', tenant_id: A, type: 'day_off', severity: 'warning', message: 'x', booking_id: null, status: 'open' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function putReq(body: Record<string, unknown>) {
  return new Request('http://t/api/admin/schedule-issues', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('GET /api/admin/schedule-issues — permission probe', () => {
  it('owner (has schedules.view) can list issues', async () => {
    const res = await GET(new Request('http://t/api/admin/schedule-issues'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'schedules.view' from staff via override blocks GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'schedules.view': false } } },
    }
    const res = await GET(new Request('http://t/api/admin/schedule-issues'))
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/admin/schedule-issues — permission probe', () => {
  it('owner (has schedules.edit) can resolve an issue', async () => {
    const res = await PUT(putReq({ id: 'iss-a1', status: 'resolved' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no schedules.edit per default rbac.ts, no override needed) is forbidden from resolving an issue", async () => {
    tenantHolder.role = 'staff'
    const before = h.seed.schedule_issues[0].status
    const res = await PUT(putReq({ id: 'iss-a1', status: 'resolved' }))
    expect(res.status).toBe(403)
    expect(h.seed.schedule_issues[0].status).toBe(before)
  })

  it("PERMISSION PROBE: a tenant that revokes 'schedules.edit' from manager via override blocks PUT for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'schedules.edit': false } } },
    }
    const res = await PUT(putReq({ id: 'iss-a1', status: 'resolved' }))
    expect(res.status).toBe(403)
  })
})
