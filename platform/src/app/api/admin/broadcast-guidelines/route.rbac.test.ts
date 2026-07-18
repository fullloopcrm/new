import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/broadcast-guidelines — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though it
 * texts EVERY active team member of the tenant (SMS cost, and each message
 * includes that member's own portal PIN) on demand. Its direct sibling in
 * the same settings-page UI card — "Save Guidelines" (PUT /api/settings,
 * which writes the same guidelines_en/guidelines_es fields) — already gates
 * behind settings.edit. By default rbac.ts grants settings.edit to
 * owner/admin but NOT manager or staff, so any staff-tier member could
 * already trigger a tenant-wide SMS broadcast with zero role check.
 *
 * FIX: requirePermission('settings.edit') on POST, matching the sibling
 * save action on the same card.
 */

const A = 'tid-broadcast-rbac-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: {} as Record<string, unknown>,
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
      tenantId: (tenantHolder.tenant as { id: string }).id,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

const notifyMock = vi.hoisted(() => vi.fn(async (_args: { message?: string }) => ({ success: true })))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

import { POST } from './route'

function seed() {
  return {
    team_members: [
      { id: 'tm-1', tenant_id: A, name: 'Ann', pin: '1234', preferred_language: 'en', status: 'active' },
    ],
    tenant_domains: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  notifyMock.mockClear()
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A, name: 'Tenant A', slug: A, domain: 'example.com' }
})

describe('POST /api/admin/broadcast-guidelines — permission probe', () => {
  it('owner (has settings.edit) can broadcast', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalled()
  })

  it('admin (has settings.edit) can broadcast', async () => {
    tenantHolder.role = 'admin'
    const res = await POST()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (has settings.view but NOT settings.edit per default rbac.ts) is forbidden", async () => {
    tenantHolder.role = 'manager'
    const res = await POST()
    expect(res.status).toBe(403)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'staff' (has no settings.* permission per default rbac.ts) is forbidden", async () => {
    tenantHolder.role = 'staff'
    const res = await POST()
    expect(res.status).toBe(403)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: a tenant that revokes 'settings.edit' from admin via a role_permissions override blocks POST for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A, name: 'Tenant A', slug: A, domain: 'example.com',
      selena_config: { role_permissions: { admin: { 'settings.edit': false } } },
    }
    const res = await POST()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that grants 'settings.edit' to staff via a role_permissions override allows POST for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A, name: 'Tenant A', slug: A, domain: 'example.com',
      selena_config: { role_permissions: { staff: { 'settings.edit': true } } },
    }
    const res = await POST()
    expect(res.status).toBe(200)
  })
})
