import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT/DELETE /api/admin/users — owner-escalation guard.
 *
 * BUG (fixed here): both handlers only checked `settings.edit` (granted to
 * 'admin' by default, per rbac.ts) before writing `role` on ANY member row
 * matched by caller-supplied `id` in the request body. Nothing stopped a
 * non-owner from:
 *   (a) setting their OWN role to 'owner' via PUT (self-escalation), or
 *   (b) changing the real owner's role away from 'owner' via PUT (demotion), or
 *   (c) removing an existing owner via DELETE (when >1 owner exists, so the
 *       pre-existing "can't remove the last owner" count check didn't apply).
 * Same shape as the already-fixed admin/users/[id]/pin/route.ts takeover gap
 * (settings.edit alone is not owner-equivalent), but reachable via a plain
 * role-field write instead of a PIN read-back.
 *
 * FIX: block PUT when tenant.role !== 'owner' AND (role === 'owner' OR the
 * target's current role is 'owner'); block DELETE when tenant.role !== 'owner'
 * AND the target's role is 'owner'.
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

import { PUT, DELETE } from './route'

function seed() {
  return {
    tenant_members: [
      { id: 'm-owner', tenant_id: A, role: 'owner', name: 'Owen' },
      { id: 'm-owner-2', tenant_id: A, role: 'owner', name: 'Ozzy' },
      { id: 'm-admin', tenant_id: A, role: 'admin', name: 'Adam' },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function put(body: unknown) {
  return PUT(
    new Request('http://t/api/admin/users', { method: 'PUT', body: JSON.stringify(body) }) as unknown as import('next/server').NextRequest,
  )
}
function del(body: unknown) {
  return DELETE(
    new Request('http://t/api/admin/users', { method: 'DELETE', body: JSON.stringify(body) }) as unknown as import('next/server').NextRequest,
  )
}

function roleOf(id: string): string | undefined {
  return (h.seed.tenant_members.find((m) => m.id === id) as { role?: string } | undefined)?.role
}

describe('PUT /api/admin/users — owner-escalation probe', () => {
  it('owner can promote another member to owner', async () => {
    const res = await put({ id: 'm-admin', role: 'owner' })
    expect(res.status).toBe(200)
    expect(roleOf('m-admin')).toBe('owner')
  })

  it('owner can demote another owner', async () => {
    const res = await put({ id: 'm-owner-2', role: 'admin' })
    expect(res.status).toBe(200)
    expect(roleOf('m-owner-2')).toBe('admin')
  })

  it("PERMISSION PROBE: 'admin' (has settings.edit by default) is forbidden from self-escalating to owner", async () => {
    tenantHolder.role = 'admin'
    const res = await put({ id: 'm-admin', role: 'owner' })
    expect(res.status).toBe(403)
    expect(roleOf('m-admin')).toBe('admin')
  })

  it("PERMISSION PROBE: 'admin' is forbidden from demoting an existing owner", async () => {
    tenantHolder.role = 'admin'
    const res = await put({ id: 'm-owner', role: 'admin' })
    expect(res.status).toBe(403)
    expect(roleOf('m-owner')).toBe('owner')
  })

  it("'admin' can still edit a non-owner member's role (e.g. manager -> staff)", async () => {
    tenantHolder.role = 'admin'
    const res = await put({ id: 'm-admin', role: 'manager' })
    expect(res.status).toBe(200)
    expect(roleOf('m-admin')).toBe('manager')
  })
})

describe('DELETE /api/admin/users — owner-escalation probe', () => {
  it('owner can remove another owner (not the last one)', async () => {
    const res = await del({ id: 'm-owner-2' })
    expect(res.status).toBe(200)
    expect(h.seed.tenant_members.some((m) => m.id === 'm-owner-2')).toBe(false)
  })

  it("PERMISSION PROBE: 'admin' is forbidden from removing an owner even when a second owner exists", async () => {
    tenantHolder.role = 'admin'
    const res = await del({ id: 'm-owner-2' })
    expect(res.status).toBe(403)
    expect(h.seed.tenant_members.some((m) => m.id === 'm-owner-2')).toBe(true)
  })

  it("'admin' can still remove a non-owner member", async () => {
    tenantHolder.role = 'admin'
    const res = await del({ id: 'm-admin' })
    expect(res.status).toBe(200)
    expect(h.seed.tenant_members.some((m) => m.id === 'm-admin')).toBe(false)
  })
})
