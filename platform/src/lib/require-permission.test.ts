import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * requirePermission() (src/lib/require-permission.ts) is the RBAC gate wrapping
 * getTenantForRequest() — 119 call sites, effectively every permission-scoped
 * dashboard API route. It had zero direct test coverage before this file.
 *
 * getTenantForRequest itself is covered by tenant-query.test.ts, so it's mocked
 * here to isolate requirePermission's own logic: overridesFor() extraction,
 * the hasPermission() gate (real rbac.ts, already covered by rbac.test.ts —
 * exercised here for wiring, not re-proving its internals), and the
 * try/catch -> 401 fallback.
 */

const getTenantForRequest = vi.fn()
vi.mock('./tenant-query', () => {
  class MockAuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    getTenantForRequest: () => getTenantForRequest(),
    AuthError: MockAuthError,
  }
})

import { requirePermission, overridesFor } from './require-permission'
import { AuthError } from './tenant-query'
import type { TenantContext } from './tenant-query'

const tenantCtx = (over: Partial<TenantContext> = {}): TenantContext => ({
  userId: 'user-1',
  tenantId: 't-1',
  role: 'staff',
  tenant: {
    id: 't-1',
    slug: 'acme',
    name: 'Acme',
    domain: 'acme.com',
    status: 'active',
  } as TenantContext['tenant'],
  ...over,
})

beforeEach(() => {
  getTenantForRequest.mockReset()
})

describe('overridesFor', () => {
  it('returns null when selena_config is absent', () => {
    expect(overridesFor(tenantCtx())).toBeNull()
  })

  it('returns null when selena_config.role_permissions is not an object', () => {
    const ctx = tenantCtx({
      tenant: { ...tenantCtx().tenant, selena_config: { role_permissions: 'not-an-object' } } as TenantContext['tenant'],
    })
    expect(overridesFor(ctx)).toBeNull()
  })

  it('returns the role_permissions object when present', () => {
    const overrides = { staff: { 'clients.edit': true } }
    const ctx = tenantCtx({
      tenant: { ...tenantCtx().tenant, selena_config: { role_permissions: overrides } } as TenantContext['tenant'],
    })
    expect(overridesFor(ctx)).toEqual(overrides)
  })
})

describe('requirePermission', () => {
  it('grants owner every permission regardless of overrides', async () => {
    getTenantForRequest.mockResolvedValue(tenantCtx({ role: 'owner' }))

    const result = await requirePermission('finance.payroll')
    expect(result.error).toBeNull()
    expect(result.tenant?.role).toBe('owner')
  })

  it('denies a permission the role lacks by default (403, no tenant leaked)', async () => {
    getTenantForRequest.mockResolvedValue(tenantCtx({ role: 'staff' }))

    const result = await requirePermission('finance.view')
    expect(result.tenant).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(403)
  })

  it('allows a permission the role has by default', async () => {
    getTenantForRequest.mockResolvedValue(tenantCtx({ role: 'staff' }))

    const result = await requirePermission('clients.view')
    expect(result.error).toBeNull()
    expect(result.tenant?.role).toBe('staff')
  })

  it('respects a tenant override that GRANTS a permission normally denied by default', async () => {
    getTenantForRequest.mockResolvedValue(
      tenantCtx({
        role: 'staff',
        tenant: {
          ...tenantCtx().tenant,
          selena_config: { role_permissions: { staff: { 'clients.edit': true } } },
        } as TenantContext['tenant'],
      }),
    )

    const result = await requirePermission('clients.edit')
    expect(result.error).toBeNull()
  })

  it('respects a tenant override that REVOKES a permission normally allowed by default', async () => {
    getTenantForRequest.mockResolvedValue(
      tenantCtx({
        role: 'admin',
        tenant: {
          ...tenantCtx().tenant,
          selena_config: { role_permissions: { admin: { 'finance.payroll': false } } },
        } as TenantContext['tenant'],
      }),
    )

    const result = await requirePermission('finance.payroll')
    expect(result.tenant).toBeNull()
    expect(result.error!.status).toBe(403)
  })

  it('WRONG-TENANT PROBE: an override configured for one tenant context does not leak into a second, differently-resolved context', async () => {
    const tenantAWithOverride = tenantCtx({
      tenantId: 't-A',
      role: 'staff',
      tenant: {
        ...tenantCtx().tenant,
        id: 't-A',
        selena_config: { role_permissions: { staff: { 'clients.edit': true } } },
      } as TenantContext['tenant'],
    })
    const tenantBNoOverride = tenantCtx({
      tenantId: 't-B',
      role: 'staff',
      tenant: { ...tenantCtx().tenant, id: 't-B' } as TenantContext['tenant'],
    })

    getTenantForRequest.mockResolvedValueOnce(tenantAWithOverride)
    const resultA = await requirePermission('clients.edit')
    expect(resultA.error).toBeNull()
    expect(resultA.tenant?.tenantId).toBe('t-A')

    getTenantForRequest.mockResolvedValueOnce(tenantBNoOverride)
    const resultB = await requirePermission('clients.edit')
    expect(resultB.tenant).toBeNull()
    expect(resultB.error!.status).toBe(403)
  })

  it('returns 401 Unauthorized when getTenantForRequest throws (no session/expired auth)', async () => {
    getTenantForRequest.mockRejectedValue(new AuthError('Unauthorized', 401))

    const result = await requirePermission('clients.view')
    expect(result.tenant).toBeNull()
    expect(result.error!.status).toBe(401)
  })

  it('returns 401 even when the underlying failure is a 404 (no tenant found) — requirePermission collapses all getTenantForRequest failures to 401', async () => {
    getTenantForRequest.mockRejectedValue(new AuthError('No tenant found', 404))

    const result = await requirePermission('clients.view')
    expect(result.error!.status).toBe(401)
  })
})
