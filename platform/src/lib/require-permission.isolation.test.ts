import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * require-permission.ts is the shared RBAC gate for operator-dashboard API
 * routes: `requirePermission(perm)` resolves the caller's tenant + role via
 * getTenantForRequest(), then checks the role against the tenant's effective
 * permission set (rbac defaults + per-tenant overrides). It is the boundary
 * between a logged-in operator and privileged tenant data, so it must fail
 * CLOSED:
 *
 *   - getTenantForRequest() throws (no/invalid session) -> 401, never open
 *   - role lacks the permission                          -> 403
 *   - a per-tenant override is read from THIS tenant's row only
 *
 * The permission math is the REAL rbac.ts resolver (hasPermission); only
 * getTenantForRequest is stubbed, so a role/override that shouldn't pass can't be
 * faked past the resolver. Every 401/403 is paired with a positive control that
 * authorizes, so nothing passes vacuously.
 */

const h = vi.hoisted(() => ({
  impl: null as null | (() => Promise<unknown>),
}))

vi.mock('./tenant-query', () => ({
  getTenantForRequest: () => {
    if (!h.impl) throw new Error('getTenantForRequest not configured for this test')
    return h.impl()
  },
}))

import { requirePermission, overridesFor } from './require-permission'
import type { TenantContext } from './tenant-query'
import type { RolePermissionOverrides } from './rbac'

/** Build a TenantContext with a chosen role and optional per-tenant overrides. */
function ctx(role: string, overrides?: RolePermissionOverrides): TenantContext {
  return {
    userId: 'u-1',
    tenantId: 'tenant-A',
    role,
    tenant: { id: 'tenant-A', selena_config: overrides ? { role_permissions: overrides } : {} },
  } as unknown as TenantContext
}

/** Make getTenantForRequest resolve to `c` (or reject when `c` is an Error). */
function whenTenant(c: TenantContext | Error) {
  h.impl = () => (c instanceof Error ? Promise.reject(c) : Promise.resolve(c))
}

beforeEach(() => {
  h.impl = null
})

describe('requirePermission — positive control (gate opens)', () => {
  it('authorizes a role that holds the permission (staff → clients.view)', async () => {
    whenTenant(ctx('staff'))
    const res = await requirePermission('clients.view')
    expect(res.error).toBeNull()
    expect(res.tenant?.role).toBe('staff')
  })
})

describe('requirePermission — fail closed on no session', () => {
  it('401 when getTenantForRequest throws (unauthenticated), even for a broad permission', async () => {
    whenTenant(new Error('no session'))
    const res = await requirePermission('clients.view')
    expect(res.tenant).toBeNull()
    expect(res.error!.status).toBe(401)
  })
})

describe('requirePermission — permission enforcement', () => {
  it('403 when the role lacks the permission (staff → finance.view) — paired with a manager that passes', async () => {
    whenTenant(ctx('staff'))
    const denied = await requirePermission('finance.view')
    expect(denied.tenant).toBeNull()
    expect(denied.error!.status).toBe(403)

    whenTenant(ctx('manager'))
    const allowed = await requirePermission('finance.view')
    expect(allowed.error).toBeNull()
  })

  it('an unknown/garbage role is treated as least-privilege and denied', async () => {
    whenTenant(ctx('totally-made-up-role'))
    const res = await requirePermission('clients.view')
    expect(res.tenant).toBeNull()
    expect(res.error!.status).toBe(403)
  })
})

describe('requirePermission — per-tenant overrides', () => {
  it('an override GRANTS a permission the default denies (staff + {finance.view:true})', async () => {
    whenTenant(ctx('staff', { staff: { 'finance.view': true } }))
    const res = await requirePermission('finance.view')
    expect(res.error).toBeNull()
  })

  it('an override REVOKES a default permission (admin + {finance.payroll:false}) — paired with the un-overridden admin that passes', async () => {
    whenTenant(ctx('admin', { admin: { 'finance.payroll': false } }))
    const denied = await requirePermission('finance.payroll')
    expect(denied.tenant).toBeNull()
    expect(denied.error!.status).toBe(403)

    whenTenant(ctx('admin'))
    const allowed = await requirePermission('finance.payroll')
    expect(allowed.error).toBeNull()
  })
})

describe('overridesFor — reads overrides off the loaded tenant row', () => {
  it('returns the role_permissions object when present', () => {
    const c = ctx('admin', { admin: { 'finance.payroll': false } })
    expect(overridesFor(c)).toEqual({ admin: { 'finance.payroll': false } })
  })

  it('returns null when selena_config has no role_permissions', () => {
    expect(overridesFor(ctx('admin'))).toBeNull()
  })

  it('returns null when role_permissions is not an object (malformed)', () => {
    const c = {
      userId: 'u',
      tenantId: 'tenant-A',
      role: 'admin',
      tenant: { id: 'tenant-A', selena_config: { role_permissions: 'nope' } },
    } as unknown as TenantContext
    expect(overridesFor(c)).toBeNull()
  })
})
