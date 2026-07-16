import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT/DELETE /api/admin/users/[id] — owner-escalation guard.
 *
 * Same bug and fix as the sibling collection route's
 * route.owner-escalation.test.ts (this file's id comes from the URL param
 * instead of the request body, same gap otherwise): settings.edit alone
 * (granted to 'admin' by default) let a non-owner grant themselves the owner
 * role, demote an existing owner, or delete an existing owner.
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

function put(id: string, body: unknown) {
  return PUT(
    new Request(`http://t/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }) as unknown as import('next/server').NextRequest,
    { params: Promise.resolve({ id }) },
  )
}
function del(id: string) {
  return DELETE(
    new Request(`http://t/api/admin/users/${id}`, { method: 'DELETE' }) as unknown as import('next/server').NextRequest,
    { params: Promise.resolve({ id }) },
  )
}

function roleOf(id: string): string | undefined {
  return (h.seed.tenant_members.find((m) => m.id === id) as { role?: string } | undefined)?.role
}

describe('PUT /api/admin/users/[id] — owner-escalation probe', () => {
  it('owner can promote another member to owner', async () => {
    const res = await put('m-admin', { role: 'owner' })
    expect(res.status).toBe(200)
    expect(roleOf('m-admin')).toBe('owner')
  })

  it('owner can demote another owner', async () => {
    const res = await put('m-owner-2', { role: 'admin' })
    expect(res.status).toBe(200)
    expect(roleOf('m-owner-2')).toBe('admin')
  })

  it("PERMISSION PROBE: 'admin' (has settings.edit by default) is forbidden from self-escalating to owner", async () => {
    tenantHolder.role = 'admin'
    const res = await put('m-admin', { role: 'owner' })
    expect(res.status).toBe(403)
    expect(roleOf('m-admin')).toBe('admin')
  })

  it("PERMISSION PROBE: 'admin' is forbidden from demoting an existing owner", async () => {
    tenantHolder.role = 'admin'
    const res = await put('m-owner', { role: 'admin' })
    expect(res.status).toBe(403)
    expect(roleOf('m-owner')).toBe('owner')
  })

  it("'admin' can still edit a non-owner member's role", async () => {
    tenantHolder.role = 'admin'
    const res = await put('m-admin', { role: 'manager' })
    expect(res.status).toBe(200)
    expect(roleOf('m-admin')).toBe('manager')
  })
})

describe('DELETE /api/admin/users/[id] — owner-escalation probe', () => {
  it('owner can remove another owner (not the last one)', async () => {
    const res = await del('m-owner-2')
    expect(res.status).toBe(200)
    expect(h.seed.tenant_members.some((m) => m.id === 'm-owner-2')).toBe(false)
  })

  it("PERMISSION PROBE: 'admin' is forbidden from removing an owner even when a second owner exists", async () => {
    tenantHolder.role = 'admin'
    const res = await del('m-owner-2')
    expect(res.status).toBe(403)
    expect(h.seed.tenant_members.some((m) => m.id === 'm-owner-2')).toBe(true)
  })

  it("'admin' can still remove a non-owner member", async () => {
    tenantHolder.role = 'admin'
    const res = await del('m-admin')
    expect(res.status).toBe(200)
    expect(h.seed.tenant_members.some((m) => m.id === 'm-admin')).toBe(false)
  })
})
