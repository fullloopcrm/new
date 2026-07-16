import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/bookings/[id]/reset — permission gate.
 *
 * BUG (fixed here): the handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though the
 * sibling PUT /api/bookings/[id] (general booking edit) already requires
 * requirePermission('bookings.edit') and this route performs an equivalent
 * mutation (undoing a check-in/check-out, reverting booking status). By
 * default rbac.ts grants 'staff' 'bookings.view'/'bookings.create' but NOT
 * 'bookings.edit' — so any staff-tier member could already undo another
 * team member's check-in/check-out with zero role check, no override needed.
 *
 * FIX: requirePermission('bookings.edit') on POST, matching the sibling
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

import { POST } from './route'

function seed() {
  return {
    bookings: [
      {
        id: 'bk-1',
        tenant_id: A,
        status: 'in_progress',
        check_in_time: '2026-07-16T10:00:00Z',
        check_out_time: null,
        payment_status: 'unpaid',
      },
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

function req() {
  return new Request('http://t/api/bookings/bk-1/reset', { method: 'POST', body: JSON.stringify({ stage: 'check-in' }) })
}

describe('POST /api/bookings/[id]/reset — permission probe', () => {
  it('owner (has bookings.edit) can undo a check-in', async () => {
    const res = await POST(req(), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)
  })

  it("'manager' (has bookings.edit per default rbac.ts) can undo a check-in", async () => {
    tenantHolder.role = 'manager'
    const res = await POST(req(), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (has bookings.view/create but NOT bookings.edit per default rbac.ts) is forbidden from undoing a check-in", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(req(), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'bookings.edit' from manager via a role_permissions override blocks POST for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'bookings.edit': false } } },
    }
    const res = await POST(req(), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(403)
  })
})
