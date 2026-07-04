import { NextResponse } from 'next/server'
import { getTenantForRequest, type TenantContext } from './tenant-query'
import { hasPermission, type Permission, type RolePermissionOverrides } from './rbac'

// Pull the tenant's permission overrides off the already-loaded tenant row.
// getTenantForRequest() selects the full tenants row, so selena_config (and any
// role_permissions inside it) is in memory here — no extra query.
export function overridesFor(tenant: TenantContext): RolePermissionOverrides | null {
  const raw = tenant.tenant?.selena_config?.role_permissions
  if (!raw || typeof raw !== 'object') return null
  return raw as RolePermissionOverrides
}

// Middleware: get tenant + check permission in one call
export async function requirePermission(permission: Permission): Promise<
  { tenant: TenantContext; error: null } | { tenant: null; error: NextResponse }
> {
  try {
    const tenant = await getTenantForRequest()

    if (!hasPermission(tenant.role, permission, overridesFor(tenant))) {
      return {
        tenant: null,
        error: NextResponse.json(
          { error: 'Forbidden: insufficient permissions' },
          { status: 403 }
        ),
      }
    }

    return { tenant, error: null }
  } catch {
    return {
      tenant: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
}
