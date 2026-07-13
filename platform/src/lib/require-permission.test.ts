import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TenantContext } from './tenant-query'
import type { Tenant } from './tenant'

const getTenantForRequestMock = vi.fn()
const hasPermissionMock = vi.fn()

vi.mock('./tenant-query', () => ({
  getTenantForRequest: (...args: unknown[]) => getTenantForRequestMock(...args),
}))
vi.mock('./rbac', () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}))

import { requirePermission, overridesFor } from './require-permission'

const makeTenant = (
  overrides: Partial<Omit<TenantContext, 'tenant'>> & { tenant?: Partial<Tenant> } = {}
): TenantContext =>
  ({
    userId: 'user-1',
    tenantId: 'tenant-A',
    role: 'staff',
    ...overrides,
    tenant: { id: 'tenant-A', name: 'Tenant A', ...overrides.tenant },
  }) as unknown as TenantContext

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the tenant with no error when the role has the permission', async () => {
    const tenant = makeTenant()
    getTenantForRequestMock.mockResolvedValue(tenant)
    hasPermissionMock.mockReturnValue(true)

    const result = await requirePermission('bookings.view' as never)

    expect(result.error).toBeNull()
    expect(result.tenant).toBe(tenant)
  })

  it('returns a 403 and null tenant when the role lacks the permission', async () => {
    getTenantForRequestMock.mockResolvedValue(makeTenant({ role: 'cleaner' }))
    hasPermissionMock.mockReturnValue(false)

    const result = await requirePermission('bookings.delete' as never)

    expect(result.tenant).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(403)
    const body = await result.error!.json()
    expect(body.error).toMatch(/forbidden/i)
  })

  it('returns a 401 when getTenantForRequest throws (no session / bad auth)', async () => {
    getTenantForRequestMock.mockRejectedValue(new Error('no session'))

    const result = await requirePermission('bookings.view' as never)

    expect(result.tenant).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(401)
  })

  it('checks permission using the resolved tenant role and passes overrides through', async () => {
    const tenant = makeTenant({
      role: 'manager',
      tenant: { id: 'tenant-A', selena_config: { role_permissions: { manager: ['bookings.delete'] } } },
    })
    getTenantForRequestMock.mockResolvedValue(tenant)
    hasPermissionMock.mockReturnValue(true)

    await requirePermission('bookings.delete' as never)

    expect(hasPermissionMock).toHaveBeenCalledWith(
      'manager',
      'bookings.delete',
      { manager: ['bookings.delete'] }
    )
  })
})

describe('overridesFor', () => {
  it('extracts role_permissions from the tenant selena_config', () => {
    const tenant = makeTenant({
      tenant: { id: 'tenant-A', selena_config: { role_permissions: { owner: ['*'] } } },
    })
    expect(overridesFor(tenant)).toEqual({ owner: ['*'] })
  })

  it('returns null when selena_config is missing', () => {
    const tenant = makeTenant({ tenant: { id: 'tenant-A' } })
    expect(overridesFor(tenant)).toBeNull()
  })

  it('returns null when role_permissions is not an object', () => {
    const tenant = makeTenant({
      tenant: { id: 'tenant-A', selena_config: { role_permissions: 'not-an-object' } },
    })
    expect(overridesFor(tenant)).toBeNull()
  })
})
