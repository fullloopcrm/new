import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH /api/bookings/[id]/status — permission gate.
 *
 * BUG (fixed here): the handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though the
 * sibling PUT /api/bookings/[id] (general booking edit) already requires
 * requirePermission('bookings.edit') and rbac.ts defines that permission
 * specifically to gate booking mutations. This was a LIVE bug against the
 * hard-coded role defaults: 'staff' is granted 'bookings.view' and
 * 'bookings.create' but NOT 'bookings.edit' — yet with no check on this
 * route, any staff-tier member could transition a booking's status
 * (e.g. force scheduled -> cancelled, or complete -> paid, which also syncs
 * the mirrored deal stage) with zero role check, no override needed.
 *
 * FIX: requirePermission('bookings.edit') on PATCH, matching the sibling
 * PUT /api/bookings/[id] convention.
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

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PATCH } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-1', tenant_id: A, status: 'scheduled' },
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

function req(status: string) {
  return new Request('http://t/api/bookings/bk-1/status', { method: 'PATCH', body: JSON.stringify({ status }) })
}

describe('PATCH /api/bookings/[id]/status — permission probe', () => {
  it('owner (has bookings.edit) can transition booking status', async () => {
    const res = await PATCH(req('confirmed'), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)
  })

  it("'manager' (has bookings.edit per default rbac.ts) can transition booking status", async () => {
    tenantHolder.role = 'manager'
    const res = await PATCH(req('confirmed'), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (has bookings.view/create but NOT bookings.edit per default rbac.ts) is forbidden from transitioning booking status", async () => {
    tenantHolder.role = 'staff'
    const res = await PATCH(req('confirmed'), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'bookings.edit' from manager via a role_permissions override blocks PATCH for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'bookings.edit': false } } },
    }
    const res = await PATCH(req('confirmed'), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(403)
  })
})
