import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/service-area — missing-authz (same class fixed repeatedly this
 * session): GET only checked getTenantForRequest() with zero permission
 * check, while its own PUT sibling requires settings.edit. 'staff' lacks
 * settings.view by default per rbac.ts, and a tenant can revoke settings.view
 * from admin/manager via a role_permissions override -- both were silently
 * ignored here. Fixed to require settings.view, matching /api/settings'
 * established convention.
 */

const roleHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenantId: 'tenant-A' as string,
  overrides: null as Record<string, unknown> | null,
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: roleHolder.tenantId,
      tenant: {
        id: roleHolder.tenantId,
        selena_config: roleHolder.overrides ? { role_permissions: roleHolder.overrides } : null,
      },
      role: roleHolder.role,
    })),
  }
})

const selectSingle = vi.hoisted(() => vi.fn(async () => ({ data: { selena_config: null } })))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: selectSingle }) }) }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

import { GET } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  roleHolder.overrides = null
  selectSingle.mockClear()
})

describe('GET /api/service-area — permission gate', () => {
  it('owner can read the service area', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(selectSingle).toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'staff' role (no settings.view by default) is forbidden and never reads", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
    expect(selectSingle).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'admin' role (has settings.view by default) can read", async () => {
    roleHolder.role = 'admin'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: rejects admin with 403 once the tenant overrides settings.view off, and never reads", async () => {
    roleHolder.role = 'admin'
    roleHolder.overrides = { admin: { 'settings.view': false } }
    const res = await GET()
    expect(res.status).toBe(403)
    expect(selectSingle).not.toHaveBeenCalled()
  })

  it('owner is never affected by an admin override (owner bypasses permission checks)', async () => {
    roleHolder.role = 'owner'
    roleHolder.overrides = { admin: { 'settings.view': false } }
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
